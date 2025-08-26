import { useState, useEffect, useCallback } from 'react'
import { getSyncLogs } from '../../../services/mongodbService'

// Hook personnalisé pour gérer la progression de synchronisation
export const useSyncProgress = (performSync) => {
  const [syncProgress, setSyncProgress] = useState({ isRunning: false, progress: 0, message: '' })
  const [syncLogs, setSyncLogs] = useState([])

  // Fonction pour effectuer la synchronisation manuelle
  const performManualSync = useCallback(async () => {
    try {
      // Afficher le popup de progression
      setSyncProgress({ 
        isRunning: true, 
        progress: 0, 
        message: 'Connexion au backend...' 
      })
      
      // Étape 1: Connexion au backend
      setSyncProgress(prev => ({ ...prev, progress: 10, message: 'Connexion au backend...' }))
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Étape 2: Récupération des commandes WooCommerce
      setSyncProgress(prev => ({ ...prev, progress: 25, message: 'Récupération des commandes WooCommerce...' }))
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Étape 3: Récupération des permalinks
      setSyncProgress(prev => ({ ...prev, progress: 40, message: 'Récupération des permalinks...' }))
      await new Promise(resolve => setTimeout(resolve, 400))
      
      // Étape 4: Synchronisation avec la base de données
      setSyncProgress(prev => ({ ...prev, progress: 60, message: 'Synchronisation avec la base de données...' }))
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Étape 5: Appel de synchronisation
      setSyncProgress(prev => ({ ...prev, progress: 80, message: 'Synchronisation des données...' }))
      
      // Récupérer le dernier log en temps réel pendant la synchronisation
      const logsInterval = setInterval(async () => {
        try {
          const logs = await getSyncLogs()
          // Prendre seulement le dernier log au lieu de tous
          if (logs && logs.log) {
            setSyncLogs(prev => {
              // Éviter les mises à jour si le log est identique
              if (prev.length > 0 && prev[0]?.message === logs.log.message) {
                return prev
              }
              return [logs.log]
            })
          }
        } catch (error) {
          // Erreur silencieuse lors de la récupération des logs
        }
      }, 1000) // Ralenti à 1 seconde pour éviter les appels en boucle
      
      const syncResult = await performSync()
      
      // Arrêter la récupération des logs
      clearInterval(logsInterval)
      
      // Récupérer le dernier log final
      const finalLogs = await getSyncLogs()
      if (finalLogs && finalLogs.log) {
        setSyncLogs(prev => {
          // Éviter les mises à jour si le log est identique
          if (prev.length > 0 && prev[0]?.message === finalLogs.log.message) {
            return prev
          }
          return [finalLogs.log]
        })
      }
      
      // Étape 6: Afficher le résultat dans le popup de progression
      if (syncResult.results) {
        const { ordersCreated, itemsCreated } = syncResult.results
        const totalNew = ordersCreated + itemsCreated
        
        if (totalNew > 0) {
          setSyncProgress(prev => ({ 
            ...prev, 
            progress: 100, 
            message: `${ordersCreated} commande${ordersCreated > 1 ? 's' : ''} et ${itemsCreated} article${itemsCreated > 1 ? 's' : ''} récupéré${itemsCreated > 1 ? 's' : ''}`
          }))
        } else {
          setSyncProgress(prev => ({ 
            ...prev, 
            progress: 100, 
            message: 'Aucune nouvelle commande à traiter'
          }))
        }
      }
      
      // Masquer le popup de progression après 3 secondes
      setTimeout(() => setSyncProgress({ isRunning: false, progress: 0, message: '' }), 3000)
      
    } catch (error) {
      // Afficher l'erreur dans le popup de progression
      setSyncProgress(prev => ({ 
        ...prev, 
        progress: 100, 
        message: 'Erreur lors de la synchronisation'
      }))
      
      // Masquer le popup après 3 secondes
      setTimeout(() => setSyncProgress({ isRunning: false, progress: 0, message: '' }), 3000)
    }
  }, [performSync])

  // Récupérer les logs initiaux une seule fois au chargement
  useEffect(() => {
    const fetchInitialLogs = async () => {
      try {
        const logs = await getSyncLogs()
        if (logs && logs.log) {
          setSyncLogs([logs.log])
        }
      } catch (error) {
        // Erreur silencieuse lors de la récupération initiale
      }
    }
    
    fetchInitialLogs()
  }, []) // Dépendances vides = exécution unique au chargement

  return {
    syncProgress,
    syncLogs,
    performManualSync
  }
}
