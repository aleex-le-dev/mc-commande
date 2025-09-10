/**
 * Hook spécialisé pour le mode hors ligne
 * Responsabilité unique: gestion du mode offline et synchronisation
 */
import { useState, useEffect, useCallback } from 'react'
import { HttpCacheService } from '../services/cache/httpCacheService'

export const useOfflineMode = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [offlineData, setOfflineData] = useState({})
  const [syncQueue, setSyncQueue] = useState([])
  const [lastSync, setLastSync] = useState(null)

  // Détecter les changements de connectivité
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      console.log('🌐 Connexion rétablie - Synchronisation en cours...')
      syncPendingChanges()
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

  // Charger les données hors ligne au montage
  useEffect(() => {
    loadOfflineData()
  }, [])

  // Charger les données mises en cache
  const loadOfflineData = useCallback(() => {
    try {
      const cachedOrders = HttpCacheService.get('orders') || []
      const cachedAssignments = HttpCacheService.get('assignments') || []
      const cachedTricoteuses = HttpCacheService.get('tricoteuses') || []

      setOfflineData({
        orders: cachedOrders,
        assignments: cachedAssignments,
        tricoteuses: cachedTricoteuses,
        lastUpdate: new Date().toISOString()
      })
    } catch (error) {
      console.error('Erreur lors du chargement des données hors ligne:', error)
    }
  }, [])

  // Ajouter une action à la queue de synchronisation
  const addToSyncQueue = useCallback((action) => {
    setSyncQueue(prev => [...prev, {
      ...action,
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString()
    }])
  }, [])

  // Synchroniser les changements en attente
  const syncPendingChanges = useCallback(async () => {
    if (syncQueue.length === 0) return

    console.log(`🔄 Synchronisation de ${syncQueue.length} changements...`)

    try {
      for (const action of syncQueue) {
        await executeSyncAction(action)
      }

      setSyncQueue([])
      setLastSync(new Date().toISOString())
      console.log('✅ Synchronisation terminée')
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error)
    }
  }, [syncQueue])

  // Exécuter une action de synchronisation
  const executeSyncAction = useCallback(async (action) => {
    try {
      switch (action.type) {
        case 'UPDATE_STATUS':
          // Implémenter la logique de mise à jour de statut
          console.log('Mise à jour de statut:', action.data)
          break
        case 'UPDATE_ASSIGNMENT':
          // Implémenter la logique de mise à jour d'assignation
          console.log('Mise à jour d\'assignation:', action.data)
          break
        case 'ADD_NOTE':
          // Implémenter la logique d'ajout de note
          console.log('Ajout de note:', action.data)
          break
        default:
          console.warn('Type d\'action non reconnu:', action.type)
      }
    } catch (error) {
      console.error('Erreur lors de l\'exécution de l\'action:', error)
      throw error
    }
  }, [])

  // Mettre à jour les données hors ligne
  const updateOfflineData = useCallback((key, data) => {
    setOfflineData(prev => ({
      ...prev,
      [key]: data,
      lastUpdate: new Date().toISOString()
    }))

    // Mettre en cache
    HttpCacheService.set(key, data)
  }, [])

  // Obtenir les données hors ligne
  const getOfflineData = useCallback((key) => {
    return offlineData[key] || []
  }, [offlineData])

  // Vérifier si des données sont disponibles hors ligne
  const hasOfflineData = useCallback((key) => {
    const data = offlineData[key]
    return data && data.length > 0
  }, [offlineData])

  // Forcer la synchronisation
  const forceSync = useCallback(async () => {
    if (isOffline) {
      console.warn('Impossible de synchroniser en mode hors ligne')
      return false
    }

    try {
      await syncPendingChanges()
      return true
    } catch (error) {
      console.error('Erreur lors de la synchronisation forcée:', error)
      return false
    }
  }, [isOffline, syncPendingChanges])

  // Obtenir le statut de synchronisation
  const getSyncStatus = useCallback(() => {
    return {
      isOffline,
      pendingChanges: syncQueue.length,
      lastSync,
      hasOfflineData: Object.keys(offlineData).length > 0
    }
  }, [isOffline, syncQueue.length, lastSync, offlineData])

  return {
    isOffline,
    offlineData,
    syncQueue,
    lastSync,
    addToSyncQueue,
    updateOfflineData,
    getOfflineData,
    hasOfflineData,
    forceSync,
    getSyncStatus,
    loadOfflineData
  }
}

export default useOfflineMode
