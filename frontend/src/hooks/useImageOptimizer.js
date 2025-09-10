/**
 * Hook spécialisé pour l'optimisation des images
 * Responsabilité unique: chargement optimisé et cache des images
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { ImageOptimizationService } from '../services/imageOptimizationService'

export const useImageOptimizer = (imageUrl, options = {}) => {
  const [optimizedUrl, setOptimizedUrl] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isFromCache, setIsFromCache] = useState(false)

  const {
    quality = 0.8,
    width = 400,
    height = 400,
    format = 'webp',
    lazy = true,
    preload = false
  } = options

  // Mémoriser les options pour éviter les re-calculs
  const memoizedOptions = useMemo(() => ({
    quality,
    width,
    height,
    format,
    lazy,
    preload
  }), [quality, width, height, format, lazy, preload])

  // Optimiser l'image
  const optimizeImage = useCallback(async (url) => {
    if (!url) return null

    try {
      setIsLoading(true)
      setError(null)

      // Vérifier le cache d'abord
      const cachedUrl = ImageOptimizationService.getCachedImage(url, memoizedOptions)
      if (cachedUrl) {
        setOptimizedUrl(cachedUrl)
        setIsFromCache(true)
        setIsLoading(false)
        return cachedUrl
      }

      // Optimiser l'image
      const optimized = await ImageOptimizationService.optimizeImage(url, memoizedOptions)
      
      if (optimized) {
        setOptimizedUrl(optimized)
        setIsFromCache(false)
        setIsLoading(false)
        return optimized
      }

      // Fallback vers l'URL originale
      setOptimizedUrl(url)
      setIsFromCache(false)
      setIsLoading(false)
      return url

    } catch (err) {
      console.error('Erreur lors de l\'optimisation de l\'image:', err)
      setError(err)
      setOptimizedUrl(url) // Fallback vers l'URL originale
      setIsLoading(false)
      return url
    }
  }, [memoizedOptions])

  // Charger l'image au montage
  useEffect(() => {
    if (!imageUrl) return

    if (preload) {
      // Précharger l'image
      ImageOptimizationService.preloadImage(imageUrl, true)
    }

    if (lazy) {
      // Chargement paresseux avec Intersection Observer
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              optimizeImage(imageUrl)
              observer.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.1 }
      )

      const imgElement = document.querySelector(`img[data-src="${imageUrl}"]`)
      if (imgElement) {
        observer.observe(imgElement)
      }

      return () => {
        observer.disconnect()
      }
    } else {
      // Chargement immédiat
      optimizeImage(imageUrl)
    }
  }, [imageUrl, optimizeImage, lazy, preload])

  // Obtenir l'URL d'affichage
  const getDisplayUrl = useCallback(() => {
    return optimizedUrl || imageUrl
  }, [optimizedUrl, imageUrl])

  // Précharger une image
  const preloadImage = useCallback(async (url) => {
    try {
      await ImageOptimizationService.preloadImage(url, true)
    } catch (err) {
      console.error('Erreur lors du préchargement:', err)
    }
  }, [])

  // Nettoyer le cache des images
  const clearImageCache = useCallback(() => {
    ImageOptimizationService.cleanupCache()
  }, [])

  // Obtenir les statistiques du cache
  const getCacheStats = useCallback(() => {
    return ImageOptimizationService.getCacheStats()
  }, [])

  return {
    optimizedUrl: getDisplayUrl(),
    isLoading,
    error,
    isFromCache,
    preloadImage,
    clearImageCache,
    getCacheStats,
    optimizeImage
  }
}

export default useImageOptimizer
