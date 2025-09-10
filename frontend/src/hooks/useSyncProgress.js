/**
 * Hook spécialisé pour la gestion de la progression de synchronisation
 * Responsabilité unique: affichage et gestion de la progression
 */
import { useState, useCallback } from 'react'

export const useSyncProgress = () => {
  const [syncProgress, setSyncProgress] = useState({ 
    isRunning: false, 
    progress: 0, 
    message: '' 
  })
  const [syncLogs, setSyncLogs] = useState([])

  // Mettre à jour la progression
  const updateProgress = useCallback((progress, message) => {
    setSyncProgress(prev => ({ ...prev, progress, message }))
  }, [])

  // Démarrer la synchronisation
  const startSync = useCallback(() => {
    setSyncProgress({ 
      isRunning: true, 
      progress: 0, 
      message: 'Connexion au backend...' 
    })
  }, [])

  // Terminer la synchronisation
  const finishSync = useCallback((message = 'Tout est à jour') => {
    setSyncProgress(prev => ({ 
      ...prev, 
      progress: 100, 
      message 
    }))
    
    // Masquer après 6 secondes
    setTimeout(() => {
      setSyncProgress({ isRunning: false, progress: 0, message: '' })
    }, 6000)
  }, [])

  // Gérer les erreurs
  const handleError = useCallback((error) => {
    setSyncProgress(prev => ({ 
      ...prev, 
      progress: 100, 
      message: `Erreur: ${error.message}` 
    }))
    
    setTimeout(() => {
      setSyncProgress({ isRunning: false, progress: 0, message: '' })
    }, 5000)
  }, [])

  // Mettre à jour les logs
  const updateLogs = useCallback((newLog) => {
    setSyncLogs(prev => {
      if (prev.length > 0 && prev[0]?.message === newLog.message) {
        return prev
      }
      return [newLog]
    })
  }, [])

  return {
    syncProgress,
    syncLogs,
    updateProgress,
    startSync,
    finishSync,
    handleError,
    updateLogs
  }
}

export default useSyncProgress
