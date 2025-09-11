/**
 * Hook unifié pour la gestion des données
 * Consolide la logique de chargement, cache et gestion d'erreurs
 */
import { useState, useEffect, useCallback } from 'react'
import { ApiService } from '../services/apiService.js'
import { HttpCacheService } from '../services/cache/httpCacheService.js'
import { logger } from '../utils/logger'

export const useDataManager = (dataType, options = {}) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isFetching, setIsFetching] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  // Configuration par défaut
  const config = {
    cacheKey: dataType,
    retryAttempts: 3,
    fallbackToCache: true,
    ...options
  }

  // Détecter les changements de connectivité
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      console.log('🌐 Connexion rétablie')
    }

    const handleOffline = () => {
      setIsOffline(true)
      console.log('📱 Mode hors ligne activé')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Charger les données avec gestion d'erreurs unifiée
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (isFetching && !forceRefresh) {
      console.log(`🔄 ${dataType} déjà en cours, ignorées`)
      return
    }
    
    logger.service.start(`Chargement ${dataType}`)
    setIsFetching(true)
    setLoading(true)
    setError(null)

    try {
      // Essayer de charger depuis l'API
      const apiData = await getApiData(dataType)
      setData(apiData)
      
      // Mettre en cache
      if (apiData) {
        HttpCacheService.set(config.cacheKey, apiData)
      }
      
      logger.service.success(`Chargement ${dataType}`)
    } catch (err) {
      logger.service.error(`Chargement ${dataType}`, err)
      setError(err)
      
      // Fallback: utiliser le cache si disponible
      if (config.fallbackToCache) {
        const cachedData = HttpCacheService.get(config.cacheKey)
        if (cachedData) {
          setData(cachedData)
          console.log(`📦 Utilisation du cache pour ${dataType}`)
        }
      }
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }, [isFetching, dataType, config.cacheKey, config.fallbackToCache])

  // Obtenir les données depuis l'API selon le type
  const getApiData = async (type) => {
    switch (type) {
      case 'tricoteuses':
        return await ApiService.tricoteuses.getTricoteuses()
      case 'assignments':
        return await ApiService.assignments.getAssignments()
      case 'orders':
        return await ApiService.orders.getOrders()
      case 'production':
        return await ApiService.production.getProductionStatuses()
      default:
        throw new Error(`Type de données non supporté: ${type}`)
    }
  }

  // Actions CRUD unifiées
  const createItem = useCallback(async (itemData) => {
    try {
      const result = await getCreateFunction(dataType)(itemData)
      await fetchData(true) // Rafraîchir après création
      return result
    } catch (err) {
      console.error(`Erreur création ${dataType}:`, err)
      throw err
    }
  }, [dataType, fetchData])

  const updateItem = useCallback(async (itemId, updates) => {
    try {
      const result = await getUpdateFunction(dataType)(itemId, updates)
      await fetchData(true) // Rafraîchir après mise à jour
      return result
    } catch (err) {
      console.error(`Erreur mise à jour ${dataType}:`, err)
      throw err
    }
  }, [dataType, fetchData])

  const deleteItem = useCallback(async (itemId) => {
    try {
      await getDeleteFunction(dataType)(itemId)
      await fetchData(true) // Rafraîchir après suppression
    } catch (err) {
      console.error(`Erreur suppression ${dataType}:`, err)
      throw err
    }
  }, [dataType, fetchData])

  // Obtenir les fonctions CRUD selon le type
  const getCreateFunction = (type) => {
    switch (type) {
      case 'tricoteuses':
        return ApiService.tricoteuses.createTricoteuse
      case 'assignments':
        return ApiService.assignments.assignArticle
      default:
        throw new Error(`Fonction de création non supportée pour ${type}`)
    }
  }

  const getUpdateFunction = (type) => {
    switch (type) {
      case 'tricoteuses':
        return ApiService.tricoteuses.updateTricoteuse
      case 'assignments':
        return ApiService.assignments.updateAssignment
      default:
        throw new Error(`Fonction de mise à jour non supportée pour ${type}`)
    }
  }

  const getDeleteFunction = (type) => {
    switch (type) {
      case 'tricoteuses':
        return ApiService.tricoteuses.deleteTricoteuse
      case 'assignments':
        return ApiService.assignments.unassignArticle
      default:
        throw new Error(`Fonction de suppression non supportée pour ${type}`)
    }
  }

  // Fonctions utilitaires
  const getItemById = useCallback((itemId) => {
    return data.find(item => item._id === itemId || item.id === itemId)
  }, [data])

  const getItemsByStatus = useCallback((status) => {
    return data.filter(item => item.status === status)
  }, [data])

  const refresh = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  // Charger les données au montage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData()
    }, 100)
    
    return () => clearTimeout(timeoutId)
  }, [])

  return {
    data,
    loading,
    error,
    isOffline,
    isFetching,
    createItem,
    updateItem,
    deleteItem,
    getItemById,
    getItemsByStatus,
    refresh,
    fetchData
  }
}
