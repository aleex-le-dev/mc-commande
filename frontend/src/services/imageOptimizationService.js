/**
 * Service d'optimisation des images ultra-rapide
 * Gestion intelligente du cache et préchargement pour Render
 */

import { useState, useEffect } from 'react'

// Cache global persistant entre les pages
const imageCache = new Map()
const preloadQueue = new Set()
const loadingPromises = new Map()

// Cache persistant dans sessionStorage pour éviter les rechargements
const PERSISTENT_CACHE_KEY = 'mc-image-cache'
const CACHE_VERSION = '1.0'

// Charger le cache depuis sessionStorage au démarrage
const loadPersistentCache = () => {
  try {
    const cached = sessionStorage.getItem(PERSISTENT_CACHE_KEY)
    if (cached) {
      const { version, data } = JSON.parse(cached)
      if (version === CACHE_VERSION && data) {
        data.forEach(([key, value]) => imageCache.set(key, value))
        // console.log(`🖼️ Cache images restauré: ${imageCache.size} images`) // Log désactivé pour la production
      }
    }
  } catch (error) {
    console.warn('Erreur chargement cache images:', error)
  }
}

// Sauvegarder le cache dans sessionStorage
const savePersistentCache = () => {
  try {
    const data = Array.from(imageCache.entries())
    sessionStorage.setItem(PERSISTENT_CACHE_KEY, JSON.stringify({
      version: CACHE_VERSION,
      data,
      timestamp: Date.now()
    }))
  } catch (error) {
    console.warn('Erreur sauvegarde cache images:', error)
  }
}

// Initialiser le cache persistant
loadPersistentCache()

// Configuration optimisée pour Render (chargement progressif)
const RENDER_CONFIG = {
  maxConcurrentPreloads: 3, // Réduit pour éviter la surcharge
  preloadTimeout: 5000, // Timeout réduit
  cacheSize: 50, // Cache réduit
  priorityThreshold: 0.8,
  batchSize: 10 // Taille de lot réduite
}

// Détecter les appareils lents et ajuster la config
const isSlowDevice = () => {
  if (typeof navigator === 'undefined') return false
  return navigator.deviceMemory && navigator.deviceMemory < 2 // Seuil abaissé pour Render
}

// Configuration adaptative (optimisée pour Render)
const getAdaptiveConfig = () => {
  if (isSlowDevice()) {
    return {
      maxConcurrentPreloads: 2, // Très réduit pour appareils lents
      preloadTimeout: 3000, // Timeout court
      cacheSize: 25, // Cache petit
      priorityThreshold: 0.9,
      batchSize: 5 // Très petit lot
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
      
      // OPTIMISATION: Cleanup du timeout après utilisation
      const cleanup = () => clearTimeout(timeout)

      img.onload = () => {
        clearTimeout(timeout)
        imageCache.set(url, url)
        preloadQueue.delete(url)
        loadingPromises.delete(url)
        // Sauvegarder le cache après chaque image chargée
        savePersistentCache()
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
   * Précharger un lot d'images simultanément (nouveau)
   */
  preloadBatch: async (imageUrls, priority = false) => {
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) return []
    
    const config = getAdaptiveConfig()
    const batchSize = config.batchSize || 50
    const results = []
    
    console.log(`🖼️ Préchargement en lot: ${imageUrls.length} images`)
    
    // Traiter par lots pour éviter de surcharger
    for (let i = 0; i < imageUrls.length; i += batchSize) {
      const batch = imageUrls.slice(i, i + batchSize)
      const batchPromises = batch.map(url => this.preloadImage(url, priority))
      
      try {
        const batchResults = await Promise.allSettled(batchPromises)
        results.push(...batchResults.map(result => 
          result.status === 'fulfilled' ? result.value : null
        ).filter(Boolean))
        
        console.log(`✅ Lot ${Math.floor(i/batchSize) + 1} terminé: ${batch.length} images`)
      } catch (error) {
        console.warn(`⚠️ Erreur lot ${Math.floor(i/batchSize) + 1}:`, error)
      }
    }
    
    console.log(`🎉 Préchargement en lot terminé: ${results.length}/${imageUrls.length} images`)
    return results
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
      // Sauvegarder après nettoyage
      savePersistentCache()
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
    // Nettoyer aussi le cache persistant
    try {
      sessionStorage.removeItem(PERSISTENT_CACHE_KEY)
    } catch (error) {
      console.warn('Erreur suppression cache persistant:', error)
    }
  },

  /**
   * Précharger les images des nouvelles commandes après sync
   */
  preloadNewOrders: async (newOrders = []) => {
    if (!newOrders || newOrders.length === 0) return

    console.log(`🔄 Préchargement images pour ${newOrders.length} nouvelles commandes`)
    
    const imageUrls = []
    newOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (item.product_id) {
            const baseUrl = import.meta.env.DEV 
              ? 'http://localhost:3001' 
              : 'https://maisoncleo-commande.onrender.com'
            const imageUrl = `${baseUrl}/api/images/${item.product_id}?w=256&q=75&f=webp`
            imageUrls.push(imageUrl)
          }
        })
      }
    })

    if (imageUrls.length > 0) {
      try {
        await ImageOptimizationService.preloadBatch(imageUrls, true) // Priorité haute
        console.log(`✅ Préchargement terminé: ${imageUrls.length} images`)
      } catch (error) {
        console.warn('Erreur préchargement nouvelles commandes:', error)
      }
    }
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
