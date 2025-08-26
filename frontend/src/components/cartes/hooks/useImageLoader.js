import { useState, useEffect, useCallback, useRef } from 'react'
import imageService from '../../../services/imageService'

/**
 * Hook personnalisé pour gérer le chargement des images
 * avec retry automatique et gestion des erreurs HTTP/2
 */
export const useImageLoader = (imageUrl, productId, options = {}) => {
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const abortControllerRef = useRef(null)
  const retryTimeoutRef = useRef(null)

  const {
    maxRetries = 3,
    retryDelay = 1000,
    enableAutoRetry = true,
    onLoad,
    onError
  } = options

  // Nettoyer les timeouts et aborts
  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // Charger l'image depuis le service
  const loadImage = useCallback(async (url, productIdForFallback) => {
    cleanup()
    
    setIsLoading(true)
    setHasError(false)

    try {
      let finalUrl = url

      // Si pas d'URL directe, essayer de récupérer via le service
      if (!finalUrl && productIdForFallback) {
        finalUrl = await imageService.getImage(productIdForFallback)
      }

      if (finalUrl) {
        setCurrentImageUrl(finalUrl)
        setIsLoading(false)
        onLoad?.(finalUrl)
        return finalUrl
      } else {
        throw new Error('Aucune image disponible')
      }
    } catch (error) {
      console.warn('Erreur lors du chargement de l\'image:', error)
      setHasError(true)
      setIsLoading(false)
      onError?.(error, retryCount)
      
      // Retry automatique si activé
      if (enableAutoRetry && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * retryDelay
        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1)
          // Retry avec un délai progressif
          loadImage(url, productIdForFallback)
        }, delay)
      }
    }
  }, [cleanup, enableAutoRetry, maxRetries, retryDelay, onLoad, onError, retryCount])

  // Retry manuel
  const retry = useCallback(() => {
    setRetryCount(0)
    setHasError(false)
    loadImage(imageUrl, productId)
  }, [imageUrl, productId, loadImage])

  // Réinitialiser l'état
  const reset = useCallback(() => {
    setRetryCount(0)
    setHasError(false)
    setIsLoading(false)
    setCurrentImageUrl(imageUrl)
  }, [imageUrl])

  // Charger l'image quand les props changent
  useEffect(() => {
    if (imageUrl) {
      setCurrentImageUrl(imageUrl)
      setHasError(false)
      setRetryCount(0)
    } else if (productId) {
      loadImage(null, productId)
    }

    return cleanup
  }, [imageUrl, productId, loadImage, cleanup])

  // Nettoyer à la destruction
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    imageUrl: currentImageUrl,
    isLoading,
    hasError,
    retryCount,
    retry,
    reset,
    // Méthodes utilitaires
    canRetry: retryCount < maxRetries,
    remainingRetries: maxRetries - retryCount
  }
}
