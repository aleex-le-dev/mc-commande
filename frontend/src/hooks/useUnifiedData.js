/**
 * Hook unifié pour toutes les données de l'application
 * Remplace les hooks spécialisés par une interface unique
 */
import { useState, useEffect, useCallback } from 'react'
import { UnifiedApiService } from '../services/unifiedApiService.js'
import { HttpCacheService } from '../services/cache/httpCacheService.js'

export const useUnifiedData = () => {
  const [data, setData] = useState({
    tricoteuses: [],
    assignments: [],
    orders: [],
    production: []
  })
  
  const [loading, setLoading] = useState({
    tricoteuses: false,
    assignments: false,
    orders: false,
    production: false
  })
  
  const [errors, setErrors] = useState({
    tricoteuses: null,
    assignments: null,
    orders: null,
    production: null
  })

  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  // Détecter les changements de connectivité
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Charger un type de données spécifique
  const loadData = useCallback(async (dataType, forceRefresh = false) => {
    if (loading[dataType] && !forceRefresh) return

    setLoading(prev => ({ ...prev, [dataType]: true }))
    setErrors(prev => ({ ...prev, [dataType]: null }))

    try {
      let result
      switch (dataType) {
        case 'tricoteuses':
          result = await UnifiedApiService.tricoteuses.getTricoteuses()
          break
        case 'assignments':
          result = await UnifiedApiService.assignments.getAssignments()
          break
        case 'orders':
          result = await UnifiedApiService.orders.getOrders()
          break
        case 'production':
          result = await UnifiedApiService.production.getProductionStatuses()
          break
        default:
          throw new Error(`Type de données non supporté: ${dataType}`)
      }

      setData(prev => ({ ...prev, [dataType]: result }))
      
      // Mettre en cache
      HttpCacheService.set(dataType, result)
      
    } catch (error) {
      console.error(`Erreur chargement ${dataType}:`, error)
      setErrors(prev => ({ ...prev, [dataType]: error }))
      
      // Fallback: utiliser le cache
      const cachedData = HttpCacheService.get(dataType)
      if (cachedData) {
        setData(prev => ({ ...prev, [dataType]: cachedData }))
        console.log(`📦 Utilisation du cache pour ${dataType}`)
      }
    } finally {
      setLoading(prev => ({ ...prev, [dataType]: false }))
    }
  }, [loading])

  // Charger toutes les données
  const loadAllData = useCallback(async (forceRefresh = false) => {
    const dataTypes = ['tricoteuses', 'assignments', 'orders', 'production']
    
    // Charger en parallèle
    await Promise.all(
      dataTypes.map(dataType => loadData(dataType, forceRefresh))
    )
  }, [loadData])

  // Actions CRUD unifiées
  const createItem = useCallback(async (dataType, itemData) => {
    try {
      let result
      switch (dataType) {
        case 'tricoteuses':
          result = await UnifiedApiService.tricoteuses.createTricoteuse(itemData)
          break
        case 'assignments':
          result = await UnifiedApiService.assignments.assignArticle(
            itemData.articleId, 
            itemData.tricoteuseId
          )
          break
        default:
          throw new Error(`Création non supportée pour ${dataType}`)
      }

      // Rafraîchir les données
      await loadData(dataType, true)
      return result
    } catch (error) {
      console.error(`Erreur création ${dataType}:`, error)
      throw error
    }
  }, [loadData])

  const updateItem = useCallback(async (dataType, itemId, updates) => {
    try {
      let result
      switch (dataType) {
        case 'tricoteuses':
          result = await UnifiedApiService.tricoteuses.updateTricoteuse(itemId, updates)
          break
        case 'assignments':
          result = await UnifiedApiService.assignments.updateAssignment(itemId, updates)
          break
        default:
          throw new Error(`Mise à jour non supportée pour ${dataType}`)
      }

      // Rafraîchir les données
      await loadData(dataType, true)
      return result
    } catch (error) {
      console.error(`Erreur mise à jour ${dataType}:`, error)
      throw error
    }
  }, [loadData])

  const deleteItem = useCallback(async (dataType, itemId) => {
    try {
      switch (dataType) {
        case 'tricoteuses':
          await UnifiedApiService.tricoteuses.deleteTricoteuse(itemId)
          break
        case 'assignments':
          await UnifiedApiService.assignments.unassignArticle(itemId)
          break
        case 'orders':
          await UnifiedApiService.orders.deleteOrder(itemId)
          break
        default:
          throw new Error(`Suppression non supportée pour ${dataType}`)
      }

      // Rafraîchir les données
      await loadData(dataType, true)
    } catch (error) {
      console.error(`Erreur suppression ${dataType}:`, error)
      throw error
    }
  }, [loadData])

  // Fonctions utilitaires
  const getItemById = useCallback((dataType, itemId) => {
    return data[dataType]?.find(item => item._id === itemId || item.id === itemId)
  }, [data])

  const getItemsByStatus = useCallback((dataType, status) => {
    return data[dataType]?.filter(item => item.status === status) || []
  }, [data])

  const refresh = useCallback(() => {
    return loadAllData(true)
  }, [loadAllData])

  // Charger les données au montage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadAllData()
    }, 100)
    
    return () => clearTimeout(timeoutId)
  }, [])

  return {
    // Données
    tricoteuses: data.tricoteuses,
    assignments: data.assignments,
    orders: data.orders,
    production: data.production,
    
    // États de chargement
    loading,
    errors,
    isOffline,
    
    // Actions
    loadData,
    loadAllData,
    createItem,
    updateItem,
    deleteItem,
    getItemById,
    getItemsByStatus,
    refresh
  }
}
