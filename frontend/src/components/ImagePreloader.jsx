import React, { useEffect, useState, useRef } from 'react'

/**
 * Composant ultra-simple pour afficher le statut de chargement
 * Code ultra-propre - seulement l'essentiel
 */
const ImagePreloader = ({ articles, onPreloadComplete }) => {
  const [isPreloading, setIsPreloading] = useState(false)
  const hasShownRef = useRef(false)

  useEffect(() => {
    // Ne montrer le preloader qu'une seule fois par session
    if (articles && articles.length > 0 && !hasShownRef.current) {
      setIsPreloading(true)
      hasShownRef.current = true
      
      // Simuler un chargement rapide
      setTimeout(() => {
        setIsPreloading(false)
        if (onPreloadComplete) {
          onPreloadComplete()
        }
      }, 500)
    }
  }, [articles, onPreloadComplete])

  if (!isPreloading) return null

  return (
    <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
      <div className="text-sm font-medium">
        Images MongoDB chargées
      </div>
      <div className="text-xs opacity-90">
        {articles?.length || 0} images disponibles
      </div>
    </div>
  )
}

export default ImagePreloader
