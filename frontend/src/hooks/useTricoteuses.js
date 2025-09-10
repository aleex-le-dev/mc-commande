/**
 * Hook personnalisé pour la gestion des tricoteuses
 * Utilise le nouveau service optimisé
 */
import { useState, useEffect, useCallback } from 'react'
import { ApiService } from '../services/apiService.js'
import { logger } from '../utils/logger'

export const useTricoteuses = () => {
  const [tricoteuses, setTricoteuses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isFetching, setIsFetching] = useState(false)

  const fetchTricoteuses = useCallback(async () => {
    // Éviter les requêtes multiples
    if (isFetching) {
      console.log('🔄 Tricoteuses déjà en cours, ignorées')
      return
    }
    
    logger.service.start('Chargement tricoteuses')
    setIsFetching(true)
    setLoading(true)
    setError(null)

    try {
      const data = await ApiService.tricoteuses.getTricoteuses()
      setTricoteuses(data)
      logger.service.success('Chargement tricoteuses')
    } catch (err) {
      logger.service.error('Chargement tricoteuses', err)
      setError(err)
      
      // Fallback: mode offline
      const offlineData = await ApiService.tricoteuses.getTricoteuses()
      setTricoteuses(offlineData)
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }, [isFetching])

  useEffect(() => {
    // OPTIMISATION: Délai pour éviter les appels multiples avec cleanup
    const timeoutId = setTimeout(() => {
      fetchTricoteuses()
    }, 200)
    
    return () => clearTimeout(timeoutId) // ✅ Cleanup déjà présent
  }, [])

  const getTricoteuseById = useCallback((tricoteuseId) => {
    return tricoteuses.find(t => t._id === tricoteuseId)
  }, [tricoteuses])

  const getActiveTricoteuses = useCallback(() => {
    return tricoteuses.filter(t => t.status === 'active')
  }, [tricoteuses])

  const createTricoteuse = useCallback(async (tricoteuseData) => {
    try {
      const result = await ApiService.tricoteuses.createTricoteuse(tricoteuseData)
      
      // Rafraîchir les tricoteuses
      await fetchTricoteuses()
      
      return result
    } catch (err) {
      console.error('Erreur création tricoteuse:', err)
      throw err
    }
  }, [fetchTricoteuses])

  const updateTricoteuse = useCallback(async (tricoteuseId, updates) => {
    try {
      const result = await ApiService.tricoteuses.updateTricoteuse(tricoteuseId, updates)
      
      // Rafraîchir les tricoteuses
      await fetchTricoteuses()
      
      return result
    } catch (err) {
      console.error('Erreur mise à jour tricoteuse:', err)
      throw err
    }
  }, [fetchTricoteuses])

  const deleteTricoteuse = useCallback(async (tricoteuseId) => {
    try {
      await ApiService.tricoteuses.deleteTricoteuse(tricoteuseId)
      
      // Rafraîchir les tricoteuses
      await fetchTricoteuses()
    } catch (err) {
      console.error('Erreur suppression tricoteuse:', err)
      throw err
    }
  }, [fetchTricoteuses])

  const refetch = useCallback(() => {
    fetchTricoteuses()
  }, [fetchTricoteuses])

  return {
    tricoteuses,
    loading,
    error,
    getTricoteuseById,
    getActiveTricoteuses,
    createTricoteuse,
    updateTricoteuse,
    deleteTricoteuse,
    refetch
  }
}

export default useTricoteuses
