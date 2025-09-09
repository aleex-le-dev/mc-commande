import React, { useEffect, useState, useRef } from 'react'
import { ImageOptimizationService } from '../services/imageOptimizationService'
import UltraFastSpinner from './UltraFastSpinner'

/**
 * Préchargeur d'images ultra-optimisé pour Render
 * Gestion intelligente des priorités et du cache
 */
const ImagePreloaderOptimized = ({ 
  articles = [], 
  onPreloadComplete = null,
  priority = false,
  showProgress = true,
  maxConcurrent = 6
}) => {
  const [isPreloading, setIsPreloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loadedCount, setLoadedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const hasShownRef = useRef(false)
  const abortControllerRef = useRef(null)

  useEffect(() => {
    if (!articles || articles.length === 0) return

    // Ne montrer le preloader qu'une seule fois par session
    if (hasShownRef.current) return

    const preloadImages = async () => {
      setIsPreloading(true)
      setTotalCount(articles.length)
      setLoadedCount(0)
      setProgress(0)
      hasShownRef.current = true

      // Créer un contrôleur d'annulation
      abortControllerRef.current = new AbortController()

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

        if (imageUrls.length === 0) {
          setIsPreloading(false)
          if (onPreloadComplete) onPreloadComplete()
          return
        }

        // Préchargement avec progression
        const results = await ImageOptimizationService.preloadBatch(imageUrls, priority)
        
        let loaded = 0
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            loaded++
          }
          setLoadedCount(loaded)
          setProgress(Math.round(((index + 1) / results.length) * 100))
        })

        // Chargement instantané pour les images prioritaires
        if (priority) {
          setTimeout(() => {
            setIsPreloading(false)
            if (onPreloadComplete) onPreloadComplete()
          }, 100)
        } else {
          // Délai minimal pour les autres
          setTimeout(() => {
            setIsPreloading(false)
            if (onPreloadComplete) onPreloadComplete()
          }, 500)
        }

      } catch (error) {
        console.warn('Erreur préchargement images:', error)
        setIsPreloading(false)
        if (onPreloadComplete) onPreloadComplete()
      }
    }

    preloadImages()

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [articles, onPreloadComplete, priority])

  if (!isPreloading) return null

  return (
    <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-xs">
      <div className="flex items-center space-x-3">
        <UltraFastSpinner 
          size="small" 
          variant="fast" 
          showMessage={false}
        />
        <div className="flex-1">
          <div className="text-sm font-medium">
            Images en cours de chargement
          </div>
          {showProgress && (
            <div className="text-xs opacity-90 mt-1">
              {loadedCount}/{totalCount} images ({progress}%)
            </div>
          )}
          <div className="w-full bg-green-700 rounded-full h-1.5 mt-2">
            <div 
              className="bg-white h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImagePreloaderOptimized
