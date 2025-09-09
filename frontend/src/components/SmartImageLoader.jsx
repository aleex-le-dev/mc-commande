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
        
        // Déterminer l'endpoint selon la page (fourniture exclue car pas d'images)
        switch (pageName) {
          case 'couture':
          case 'maille':
            apiEndpoint = `${baseUrl}/api/orders/production/${pageName}`
            break
          case 'termine':
            apiEndpoint = `${baseUrl}/api/orders?status=termine`
            break
          case 'fourniture':
            console.log(`ℹ️ Page ${pageName} exclue - pas d'images à charger`)
            return
          default:
            console.log(`⚠️ Page inconnue: ${pageName}`)
            return
        }
        
        console.log(`🔄 Récupération articles pour ${pageName}...`)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
        
        const response = await fetch(apiEndpoint, {
          credentials: 'include',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=300'
          }
        })
        
        clearTimeout(timeoutId)
        
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
        
        // Charger toutes les images en arrière-plan (non bloquant)
        preloadAllImages(fetchedArticles)
          .then(results => {
            setLoadedCount(results.length)
            console.log(`✅ Chargement terminé: ${results.length}/${fetchedArticles.length} images pour ${pageName}`)
          })
          .catch(error => {
            console.warn(`⚠️ Erreur chargement images ${pageName}:`, error)
          })
        
      } catch (error) {
        console.warn(`⚠️ Erreur chargement images ${pageName}:`, error)
      } finally {
        setIsLoading(false)
      }
    }

    // Délai pour charger l'interface d'abord, puis les images
    const timeoutId = setTimeout(loadArticlesAndImages, priority ? 1000 : 3000)
    
    return () => clearTimeout(timeoutId)
  }, [pageName, priority])

  // Afficher un indicateur de progression discret
  if (isLoading && totalCount > 0) {
    return (
      <div className="fixed bottom-4 right-4 bg-green-600/90 text-white px-3 py-2 rounded-lg text-sm z-50 shadow-lg">
        📸 Images: {loadedCount}/{totalCount}
      </div>
    )
  }

  return null
}

export default SmartImageLoader
