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
      
      console.log('🔄 useSyncProgress - Appel de performSync...')
      const syncResult = await performSync()
      console.log('🔄 useSyncProgress - Résultat de performSync:', syncResult)
      
      // Arrêter la récupération des logs
      clearInterval(logsInterval)
      console.log('🔄 useSyncProgress - Intervalle de logs arrêté')
      
      try {
        console.log('🔄 useSyncProgress - Début du try-catch')
        
        console.log('🔄 useSyncProgress - syncResult complet:', syncResult)
        console.log('🔄 useSyncProgress - syncResult.results:', syncResult?.results)
        console.log('🔄 useSyncProgress - syncResult.message:', syncResult?.message)
        
        // Étape 6: Afficher le résultat dans le toast
        if (syncResult && syncResult.results) {
          const { ordersCreated, itemsCreated } = syncResult.results
          const totalNew = ordersCreated + itemsCreated
          
          console.log('🔄 useSyncProgress - Résultats de la sync:', { ordersCreated, itemsCreated, totalNew })
          
          if (totalNew > 0) {
            console.log('🔄 useSyncProgress - Nouvelles commandes détectées, message:', `${ordersCreated} commande${ordersCreated > 1 ? 's' : ''} récupérée${ordersCreated > 1 ? 's' : ''}`)
            setSyncProgress(prev => ({ 
              ...prev, 
              progress: 100, 
              message: `${ordersCreated} commande${ordersCreated > 1 ? 's' : ''} récupérée${ordersCreated > 1 ? 's' : ''}`
            }))
          } else {
            console.log('🔄 useSyncProgress - Aucune nouvelle commande, message: Tout est à jour')
            setSyncProgress(prev => ({ 
              ...prev, 
              progress: 100, 
              message: 'Tout est à jour'
            }))
          }
          
          console.log('🔄 useSyncProgress - Démarrage du timer de fermeture (6 secondes)')
          // Masquer le toast après 6 secondes
          setTimeout(() => {
            console.log('🔄 useSyncProgress - Timer de fermeture déclenché, masquage du toast')
            setSyncProgress({ isRunning: false, progress: 0, message: '' })
          }, 6000)
        } else if (syncResult && syncResult.message) {
          // Si pas de résultats mais un message, utiliser le message
          console.log('🔄 useSyncProgress - Pas de résultats mais message disponible:', syncResult.message)
          setSyncProgress(prev => ({ 
            ...prev, 
            progress: 100, 
            message: syncResult.message
          }))
          
          console.log('🔄 useSyncProgress - Démarrage du timer de fermeture (6 secondes)')
          setTimeout(() => {
            console.log('🔄 useSyncProgress - Timer de fermeture déclenché, masquage du toast')
            setSyncProgress({ isRunning: false, progress: 0, message: '' })
          }, 6000)
        } else {
          // Si rien du tout, fermer immédiatement
          console.log('🔄 useSyncProgress - Aucun résultat ni message, fermeture immédiate du toast')
          setSyncProgress({ isRunning: false, progress: 0, message: '' })
        }
        
        console.log('🔄 useSyncProgress - Fin du try-catch, tout s\'est bien passé')
      } catch (error) {
        console.error('❌ useSyncProgress - Erreur lors du traitement du résultat:', error)
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

  // Récupérer les logs initiaux une seule fois au chargement
  useEffect(() => {
    const fetchInitialLogs = async () => {
      try {
        const logs = await getSyncLogs()
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

    fetchInitialLogs()
  }, []) // Dépendances vides = exécution unique au chargement

  // Synchronisation automatique au démarrage
  useEffect(() => {
    const performAutoSync = async () => {
      try {
        // Attendre un peu que la page soit chargée
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Lancer la synchronisation automatique
        await performManualSync()
      } catch (error) {
        console.error('Erreur lors de la synchronisation automatique:', error)
      }
    }

    performAutoSync()
  }, [performManualSync])

  // Récupérer les logs en temps réel (toutes les 5 secondes)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const logs = await getSyncLogs()
        if (logs && logs.log) {
          setSyncLogs(prev => {
            // Éviter les mises à jour si le log est identique
            if (prev.length > 0 && prev[0]?.message === logs.log.message) {
              return prev
            }
            return [logs.log]
          })
          const msg = logs.log.message || ''
          const finished = msg.includes('Synchronisation terminée') || msg.includes('Aucune nouvelle commande') || msg.includes('vérification rapide')
          if (finished) {
            setSyncProgress(prev => ({ ...prev, isRunning: false, progress: 100, message: 'Tout est à jour' }))
          }
        }
      } catch (error) {
        // Erreur silencieuse lors de la récupération des logs
      }
    }, 5000) // Ralenti à 5 secondes pour éviter les appels en boucle

    return () => clearInterval(interval)
  }, [])

  return {
    syncProgress,
    syncLogs,
    performManualSync
  }
}
