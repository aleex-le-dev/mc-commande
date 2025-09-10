/**
 * Service d'optimisation des images ultra-rapide
 * Gestion intelligente du cache et préchargement pour Render
 */

import { useState, useEffect } from 'react'

// Cache global ultra-simple et instantané
const imageCache = new Map()
const preloadQueue = new Set()
const loadingPromises = new Map()
const httpCache = new Map() // Cache HTTP persistant

// Cache persistant avec localStorage et sessionStorage
const PERSISTENT_CACHE_KEY = 'mc-image-cache-v1'
const SESSION_CACHE_KEY = 'mc-session-cache-v1'

// Charger le cache persistant au démarrage
const loadPersistentCache = () => {
  try {
    const stored = localStorage.getItem(PERSISTENT_CACHE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      data.forEach(([key, value]) => httpCache.set(key, value))
      console.log(`📦 Cache persistant chargé: ${httpCache.size} images`)
    }
  } catch (error) {
    console.warn('Erreur chargement cache persistant:', error)
  }
}

// Sauvegarder le cache persistant
const savePersistentCache = () => {
  try {
    const data = Array.from(httpCache.entries())
    localStorage.setItem(PERSISTENT_CACHE_KEY, JSON.stringify(data))
    console.log(`💾 Cache persistant sauvegardé: ${data.length} images`)
  } catch (error) {
    console.warn('Erreur sauvegarde cache persistant:', error)
  }
}

// Charger le cache de session
const loadSessionCache = () => {
  try {
    const stored = sessionStorage.getItem(SESSION_CACHE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      data.forEach(([key, value]) => imageCache.set(key, value))
      console.log(`📦 Cache session chargé: ${imageCache.size} images`)
    }
  } catch (error) {
    console.warn('Erreur chargement cache session:', error)
  }
}

// Sauvegarder le cache de session
const saveSessionCache = () => {
  try {
    const data = Array.from(imageCache.entries())
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(data))
    console.log(`💾 Cache session sauvegardé: ${data.length} images`)
  } catch (error) {
    console.warn('Erreur sauvegarde cache session:', error)
  }
}

// Initialiser les caches au démarrage
loadPersistentCache()
loadSessionCache()

// Nettoyer le cache ancien au démarrage
setTimeout(() => {
  ImageOptimizationService.cleanupOldCache()
}, 1000)

