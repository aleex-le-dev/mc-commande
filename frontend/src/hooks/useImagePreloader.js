import { useEffect, useRef } from 'react'
import { ImageOptimizationService } from '../services/imageOptimizationService'

/**
 * Hook pour précharger les images d'une page spécifique
 * Utilisé pour optimiser les changements de page
 */
export const useImagePreloader = (articles = [], pageType = '') => {
  const preloadedRef = useRef(new Set())
  const isPreloadingRef = useRef(false)

  useEffect(() => {
    if (!articles || articles.length === 0 || isPreloadingRef.current) return

    const preloadImages = async () => {
      isPreloadingRef.current = true
      
      try {
        // Extraire les URLs d'images des articles
        const imageUrls = articles
          .map(article => {
            if (!article.product_id) return null
            const baseUrl = import.meta.env.DEV 
              ? 'http://localhost:3001' 
              : 'https://maisoncleo-commande.onrender.com'
            return `${baseUrl}/api/images/${article.product_id}?w=256&q=75&f=webp`
          })
          .filter(Boolean)
          .filter(url => !preloadedRef.current.has(url))

        if (imageUrls.length === 0) return

        console.log(`🖼️ Préchargement ${imageUrls.length} images pour ${pageType}`)
        
        // Précharger par batch pour éviter de surcharger
        const batchSize = 5
        for (let i = 0; i < imageUrls.length; i += batchSize) {
          const batch = imageUrls.slice(i, i + batchSize)
          
          await Promise.allSettled(
            batch.map(url => {
              preloadedRef.current.add(url)
              return ImageOptimizationService.preloadImage(url, false)
            })
          )
          
          // Petite pause entre les batches
          if (i + batchSize < imageUrls.length) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        console.log(`✅ Préchargement ${pageType} terminé`)
        
      } catch (error) {
        console.warn(`Erreur préchargement ${pageType}:`, error)
      } finally {
        isPreloadingRef.current = false
      }
    }

    // Délai pour ne pas impacter l'affichage initial
    const timeoutId = setTimeout(preloadImages, 500)
    
    return () => {
      clearTimeout(timeoutId)
    }
  }, [articles, pageType])

  return {
    isPreloading: isPreloadingRef.current,
    preloadedCount: preloadedRef.current.size
  }
}

export default useImagePreloader
