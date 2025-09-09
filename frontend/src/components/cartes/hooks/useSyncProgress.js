import { useState, useEffect, useCallback } from 'react'
import { ApiService } from '../../../services/apiService'

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
          const logs = await ApiService.getSyncLogs()
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
      
      try {
        // Étape 6: Afficher le résultat dans le toast
        if (syncResult && syncResult.results) {
          const { ordersCreated, itemsCreated } = syncResult.results
          const totalNew = ordersCreated + itemsCreated
          
          if (totalNew > 0) {
            setSyncProgress(prev => ({ 
              ...prev, 
              progress: 100, 
              message: `${ordersCreated} commande${ordersCreated > 1 ? 's' : ''} récupérée${ordersCreated > 1 ? 's' : ''}`
            }))
          } else {
            setSyncProgress(prev => ({ 
              ...prev, 
              progress: 100, 
              message: 'Tout est à jour'
            }))
          }
          
          // Masquer le toast après 6 secondes
          setTimeout(() => {
            setSyncProgress({ isRunning: false, progress: 0, message: '' })
          }, 6000)
        } else if (syncResult && syncResult.message) {
          // Si pas de résultats mais un message, utiliser le message
          setSyncProgress(prev => ({ 
            ...prev, 
            progress: 100, 
            message: syncResult.message
          }))
          
          setTimeout(() => {
            setSyncProgress({ isRunning: false, progress: 0, message: '' })
          }, 6000)
        } else {
          // Si rien du tout, fermer immédiatement
          setSyncProgress({ isRunning: false, progress: 0, message: '' })
        }
      } catch (error) {
        // En cas d'erreur, fermer le toast
        setSyncProgress({ isRunning: false, progress: 0, message: '' })
      }
      
    } catch (error) {
      // Afficher l'erreur dans le popup de progression
      setSyncProgress(prev => ({ 
        ...prev, 
        progress: 100, 
        message: `Erreur: ${error.message}` 
      }))
      
      // Masquer le popup de progression après 5 secondes en cas d'erreur
      setTimeout(() => setSyncProgress({ isRunning: false, progress: 0, message: '' }), 5000)
    }
  }, [performSync])

  // Synchronisation automatique uniquement au rafraîchissement de la page
  useEffect(() => {
    const fetchInitialLogs = async () => {
      try {
        const logs = await ApiService.getSyncLogs()
        if (logs && logs.log) {
          setSyncLogs([logs.log])
          const msg = logs.log.message || ''
          const finished = msg.includes('Synchronisation terminée') || msg.includes('Aucune nouvelle commande')
          if (finished) {
            setSyncProgress({ isRunning: false, progress: 100, message: 'Tout est à jour' })
          }
        }
      } catch (error) {
        // Erreur silencieuse lors de la récupération initiale
      }
    }

    // Vérifier si c'est un rafraîchissement de page (pas un changement d'onglet)
    const isPageRefresh = !window.performance.navigation || window.performance.navigation.type === 1
    if (isPageRefresh) {
      // Attendre un peu que la page soit chargée puis synchroniser
      setTimeout(async () => {
        await fetchInitialLogs()
        await performManualSync()
      }, 1000)
    } else {
      // Juste récupérer les logs sans synchroniser
      fetchInitialLogs()
    }
  }, [performManualSync]) // Dépendance sur performManualSync pour la synchronisation


  return {
    syncProgress,
    syncLogs,
    performManualSync
  }
}
