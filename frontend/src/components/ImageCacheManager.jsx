import React, { useEffect } from 'react'
import { ImageOptimizationService } from '../services/imageOptimizationService'
import { preloadAllImages } from './cartes/ProductImage.jsx'

/**
 * Gestionnaire de cache d'images pour la persistance entre pages
 * Précharge les images des pages non visitées en arrière-plan
 */
const ImageCacheManager = ({ currentPage, articles = [], allPages = ['couture', 'maille', 'termine', 'fourniture'] }) => {
  useEffect(() => {
    // Précharger toutes les images de la page actuelle en lot
    if (articles && articles.length > 0) {
      console.log(`🚀 Chargement en lot de ${articles.length} images pour ${currentPage}`)
      preloadAllImages(articles)
    }
    
    // Précharger les images des autres pages en arrière-plan
    const preloadOtherPages = async () => {
      const otherPages = allPages.filter(page => page !== currentPage)
      
      for (const page of otherPages) {
        try {
          // Simuler un appel pour récupérer les articles de cette page
          const baseUrl = import.meta.env.DEV 
            ? 'http://localhost:3001' 
            : 'https://maisoncleo-commande.onrender.com'
          
          // Précharger quelques images représentatives de chaque page
          const sampleImageUrls = [
            `${baseUrl}/api/images/sample-couture?w=256&q=75&f=webp`,
            `${baseUrl}/api/images/sample-maille?w=256&q=75&f=webp`,
            `${baseUrl}/api/images/sample-termine?w=256&q=75&f=webp`
          ]
          
          // Préchargement en arrière-plan (sans bloquer l'UI)
          ImageOptimizationService.preloadBatch(sampleImageUrls, false)
            .catch(error => {
              console.log(`Préchargement page ${page} ignoré:`, error.message)
            })
          
        } catch (error) {
          // Ignorer les erreurs de préchargement
          console.log(`Préchargement page ${page} ignoré:`, error.message)
        }
      }
    }

    // Délai pour ne pas impacter les performances de la page actuelle
    const timeoutId = setTimeout(preloadOtherPages, 2000)
    
    return () => clearTimeout(timeoutId)
  }, [currentPage, articles, allPages])

  // Nettoyer le cache périodiquement
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      ImageOptimizationService.cleanupCache()
    }, 60000) // Toutes les minutes

    return () => clearInterval(cleanupInterval)
  }, [])

  return null // Composant invisible
}

export default ImageCacheManager
