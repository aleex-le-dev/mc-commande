/**
 * Hook spécialisé pour la gestion des erreurs
 * Responsabilité unique: gestion des erreurs, retry intelligent, mode offline
 */
import { useState, useEffect, useCallback } from 'react'
import { HttpCacheService } from '../services/cache/httpCacheService'

export const useErrorHandler = () => {
  const [isOffline, setIsOffline] = useState(false)
  const [errorCount, setErrorCount] = useState(0)
  const [lastError, setLastError] = useState(null)
  const [retryAttempts, setRetryAttempts] = useState(0)

  // Détecter le mode offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      setErrorCount(0)
      setRetryAttempts(0)
    }

    const handleOffline = () => {
      setIsOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Vérifier l'état initial
    setIsOffline(!navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Gérer les erreurs avec retry intelligent
  const handleError = useCallback(async (error, retryFunction, maxRetries = 3) => {
    setLastError(error)
    setErrorCount(prev => prev + 1)

    // Si on a atteint le maximum de tentatives, utiliser le cache
    if (retryAttempts >= maxRetries) {
      console.warn('Max retries atteint, utilisation du cache')
      return await getFallbackData()
    }

    // Retry avec backoff exponentiel
    const delay = Math.min(1000 * Math.pow(2, retryAttempts), 10000)
    await new Promise(resolve => setTimeout(resolve, delay))

    setRetryAttempts(prev => prev + 1)

    try {
      return await retryFunction()
    } catch (retryError) {
      return await handleError(retryError, retryFunction, maxRetries)
    }
  }, [retryAttempts])

  // Obtenir des données de fallback
  const getFallbackData = useCallback(async () => {
    try {
      // Essayer d'obtenir des données du cache même expiré
      const cachedData = HttpCacheService.get('fallback_data')
      if (cachedData) {
        return cachedData
      }

      // Données de fallback par défaut
      return {
        orders: [],
        assignments: [],
        tricoteuses: [],
        pagination: { page: 1, limit: 15, total: 0, totalPages: 0 }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données de fallback:', error)
      return {
        orders: [],
        assignments: [],
        tricoteuses: [],
        pagination: { page: 1, limit: 15, total: 0, totalPages: 0 }
      }
    }
  }, [])

  // Afficher un message d'erreur utilisateur
  const showError = useCallback((error, context = '') => {
    const errorMessage = getErrorMessage(error)
    console.error(`[${context}] ${errorMessage}`, error)
    
    // Afficher une notification utilisateur (à implémenter selon votre système de notifications)
    if (window.showNotification) {
      window.showNotification({
        type: 'error',
        message: errorMessage,
        duration: 5000
      })
    }
  }, [])

  // Obtenir un message d'erreur lisible
  const getErrorMessage = useCallback((error) => {
    if (error.name === 'AbortError') {
      return 'Requête annulée - Veuillez réessayer'
    }
    if (error.message.includes('timeout')) {
      return 'Délai d\'attente dépassé - Le serveur met trop de temps à répondre'
    }
    if (error.message.includes('502')) {
      return 'Serveur temporairement indisponible - Réessayez dans quelques minutes'
    }
    if (error.message.includes('NetworkError')) {
      return 'Problème de connexion - Vérifiez votre connexion internet'
    }
    if (isOffline) {
      return 'Mode hors ligne - Certaines fonctionnalités peuvent être limitées'
    }
    return 'Une erreur inattendue s\'est produite - Veuillez réessayer'
  }, [isOffline])

  // Réinitialiser les erreurs
  const resetErrors = useCallback(() => {
    setErrorCount(0)
    setLastError(null)
    setRetryAttempts(0)
  }, [])

  // Vérifier la santé du serveur
  const checkServerHealth = useCallback(async () => {
    try {
      const health = await HttpCacheService.checkServerHealth()
      return health
    } catch (error) {
      console.error('Erreur lors de la vérification de la santé du serveur:', error)
      return false
    }
  }, [])

  return {
    isOffline,
    errorCount,
    lastError,
    retryAttempts,
    handleError,
    getFallbackData,
    showError,
    getErrorMessage,
    resetErrors,
    checkServerHealth
  }
}

export default useErrorHandler
