/**
 * Hook personnalisé pour la gestion des assignations
 * Utilise le nouveau service optimisé
 */
import { useState, useEffect, useCallback } from 'react'
import AssignmentsService from '../services/assignmentsService.js'

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
    
    console.log('🔄 Début chargement assignations...')
    setIsFetching(true)
    setLoading(true)
    setError(null)

    try {
      const data = await AssignmentsService.getAllAssignments()
      setAssignments(data)
      console.log('✅ Assignations chargées avec succès')
    } catch (err) {
      console.error('Erreur chargement assignations:', err)
      setError(err)
      
      // Fallback: mode offline
      const offlineData = AssignmentsService.getOfflineAssignments()
      setAssignments(offlineData)
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }, [isFetching])

  useEffect(() => {
    // Délai pour éviter les appels multiples
    const timeoutId = setTimeout(() => {
      fetchAssignments()
    }, 150)
    
    return () => clearTimeout(timeoutId)
  }, [])

  const assignArticle = useCallback(async (articleId, tricoteuseId) => {
    try {
      const result = await AssignmentsService.assignArticle(articleId, tricoteuseId)
      
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
      await AssignmentsService.unassignArticle(articleId)
      
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
