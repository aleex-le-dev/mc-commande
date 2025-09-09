import { useState, useEffect, useCallback, useRef } from 'react'
import { ImageOptimizationService } from '../services/imageOptimizationService'

/**
 * Hook pour la gestion optimisée des images
 * Préchargement intelligent et gestion du cache
 */
export const useOptimizedImages = (imageUrls = [], options = {}) => {
  const {
    priority = false,
    preloadBatch = true,
    maxConcurrent = 6,
    onProgress = null,
    onComplete = null
  } = options

  const [loadedImages, setLoadedImages] = useState(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState([])
  const abortControllerRef = useRef(null)

  // Fonction de préchargement avec progression
  const preloadImages = useCallback(async (urls) => {
    if (urls.length === 0) return

    setIsLoading(true)
    setProgress(0)
    setErrors([])
    setLoadedImages(new Map())

    // Créer un nouveau contrôleur d'annulation
    abortControllerRef.current = new AbortController()

    try {
      if (preloadBatch) {
        // Préchargement par batch
        const results = await ImageOptimizationService.preloadBatch(urls, priority)
        
        const loaded = new Map()
        const errors = []
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            loaded.set(urls[index], result.value)
          } else {
            errors.push({ url: urls[index], error: result.reason })
          }
          
          // Mettre à jour la progression
          const currentProgress = Math.round(((index + 1) / urls.length) * 100)
          setProgress(currentProgress)
          
          if (onProgress) {
            onProgress(currentProgress, index + 1, urls.length)
          }
        })
        
        setLoadedImages(loaded)
        setErrors(errors)
        
        if (onComplete) {
          onComplete(loaded, errors)
        }
      } else {
        // Préchargement séquentiel
        const loaded = new Map()
        const errors = []
        
        for (let i = 0; i < urls.length; i++) {
          if (abortControllerRef.current?.signal.aborted) break
          
          try {
            const result = await ImageOptimizationService.preloadImage(urls[i], priority)
            loaded.set(urls[i], result)
          } catch (error) {
            errors.push({ url: urls[i], error })
          }
          
          const currentProgress = Math.round(((i + 1) / urls.length) * 100)
          setProgress(currentProgress)
          
          if (onProgress) {
            onProgress(currentProgress, i + 1, urls.length)
          }
        }
        
        setLoadedImages(loaded)
        setErrors(errors)
        
        if (onComplete) {
          onComplete(loaded, errors)
        }
      }
    } catch (error) {
      console.error('Erreur préchargement images:', error)
      setErrors([{ error: error.message }])
    } finally {
      setIsLoading(false)
    }
  }, [priority, preloadBatch, onProgress, onComplete])

  // Effet pour déclencher le préchargement
  useEffect(() => {
    if (imageUrls.length > 0) {
      preloadImages(imageUrls)
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [imageUrls, preloadImages])

  // Fonction pour annuler le chargement
  const cancelLoading = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  // Fonction pour recharger les images
  const reloadImages = useCallback(() => {
    if (imageUrls.length > 0) {
      preloadImages(imageUrls)
    }
  }, [imageUrls, preloadImages])

  // Fonction pour obtenir une image spécifique
  const getImage = useCallback((url) => {
    return loadedImages.get(url) || null
  }, [loadedImages])

  // Fonction pour vérifier si une image est chargée
  const isImageLoaded = useCallback((url) => {
    return loadedImages.has(url)
  }, [loadedImages])

  return {
    loadedImages,
    isLoading,
    progress,
    errors,
    cancelLoading,
    reloadImages,
    getImage,
    isImageLoaded,
    // Statistiques
    stats: {
      total: imageUrls.length,
      loaded: loadedImages.size,
      errors: errors.length,
      percentage: progress
    }
  }
}

export default useOptimizedImages
