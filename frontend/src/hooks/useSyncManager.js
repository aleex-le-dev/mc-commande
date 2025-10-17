/**
 * Hook spécialisé pour la gestion de la synchronisation
 * Responsabilité unique: logique de synchronisation et appels API
 */
import { useState, useEffect, useCallback } from 'react'
import { ApiService } from '../services/apiService'
import useSyncProgress from './useSyncProgress'

export const useSyncManager = (performSync) => {
  const syncProgress = useSyncProgress()

  // Effectuer la synchronisation manuelle
  const performManualSync = useCallback(async () => {
    try {
      syncProgress.startSync()
      
      // Étapes de progression simulées
      syncProgress.updateProgress(10, 'Connexion au backend...')
      await new Promise(resolve => setTimeout(resolve, 200))
      
      syncProgress.updateProgress(25, 'Récupération des commandes WooCommerce...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      syncProgress.updateProgress(40, 'Récupération des permalinks...')
      await new Promise(resolve => setTimeout(resolve, 400))
      
      syncProgress.updateProgress(60, 'Synchronisation avec la base de données...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      syncProgress.updateProgress(80, 'Synchronisation des données...')
      
      // Récupérer les logs en temps réel
      const logsInterval = setInterval(async () => {
        try {
          const logs = await ApiService.getSyncLogs()
          if (logs && logs.log) {
            syncProgress.updateLogs(logs.log)
          }
        } catch (error) {
          // Erreur silencieuse
        }
      }, 1000)
      
      const syncResult = await performSync()
      clearInterval(logsInterval) // ✅ Cleanup déjà présent
      
      // Gérer le résultat
      if (syncResult && syncResult.results) {
        const { ordersCreated, itemsCreated } = syncResult.results
        const totalNew = ordersCreated + itemsCreated
        
        if (totalNew > 0) {
          syncProgress.finishSync(`${ordersCreated} commande${ordersCreated > 1 ? 's' : ''} récupérée${ordersCreated > 1 ? 's' : ''}`)
        } else {
          syncProgress.finishSync('Tout est à jour')
        }
      } else if (syncResult && syncResult.message) {
        syncProgress.finishSync(syncResult.message)
      } else {
        syncProgress.finishSync('Tout est à jour')
      }
      
    } catch (error) {
      syncProgress.handleError(error)
    }
  }, [performSync, syncProgress])

  // Synchronisation automatique au rafraîchissement
  useEffect(() => {
    const fetchInitialLogs = async () => {
      try {
        const logs = await ApiService.getSyncLogs()
        if (logs && logs.log) {
          syncProgress.updateLogs(logs.log)
          const msg = logs.log.message || ''
          const finished = msg.includes('Synchronisation terminée') || msg.includes('Aucune nouvelle commande')
          if (finished) {
            syncProgress.finishSync('Tout est à jour')
          }
        }
      } catch (error) {
        // Erreur silencieuse
      }
    }

    // Désactiver l'auto-sync au rafraîchissement pour éviter les boucles
    // const isPageRefresh = !window.performance.navigation || window.performance.navigation.type === 1
    // if (isPageRefresh) {
    //   // OPTIMISATION: Timeout avec cleanup
    //   const timeoutId = setTimeout(async () => {
    //     await fetchInitialLogs()
    //     await performManualSync()
    //   }, 1000)
    //   
    //   // Cleanup du timeout si le composant est démonté
    //   return () => clearTimeout(timeoutId)
    // } else {
      fetchInitialLogs()
    // }
  }, [performManualSync, syncProgress])

  return {
    ...syncProgress,
    performManualSync
  }
}

export default useSyncManager
