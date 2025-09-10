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

// Cache ultra-simple - pas de persistance complexe

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
      return Promise.resolve(imageCache.get(url))
    }

    // 2. Vérifier le cache HTTP persistant
    if (httpCache.has(url)) {
      const cachedUrl = httpCache.get(url)
      imageCache.set(url, cachedUrl)
      return Promise.resolve(cachedUrl)
    }

    // 3. Vérifier si déjà en cours de chargement
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
    // Ne pas vider httpCache - il doit persister
  },

  /**
   * Précharger agressivement toutes les images d'une page (INSTANTANÉ)
   */
  preloadPageImages: async (articles = []) => {
    if (!articles || articles.length === 0) return

    console.log(`🚀 Préchargement agressif pour ${articles.length} articles`)
    console.log(`🔍 Premier article:`, articles[0])
    
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
    
    console.log(`📊 Total URLs générées: ${imageUrls.length}`)

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
          console.log(`📊 Cache après lot ${i + 1}: ${stats.cacheSize} images`)
          
          // Petite pause entre les lots pour éviter la surcharge
          if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        console.log(`✅ Préchargement terminé: ${totalSuccessful}/${imageUrls.length} images (${totalFailed} échecs)`)
        
        // Afficher les stats finales du cache
        const finalStats = ImageOptimizationService.getCacheStats()
        console.log(`📊 Cache final: ${finalStats.cacheSize} images en mémoire, ${finalStats.httpCacheSize} en HTTP`)
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
