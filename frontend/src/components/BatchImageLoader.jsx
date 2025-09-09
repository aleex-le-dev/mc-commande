import React, { useEffect, useState } from 'react'
import { preloadAllImages } from './cartes/ProductImage.jsx'

/**
 * Composant pour charger toutes les images d'une page en lot
 * Utilisé dans chaque page (MaillePage, CouturePage, etc.)
 */
const BatchImageLoader = ({ articles, pageName, priority = false }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [loadedCount, setLoadedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    if (!articles || articles.length === 0) return

    const loadImages = async () => {
      setIsLoading(true)
      setTotalCount(articles.length)
      setLoadedCount(0)

      try {
        console.log(`🚀 Chargement en lot de ${articles.length} images pour ${pageName}`)
        
        const results = await preloadAllImages(articles)
        setLoadedCount(results.length)
        
        console.log(`✅ Chargement terminé: ${results.length}/${articles.length} images pour ${pageName}`)
      } catch (error) {
        console.warn(`⚠️ Erreur chargement images ${pageName}:`, error)
      } finally {
        setIsLoading(false)
      }
    }

    // Délai pour ne pas impacter le rendu initial
    const timeoutId = setTimeout(loadImages, priority ? 0 : 500)
    
    return () => clearTimeout(timeoutId)
  }, [articles, pageName, priority])

  // Optionnel: afficher un indicateur de progression
  if (isLoading && totalCount > 0) {
    return (
      <div className="fixed top-4 right-4 bg-black/80 text-white px-3 py-2 rounded-lg text-sm z-50">
        📸 Chargement images: {loadedCount}/{totalCount}
      </div>
    )
  }

  return null
}

export default BatchImageLoader
