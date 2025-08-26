import React, { useEffect, useState } from 'react'
import imageService from '../services/imageService'

/**
 * Composant qui précharge toutes les images en arrière-plan
 * pour les rendre disponibles instantanément
 */
const ImagePreloader = ({ articles, onPreloadComplete }) => {
  const [preloadedCount, setPreloadedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [isPreloading, setIsPreloading] = useState(false)

  useEffect(() => {
    if (articles && articles.length > 0) {
      preloadAllImages(articles)
    }
  }, [articles])

  const preloadAllImages = async (articlesList) => {
    if (isPreloading) return
    
    setIsPreloading(true)
    setTotalCount(articlesList.length)
    setPreloadedCount(0)

    const preloadPromises = articlesList.map(async (article, index) => {
      try {
        if (article.image_url) {
          // URL directe disponible - générer une image par défaut stylée
          await imageService.getImageFromUrl(article.image_url)
        } else if (article.product_id) {
          // Essayer de récupérer depuis WordPress et sauvegarder
          await imageService.getImage(article.product_id, { forceWordPress: true })
        }
        
        setPreloadedCount(prev => prev + 1)
      } catch (error) {
        console.debug(`Erreur lors du préchargement de l'image ${index}:`, error)
        setPreloadedCount(prev => prev + 1) // Compter même les échecs
      }
    })

    await Promise.allSettled(preloadPromises)
    setIsPreloading(false)
    
    if (onPreloadComplete) {
      onPreloadComplete()
    }
  }

  if (!isPreloading) return null

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
      <div className="text-sm font-medium">
        Préchargement des images...
      </div>
      <div className="text-xs opacity-90">
        {preloadedCount} / {totalCount} images
      </div>
      <div className="w-full bg-blue-800 rounded-full h-1 mt-2">
        <div 
          className="bg-white h-1 rounded-full transition-all duration-300"
          style={{ width: `${(preloadedCount / totalCount) * 100}%` }}
        />
      </div>
    </div>
  )
}

export default ImagePreloader
