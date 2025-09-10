/**
 * Hook personnalisé pour la gestion des assignations
 * Utilise le nouveau service optimisé
 */
import { useState, useEffect, useCallback } from 'react'
import { ApiService } from '../services/apiService.js'
import { logger } from '../utils/logger'

export const useAssignments = () => {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isFetching, setIsFetching] = useState(false)

  const fetchAssignments = useCallback(async () => {
    // Éviter les requêtes multiples
    if (isFetching) {
      console.log('🔄 Assignations déjà en cours, ignorées')
      return
    }
    
    logger.service.start('Chargement assignations')
    setIsFetching(true)
    setLoading(true)
    setError(null)

    try {
      const data = await ApiService.assignments.getAssignments()
      setAssignments(data)
      logger.service.success('Chargement assignations')
    } catch (err) {
      logger.service.error('Chargement assignations', err)
      setError(err)
      
      // Fallback: mode offline
      const offlineData = await ApiService.assignments.getAssignments()
      setAssignments(offlineData)
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }, [isFetching])

  useEffect(() => {
    // OPTIMISATION: Délai pour éviter les appels multiples avec cleanup
    const timeoutId = setTimeout(() => {
      fetchAssignments()
    }, 150)
    
    return () => clearTimeout(timeoutId) // ✅ Cleanup déjà présent
  }, [])

  const assignArticle = useCallback(async (articleId, tricoteuseId) => {
    try {
      const result = await ApiService.assignments.createAssignment({
        article_id: articleId,
        tricoteuse_id: tricoteuseId,
        status: 'en_cours'
      })
      
      // Rafraîchir les assignations
      await fetchAssignments()
      
      return result
    } catch (err) {
      console.error('Erreur assignation:', err)
      throw err
    }
  }, [fetchAssignments])

  const unassignArticle = useCallback(async (articleId) => {
    try {
      // Trouver l'assignation à supprimer
      const assignment = assignments.find(a => a.article_id === articleId)
      if (assignment) {
        await ApiService.assignments.deleteAssignment(assignment._id)
      }
      
      // Rafraîchir les assignations
      await fetchAssignments()
    } catch (err) {
      console.error('Erreur désassignation:', err)
      throw err
    }
  }, [fetchAssignments])

  const getAssignmentByArticleId = useCallback((articleId) => {
    return assignments.find(a => a.article_id === articleId)
  }, [assignments])

  const getActiveAssignments = useCallback(() => {
    return assignments.filter(a => a.status === 'en_cours')
  }, [assignments])

  const refetch = useCallback(() => {
    fetchAssignments()
  }, [fetchAssignments])

  return {
    assignments,
    loading,
    error,
    assignArticle,
    unassignArticle,
    getAssignmentByArticleId,
    getActiveAssignments,
    refetch
  }
}

export default useAssignments
