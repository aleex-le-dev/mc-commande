import React, { useEffect, useState } from 'react'
import { preloadAllImages } from './cartes/ProductImage.jsx'
import { getBackendUrl } from '../config/api.js'

/**
 * Composant intelligent pour charger toutes les images d'une page
 * Récupère automatiquement les articles et charge leurs images
 */
const SmartImageLoader = ({ pageName, priority = false }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [loadedCount, setLoadedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [articles, setArticles] = useState([])

  useEffect(() => {
    const loadArticlesAndImages = async () => {
      setIsLoading(true)
      
      try {
        // Récupérer les articles de la page
        const baseUrl = getBackendUrl()
        let apiEndpoint = ''
        
        // Déterminer l'endpoint selon la page
        switch (pageName) {
          case 'couture':
          case 'maille':
            apiEndpoint = `${baseUrl}/api/orders/production/${pageName}`
            break
          case 'termine':
            apiEndpoint = `${baseUrl}/api/orders?status=termine`
            break
          case 'fourniture':
            apiEndpoint = `${baseUrl}/api/orders?status=fourniture`
            break
          default:
            console.log(`⚠️ Page inconnue: ${pageName}`)
            return
        }
        
        console.log(`🔄 Récupération articles pour ${pageName}...`)
        
        const response = await fetch(apiEndpoint, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=300'
          }
        })
        
        if (!response.ok) {
          console.log(`❌ Erreur récupération ${pageName}: ${response.status}`)
          return
        }
        
        const data = await response.json()
        const fetchedArticles = data.orders || data || []
        
        if (!Array.isArray(fetchedArticles) || fetchedArticles.length === 0) {
          console.log(`⚠️ Aucun article trouvé pour ${pageName}`)
          return
        }
        
        setArticles(fetchedArticles)
        setTotalCount(fetchedArticles.length)
        
        console.log(`🚀 Chargement en lot de ${fetchedArticles.length} images pour ${pageName}`)
        
        // Charger toutes les images
        const results = await preloadAllImages(fetchedArticles)
        setLoadedCount(results.length)
        
        console.log(`✅ Chargement terminé: ${results.length}/${fetchedArticles.length} images pour ${pageName}`)
        
      } catch (error) {
        console.warn(`⚠️ Erreur chargement images ${pageName}:`, error)
      } finally {
        setIsLoading(false)
      }
    }

    // Délai pour ne pas impacter le rendu initial
    const timeoutId = setTimeout(loadArticlesAndImages, priority ? 0 : 500)
    
    return () => clearTimeout(timeoutId)
  }, [pageName, priority])

  // Afficher un indicateur de progression
  if (isLoading && totalCount > 0) {
    return (
      <div className="fixed top-4 right-4 bg-black/80 text-white px-3 py-2 rounded-lg text-sm z-50">
        📸 Chargement images: {loadedCount}/{totalCount}
      </div>
    )
  }

  return null
}

export default SmartImageLoader
