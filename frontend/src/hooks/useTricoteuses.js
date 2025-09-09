/**
 * Hook personnalisé pour la gestion des tricoteuses
 * Utilise le nouveau service optimisé
 */
import { useState, useEffect, useCallback } from 'react'
import TricoteusesService from '../services/tricoteusesService.js'

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
    
    console.log('🔄 Début chargement tricoteuses...')
    setIsFetching(true)
    setLoading(true)
    setError(null)

    try {
      const data = await TricoteusesService.getAllTricoteuses()
      setTricoteuses(data)
      console.log('✅ Tricoteuses chargées avec succès')
    } catch (err) {
      console.error('Erreur chargement tricoteuses:', err)
      setError(err)
      
      // Fallback: mode offline
      const offlineData = TricoteusesService.getOfflineTricoteuses()
      setTricoteuses(offlineData)
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }, [isFetching])

  useEffect(() => {
    // Délai pour éviter les appels multiples
    const timeoutId = setTimeout(() => {
      fetchTricoteuses()
    }, 200)
    
    return () => clearTimeout(timeoutId)
  }, [])

  const getTricoteuseById = useCallback((tricoteuseId) => {
    return tricoteuses.find(t => t._id === tricoteuseId)
  }, [tricoteuses])

  const getActiveTricoteuses = useCallback(() => {
    return tricoteuses.filter(t => t.status === 'active')
  }, [tricoteuses])

  const createTricoteuse = useCallback(async (tricoteuseData) => {
    try {
      const result = await TricoteusesService.createTricoteuse(tricoteuseData)
      
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
      const result = await TricoteusesService.updateTricoteuse(tricoteuseId, updates)
      
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
      await TricoteusesService.deleteTricoteuse(tricoteuseId)
      
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
