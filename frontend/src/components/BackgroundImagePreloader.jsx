import React, { useEffect } from 'react'
import { ImageOptimizationService } from '../services/imageOptimizationService.js'

/**
 * Composant pour précharger les images des autres pages en arrière-plan
 * Utilisé dans App.jsx pour optimiser les transitions entre pages
 */
const BackgroundImagePreloader = ({ currentPage, allPages = ['couture', 'maille', 'termine', 'fourniture'] }) => {
  useEffect(() => {
    // Précharger les images des autres pages en arrière-plan
    const preloadOtherPages = async () => {
      const otherPages = allPages.filter(page => page !== currentPage)
      
      if (otherPages.length === 0) return

      console.log(`🖼️ Préchargement images pour: ${otherPages.join(', ')}`)
      
      for (const page of otherPages) {
        try {
          // Simuler un appel pour récupérer les articles de cette page
          const baseUrl = import.meta.env.DEV 
            ? 'http://localhost:3001' 
            : 'https://maisoncleo-commande.onrender.com'
          
          // Précharger quelques images représentatives de chaque page
          const sampleImageUrls = [
            `${baseUrl}/api/images/sample-${page}?w=256&q=75&f=webp`,
            `${baseUrl}/api/images/sample-${page}-2?w=256&q=75&f=webp`,
            `${baseUrl}/api/images/sample-${page}-3?w=256&q=75&f=webp`
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
  }, [currentPage, allPages])

  // Nettoyer le cache périodiquement
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      ImageOptimizationService.cleanupCache()
    }, 60000) // Toutes les minutes

    return () => clearInterval(cleanupInterval)
  }, [])

  return null // Composant invisible
}

export default BackgroundImagePreloader