// Sauvegarder périodiquement (toutes les 30 secondes)
setInterval(() => {
  if (imageCache.size > 0) saveSessionCache()
  if (httpCache.size > 0) savePersistentCache()
}, 30000)

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
   * Précharger une image avec cache HTTP optimisé (INSTANTANÉ)
   */
  preloadImage: async (url, priority = false) => {
    // 1. Vérifier le cache mémoire (instantané)
    if (imageCache.has(url)) {
      console.log(`⚡ Cache mémoire: ${url.split('/').pop()}`)
      return Promise.resolve(imageCache.get(url))
    }

    // 2. Vérifier le cache HTTP persistant
    if (httpCache.has(url)) {
      const cachedUrl = httpCache.get(url)
      imageCache.set(url, cachedUrl)
      console.log(`⚡ Cache HTTP: ${url.split('/').pop()}`)
      return Promise.resolve(cachedUrl)
    }

    // 3. Vérifier le sessionStorage (fallback)
    try {
      const sessionData = sessionStorage.getItem(SESSION_CACHE_KEY)
      if (sessionData) {
        const sessionCache = new Map(JSON.parse(sessionData))
        if (sessionCache.has(url)) {
          const cachedUrl = sessionCache.get(url)
          imageCache.set(url, cachedUrl)
          console.log(`⚡ Cache session: ${url.split('/').pop()}`)
          return Promise.resolve(cachedUrl)
        }
      }
    } catch (error) {
      console.warn('Erreur lecture sessionStorage:', error)
    }

    // 4. Vérifier le localStorage (fallback final)
    try {
      const persistentData = localStorage.getItem(PERSISTENT_CACHE_KEY)
      if (persistentData) {
        const persistentCache = new Map(JSON.parse(persistentData))
        if (persistentCache.has(url)) {
          const cachedUrl = persistentCache.get(url)
          imageCache.set(url, cachedUrl)
          httpCache.set(url, cachedUrl) // Remettre dans le cache HTTP
          console.log(`⚡ Cache localStorage: ${url.split('/').pop()}`)
          return Promise.resolve(cachedUrl)
        }
      }
    } catch (error) {
      console.warn('Erreur lecture localStorage:', error)
    }

    // 5. Vérifier si déjà en cours de chargement
    if (preloadQueue.has(url)) {
      return loadingPromises.get(url) || Promise.resolve()
    }

    preloadQueue.add(url)
    
    const promise = new Promise(async (resolve, reject) => {
      try {
        // 4. Précharger avec une image invisible pour forcer le cache HTTP
      const img = new Image()

        img.onload = () => {
          // 5. Image chargée et mise en cache HTTP - stocker dans les deux caches
          imageCache.set(url, url)
          httpCache.set(url, url) // Cache persistant
          preloadQueue.delete(url)
          loadingPromises.delete(url)
          console.log(`✅ Image mise en cache: ${url.split('/').pop()} (total: ${imageCache.size})`)
          resolve(url)
        }

        img.onerror = () => {
          preloadQueue.delete(url)
          loadingPromises.delete(url)
          console.log(`❌ Erreur chargement image: ${url.split('/').pop()}`)
          reject(new Error('Failed to preload image'))
        }

        // 6. Forcer le chargement avec cache HTTP et headers optimisés
        img.crossOrigin = 'anonymous'
        img.loading = priority ? 'eager' : 'lazy'
        
        // Ajouter un timeout pour détecter les images qui ne se chargent pas
        const timeout = setTimeout(() => {
          console.log(`⏰ Timeout image: ${url.split('/').pop()}`)
          preloadQueue.delete(url)
          loadingPromises.delete(url)
          reject(new Error('Image loading timeout'))
        }, 10000) // 10 secondes de timeout
        
        img.onload = () => {
          clearTimeout(timeout)
          // 5. Image chargée et mise en cache HTTP - stocker dans les deux caches
          imageCache.set(url, url)
          httpCache.set(url, url) // Cache persistant
          preloadQueue.delete(url)
          loadingPromises.delete(url)
          console.log(`✅ Image mise en cache: ${url.split('/').pop()} (total: ${imageCache.size})`)
          
          // Sauvegarder immédiatement les caches
          saveSessionCache()
          savePersistentCache()
          
          resolve(url)
        }
        
        img.onerror = () => {
          clearTimeout(timeout)
          preloadQueue.delete(url)
          loadingPromises.delete(url)
          console.log(`❌ Erreur chargement image: ${url.split('/').pop()}`)
          reject(new Error('Failed to preload image'))
        }
        
        img.src = url
        
        // 7. Forcer le cache HTTP avec fetch (optionnel)
        try {
          const response = await fetch(url, {
            method: 'HEAD',
            cache: 'force-cache',
            headers: {
              'Cache-Control': 'max-age=31536000'
            }
          })
          if (response.ok) {
            httpCache.set(url, url)
          }
        } catch (e) {
          // Ignore fetch errors, continue with image loading
        }
        
      } catch (error) {
        preloadQueue.delete(url)
        loadingPromises.delete(url)
        reject(error)
      }
    })

    loadingPromises.set(url, promise)
    return promise
  },

  /**
   * Précharger un lot d'images simultanément (ULTRA-RAPIDE)
   */
  preloadBatch: async (imageUrls, priority = false) => {
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) return []
    
    console.log(`🖼️ Préchargement en lot: ${imageUrls.length} images`)
    
    // Précharger toutes les images en parallèle (instantané avec cache HTTP)
    const promises = imageUrls.map(url => ImageOptimizationService.preloadImage(url, priority))
    
    try {
      const results = await Promise.allSettled(promises)
      const successful = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)
      
      console.log(`🎉 Préchargement terminé: ${successful.length}/${imageUrls.length} images`)
      return successful
      } catch (error) {
      console.warn('Erreur préchargement batch:', error)
      return []
    }
  },


  /**
   * Obtenir une image du cache ou la précharger (INSTANTANÉ)
   */
  getImage: async (url, priority = false) => {
    // 1. Vérifier le cache mémoire (instantané)
    if (imageCache.has(url)) {
      return imageCache.get(url)
    }

    // 2. Vérifier le cache HTTP persistant
    if (httpCache.has(url)) {
      const cachedUrl = httpCache.get(url)
      imageCache.set(url, cachedUrl)
      return cachedUrl
    }

    // 3. Précharger et retourner l'URL directe
    try {
      return await ImageOptimizationService.preloadImage(url, priority)
    } catch (error) {
      console.warn('Erreur préchargement image:', error)
      return url // Retourner l'URL directe même en cas d'erreur
    }
  },

  /**
   * Nettoyer le cache si nécessaire (simple)
   */
  cleanupCache: () => {
    if (imageCache.size > 100) {
      const entries = Array.from(imageCache.entries())
      const toDelete = entries.slice(0, 20) // Supprimer les 20 plus anciens
      toDelete.forEach(([key]) => imageCache.delete(key))
    }
    // Ne pas nettoyer httpCache - il doit persister pour la navigation
  },

  /**
   * Obtenir les statistiques du cache
   */
  getCacheStats: () => ({
    cacheSize: imageCache.size,
    httpCacheSize: httpCache.size,
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
    httpCache.clear()
    
    // Vider aussi les caches persistants
    try {
      localStorage.removeItem(PERSISTENT_CACHE_KEY)
      sessionStorage.removeItem(SESSION_CACHE_KEY)
      console.log('🗑️ Tous les caches vidés')
    } catch (error) {
      console.warn('Erreur vidage caches persistants:', error)
    }
  },

  /**
   * Nettoyer le cache ancien (plus de 7 jours)
   */
  cleanupOldCache: () => {
    try {
      const now = Date.now()
      const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 jours
      
      // Nettoyer le cache persistant
      const stored = localStorage.getItem(PERSISTENT_CACHE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        const filtered = data.filter(([key, value]) => {
          // Garder seulement les URLs récentes (logique simplifiée)
          return key.includes('w=256&q=75&f=webp')
        })
        
        if (filtered.length !== data.length) {
          localStorage.setItem(PERSISTENT_CACHE_KEY, JSON.stringify(filtered))
          console.log(`🧹 Cache nettoyé: ${data.length - filtered.length} images supprimées`)
        }
      }
    } catch (error) {
      console.warn('Erreur nettoyage cache:', error)
    }
  },

  /**
   * Précharger agressivement toutes les images d'une page (INSTANTANÉ)
   */
  preloadPageImages: async (articles = []) => {
    if (!articles || articles.length === 0) return

    console.log(`🚀 Préchargement agressif pour ${articles.length} articles`)
    
    const imageUrls = []
    articles.forEach((article, index) => {
      console.log(`📦 Article ${index + 1}:`, {
        hasItems: !!article.items,
        itemsLength: article.items?.length || 0,
        hasProductId: !!article.product_id,
        product_id: article.product_id,
        image_url: article.image_url
      })
      
      // Vérifier si l'article a des items (structure imbriquée)
      if (article.items && Array.isArray(article.items)) {
        article.items.forEach((item, itemIndex) => {
          console.log(`  📋 Item ${itemIndex + 1}:`, {
            product_id: item.product_id,
            hasProductId: !!item.product_id
          })
          
          if (item.product_id) {
            const baseUrl = import.meta.env.DEV 
              ? 'http://localhost:3001' 
              : 'https://maisoncleo-commande.onrender.com'
            const imageUrl = `${baseUrl}/api/images/${item.product_id}?w=256&q=75&f=webp`
            imageUrls.push(imageUrl)
            console.log(`  ✅ URL ajoutée: ${imageUrl}`)
          }
        })
      } 
      // Sinon, utiliser directement les propriétés de l'article
      else if (article.product_id) {
        const baseUrl = import.meta.env.DEV 
          ? 'http://localhost:3001' 
          : 'https://maisoncleo-commande.onrender.com'
        const imageUrl = `${baseUrl}/api/images/${article.product_id}?w=256&q=75&f=webp`
        imageUrls.push(imageUrl)
        console.log(`  ✅ URL directe ajoutée: ${imageUrl}`)
      }
    })
    

    if (imageUrls.length > 0) {
      try {
        console.log(`🔄 Début préchargement de ${imageUrls.length} images...`)
        
        // Précharger par lots de 5 pour éviter la surcharge
        const batchSize = 5
        const batches = []
        for (let i = 0; i < imageUrls.length; i += batchSize) {
          batches.push(imageUrls.slice(i, i + batchSize))
        }
        
        let totalSuccessful = 0
        let totalFailed = 0
        
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i]
          console.log(`📦 Lot ${i + 1}/${batches.length}: ${batch.length} images`)
          console.log(`🔗 URLs du lot:`, batch.map(url => url.split('/').pop()))
          
          const promises = batch.map(url => ImageOptimizationService.preloadImage(url, true))
          const results = await Promise.allSettled(promises)
          const successful = results.filter(r => r.status === 'fulfilled').length
          const failed = results.filter(r => r.status === 'rejected').length
          
          totalSuccessful += successful
          totalFailed += failed
          
          console.log(`✅ Lot ${i + 1} terminé: ${successful}/${batch.length} images`)
          
          // Afficher le cache après chaque lot
          const stats = ImageOptimizationService.getCacheStats()
          
          // Petite pause entre les lots pour éviter la surcharge
          if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        console.log(`✅ Préchargement terminé: ${totalSuccessful}/${imageUrls.length} images (${totalFailed} échecs)`)
        
        // Afficher les stats finales du cache
        const finalStats = ImageOptimizationService.getCacheStats()
      } catch (error) {
        console.warn('Erreur préchargement agressif:', error)
      }
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

