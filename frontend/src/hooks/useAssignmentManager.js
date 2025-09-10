/**
 * Hook spécialisé pour la gestion des assignations
 * Responsabilité unique: assignation, désassignation et gestion des statuts
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { ApiService } from '../services/apiService'
import statusService from '../services/statusService'

export const useAssignmentManager = ({ article, assignment, onAssignmentUpdate, tricoteusesProp }) => {
  const [showTricoteuseModal, setShowTricoteuseModal] = useState(false)
  const [tricoteuses, setTricoteuses] = useState([])
  const [isLoadingTricoteuses, setIsLoadingTricoteuses] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [localAssignment, setLocalAssignment] = useState(assignment)
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(true)

  // ID unique pour l'assignation
  const uniqueAssignmentId = useMemo(() => {
    return article?.line_item_id || `${article?.product_id}_${article?.orderNumber}_${article?.customer}`
  }, [article?.line_item_id, article?.product_id, article?.orderNumber, article?.customer])

  // Synchroniser localAssignment avec assignment
  useEffect(() => {
    if (assignment != null) {
      setLocalAssignment(assignment)
    }
  }, [assignment])

  // Charger les tricoteuses
  const loadTricoteuses = useCallback(() => {
    setTricoteuses(tricoteusesProp || [])
    setIsLoadingTricoteuses(false)
  }, [tricoteusesProp])

  useEffect(() => {
    if (tricoteusesProp && tricoteusesProp.length > 0) {
      setTricoteuses(tricoteusesProp)
      setIsLoadingTricoteuses(false)
    }
  }, [tricoteusesProp])

  // Charger l'assignation existante
  const loadExistingAssignment = useCallback(async () => {
    if (assignment) {
      setIsLoadingAssignment(true)
      try {
        if (tricoteuses && assignment.tricoteuse_id) {
          const tricoteuse = tricoteuses.find(t => t._id === assignment.tricoteuse_id)
          if (tricoteuse) {
            const enrichedAssignment = {
              ...assignment,
              tricoteuse_photo: tricoteuse.photoUrl,
              tricoteuse_color: tricoteuse.color,
              tricoteuse_name: tricoteuse.firstName
            }
            setLocalAssignment(enrichedAssignment)
          } else {
            setLocalAssignment(assignment)
          }
        } else {
          setLocalAssignment(assignment)
        }
      } catch (error) {
        console.error('Erreur enrichissement assignation:', error)
        setLocalAssignment(assignment)
      } finally {
        setIsLoadingAssignment(false)
      }
      return
    }

    // Fallback: assignation virtuelle si l'article est assigné mais pas d'assignation formelle
    if (article && article.status && article.status !== 'a_faire' && article.assigned_to) {
      const virtual = {
        article_id: uniqueAssignmentId,
        tricoteuse_id: 'virtual',
        tricoteuse_name: article.assigned_to,
        status: article.status,
        urgent: Boolean(article?.production_status?.urgent)
      }

      // Enrichir depuis la liste des tricoteuses si disponible
      if (tricoteuses && tricoteuses.length > 0) {
        const t = tricoteuses.find(x => x.firstName === article.assigned_to)
        if (t) {
          virtual.tricoteuse_photo = t.photoUrl
          virtual.tricoteuse_color = t.color
        }
      }
      setLocalAssignment(virtual)
      setIsLoadingAssignment(false)
      return
    }

    setLocalAssignment(null)
    setIsLoadingAssignment(false)
  }, [assignment, tricoteuses, article, uniqueAssignmentId])

  useEffect(() => {
    loadExistingAssignment()
  }, [loadExistingAssignment])

  // Ouvrir la modal d'assignation
  const openTricoteuseModal = useCallback(() => {
    loadTricoteuses()
    setShowTricoteuseModal(true)
  }, [loadTricoteuses])

  // Fermer la modal d'assignation
  const closeTricoteuseModal = useCallback(() => {
    setShowTricoteuseModal(false)
  }, [])

  // Supprimer une assignation
  const removeAssignment = useCallback(async () => {
    try {
      await ApiService.assignments.deleteAssignment(uniqueAssignmentId)
      
      // Mettre le statut à "a_faire" en BDD
      try {
        await ApiService.production.updateArticleStatus(article.orderId, article.line_item_id, 'a_faire')
      } catch (error) {
        console.error('Erreur mise à jour statut BDD:', error)
      }
      
      setLocalAssignment(null)
      if (onAssignmentUpdate) {
        onAssignmentUpdate()
      }
      closeTricoteuseModal()
    } catch (error) {
      console.error('Erreur suppression assignation:', error)
    }
  }, [uniqueAssignmentId, article?.orderId, article?.line_item_id, onAssignmentUpdate, closeTricoteuseModal])

  // Assigner un article à une tricoteuse
  const assignArticle = useCallback(async (tricoteuse) => {
    if (isAssigning) return
    
    setIsAssigning(true)
    const currentUrgent = localAssignment ? localAssignment.urgent : false
    
    const assignmentData = { 
      article_id: uniqueAssignmentId, 
      tricoteuse_id: tricoteuse._id, 
      tricoteuse_name: tricoteuse.firstName, 
      status: 'en_cours',
      urgent: currentUrgent
    }
    
    try {
      await ApiService.assignments.createAssignment(assignmentData)
      
      // Synchroniser le statut initial avec production_status en BDD
      try { 
        await ApiService.production.updateArticleStatus(article.orderId, article.line_item_id, 'en_cours') 
      } catch (error) {
        console.error('Erreur synchronisation statut initial:', error)
      }
      
      const enrichedAssignment = { 
        ...assignmentData, 
        tricoteuse_photo: tricoteuse.photoUrl, 
        tricoteuse_color: tricoteuse.color, 
        tricoteuse_name: tricoteuse.firstName 
      }
      
      setLocalAssignment(enrichedAssignment)
      if (onAssignmentUpdate) { 
        onAssignmentUpdate(uniqueAssignmentId, enrichedAssignment) 
      }
      closeTricoteuseModal()
      
      // OPTIMISATION: Timeout avec cleanup
      const timeoutId = setTimeout(() => {
        window.dispatchEvent(new Event('mc-refresh-data'))
      }, 500)
      
      // Cleanup du timeout si le composant est démonté
      return () => clearTimeout(timeoutId)
    } catch (error) {
      console.error('Erreur assignation:', error)
      throw error
    } finally {
      setIsAssigning(false)
    }
  }, [isAssigning, localAssignment, uniqueAssignmentId, article?.orderId, article?.line_item_id, onAssignmentUpdate, closeTricoteuseModal])

  // Changer le statut d'une assignation
  const changeStatus = useCallback(async (status) => {
    const updatedAssignment = { ...localAssignment, status }
    
    try {
      // Utiliser le service de statut pour une mise à jour temps réel
      await statusService.updateStatus(article.orderId, article.line_item_id, status)
      
      await ApiService.assignments.updateAssignment(updatedAssignment._id, updatedAssignment)
      setLocalAssignment(updatedAssignment)
      
      if (onAssignmentUpdate) { 
        onAssignmentUpdate() 
      }
      closeTricoteuseModal()
    } catch (error) {
      console.error('Erreur changement statut:', error)
      throw error
    }
  }, [localAssignment, article?.orderId, article?.line_item_id, onAssignmentUpdate, closeTricoteuseModal])

  return {
    showTricoteuseModal,
    tricoteuses,
    isLoadingTricoteuses,
    isAssigning,
    localAssignment,
    setLocalAssignment,
    isLoadingAssignment,
    uniqueAssignmentId,
    openTricoteuseModal,
    closeTricoteuseModal,
    removeAssignment,
    assignArticle,
    changeStatus
  }
}

export default useAssignmentManager
