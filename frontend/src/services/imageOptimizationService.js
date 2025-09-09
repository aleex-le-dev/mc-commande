/**
 * Service d'optimisation des images ultra-rapide
 * Gestion intelligente du cache et préchargement pour Render
 */

import { useState, useEffect } from 'react'

// Cache global optimisé
const imageCache = new Map()
const preloadQueue = new Set()
const loadingPromises = new Map()

// Configuration optimisée pour Render (adaptative)
const RENDER_CONFIG = {
  maxConcurrentPreloads: 6,
  preloadTimeout: 5000,
  cacheSize: 100,
  priorityThreshold: 0.8
}

// Détecter les appareils lents et ajuster la config
const isSlowDevice = () => {
  if (typeof navigator === 'undefined') return false
  return navigator.deviceMemory && navigator.deviceMemory < 4
}

// Configuration adaptative
const getAdaptiveConfig = () => {
  if (isSlowDevice()) {
    return {
      maxConcurrentPreloads: 3,
      preloadTimeout: 3000,
      cacheSize: 50,
      priorityThreshold: 0.9
    }
  }
  return RENDER_CONFIG
}

/**
 * Service de préchargement intelligent
 */
export const ImageOptimizationService = {
  /**
   * Précharger une image avec gestion d'erreur
   */
  preloadImage: async (url, priority = false) => {
    if (imageCache.has(url)) {
      return Promise.resolve(imageCache.get(url))
    }

    if (preloadQueue.has(url)) {
      return loadingPromises.get(url) || Promise.resolve()
    }

    preloadQueue.add(url)
    
    const config = getAdaptiveConfig()
    const promise = new Promise((resolve, reject) => {
      const img = new Image()
      const timeout = setTimeout(() => {
        preloadQueue.delete(url)
        loadingPromises.delete(url)
        reject(new Error('Preload timeout'))
      }, config.preloadTimeout)

      img.onload = () => {
        clearTimeout(timeout)
        imageCache.set(url, url)
        preloadQueue.delete(url)
        loadingPromises.delete(url)
        resolve(url)
      }

      img.onerror = () => {
        clearTimeout(timeout)
        preloadQueue.delete(url)
        loadingPromises.delete(url)
        reject(new Error('Failed to preload image'))
      }

      // Optimisations pour Render
      img.loading = priority ? 'eager' : 'lazy'
      img.decoding = 'async'
      img.src = url
    })

    loadingPromises.set(url, promise)
    return promise
  },

  /**
   * Précharger plusieurs images en parallèle avec limite adaptative
   */
  preloadBatch: async (urls, priority = false) => {
    const config = getAdaptiveConfig()
    const chunks = []
    for (let i = 0; i < urls.length; i += config.maxConcurrentPreloads) {
      chunks.push(urls.slice(i, i + config.maxConcurrentPreloads))
    }

    const results = []
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(url => 
        ImageOptimizationService.preloadImage(url, priority)
          .catch(error => ({ error, url }))
      )
      const chunkResults = await Promise.allSettled(chunkPromises)
      results.push(...chunkResults)
    }

    return results
  },

  /**
   * Obtenir une image du cache ou la précharger
   */
  getImage: async (url, priority = false) => {
    if (imageCache.has(url)) {
      return imageCache.get(url)
    }

    try {
      return await ImageOptimizationService.preloadImage(url, priority)
    } catch (error) {
      console.warn('Erreur préchargement image:', error)
      return null
    }
  },

  /**
   * Nettoyer le cache si nécessaire (adaptatif)
   */
  cleanupCache: () => {
    const config = getAdaptiveConfig()
    if (imageCache.size > config.cacheSize) {
      const entries = Array.from(imageCache.entries())
      const toDelete = entries.slice(0, Math.floor(config.cacheSize * 0.3))
      toDelete.forEach(([key]) => imageCache.delete(key))
    }
  },

  /**
   * Obtenir les statistiques du cache
   */
  getCacheStats: () => ({
    cacheSize: imageCache.size,
    preloadQueue: preloadQueue.size,
    loadingPromises: loadingPromises.size
  }),

  /**
   * Vider le cache
   */
  clearCache: () => {
    imageCache.clear()
    preloadQueue.clear()
    loadingPromises.clear()
  }
}

/**
 * Hook React pour l'optimisation des images
 */
export const useImageOptimization = (urls = [], priority = false) => {
  const [loadedImages, setLoadedImages] = useState(new Map())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (urls.length === 0) return

    setIsLoading(true)
    
    ImageOptimizationService.preloadBatch(urls, priority)
      .then(results => {
        const loaded = new Map()
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            loaded.set(urls[index], result.value)
          }
        })
        setLoadedImages(loaded)
      })
      .catch(error => {
        console.warn('Erreur préchargement batch:', error)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [urls, priority])

  return { loadedImages, isLoading }
}

export default ImageOptimizationService
