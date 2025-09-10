import React, { useEffect } from 'react'
import { ImageOptimizationService } from '../services/imageOptimizationService.js'
import { getBackendUrl } from '../config/api.js'

/**
 * Composant pour précharger les images des autres pages en arrière-plan
 * Utilisé dans App.jsx pour optimiser les transitions entre pages
 */
const BackgroundImagePreloader = ({ currentPage, allPages = ['couture', 'maille', 'termine'] }) => {
  useEffect(() => {
    // Précharger les images des autres pages en arrière-plan
    const preloadOtherPages = async () => {
      const otherPages = allPages.filter(page => page !== currentPage)
      
      if (otherPages.length === 0) return

      console.log(`🖼️ Préchargement images pour: ${otherPages.join(', ')} (fourniture exclue - pas d'images)`)
      
      for (const page of otherPages) {
        try {
          // Récupérer les vrais articles de cette page
          const baseUrl = getBackendUrl()
          let apiEndpoint = ''
          
          // Déterminer l'endpoint selon la page (fourniture exclue car pas d'images)
          switch (page) {
            case 'couture':
            case 'maille':
              apiEndpoint = `${baseUrl}/api/orders/production/${page}`
              break
            case 'termine':
              apiEndpoint = `${baseUrl}/api/orders?status=termine`
              break
            default:
              continue
          }
          
          console.log(`🔄 Récupération articles pour ${page}...`)
          
          // Récupérer les articles de la page avec limitation de charge
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout pour Render
          
          // Délai entre les requêtes pour éviter la surcharge
          await new Promise(resolve => setTimeout(resolve, 500))
          
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
            console.log(`❌ Erreur récupération ${page}: ${response.status}`)
            continue
          }
          
          const data = await response.json()
          const articles = data.orders || data || []
          
          if (!Array.isArray(articles) || articles.length === 0) {
            console.log(`⚠️ Aucun article trouvé pour ${page}`)
            continue
          }
          
          // Extraire les URLs d'images des articles
          const imageUrls = articles
            .map(article => {
              if (article.productId) {
                return `${baseUrl}/api/woocommerce/products/${article.productId}/image?f=webp`
              }
              return null
            })
            .filter(Boolean)
          
          if (imageUrls.length === 0) {
            console.log(`⚠️ Aucune image trouvée pour ${page}`)
            continue
          }
          
          // Préchargement en arrière-plan (sans bloquer l'UI)
          console.log(`🖼️ Préchargement ${imageUrls.length} images pour ${page}`)
          ImageOptimizationService.preloadBatch(imageUrls, false)
            .then(results => {
              const successCount = results.filter(r => r.status === 'fulfilled').length
              console.log(`✅ Préchargement ${page} terminé: ${successCount}/${imageUrls.length} images`)
            })
            .catch(error => {
              console.log(`❌ Erreur préchargement ${page}:`, error.message)
            })
          
        } catch (error) {
          // Ignorer les erreurs de préchargement
          console.log(`❌ Erreur préchargement ${page}:`, error.message)
        }
      }
    }

    // OPTIMISATION: Délai pour charger l'interface d'abord, puis les images des autres pages
    const timeoutId = setTimeout(preloadOtherPages, 8000)
    
    return () => clearTimeout(timeoutId) // ✅ Cleanup déjà présent
  }, [currentPage, allPages])

  // OPTIMISATION: Nettoyer le cache périodiquement avec cleanup
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      ImageOptimizationService.cleanupCache()
    }, 60000) // Toutes les minutes
    
    return () => clearInterval(cleanupInterval) // ✅ Cleanup déjà présent
  }, [])

  return null // Composant invisible
}

export default BackgroundImagePreloader
