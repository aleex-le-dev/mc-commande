import React, { useEffect } from 'react'
import { ImageOptimizationService } from '../services/imageOptimizationService.js'

/**
 * Composant pour précharger les images des nouvelles commandes après synchronisation
 * Utilisé dans SyncButton ou App.jsx
 */
const SyncImagePreloader = ({ newOrders = [] }) => {
  useEffect(() => {
    if (!newOrders || newOrders.length === 0) return

    const preloadNewOrderImages = async () => {
      try {
        console.log(`🔄 Préchargement images de ${newOrders.length} nouvelles commandes`)
        
        // Extraire les URLs d'images des nouvelles commandes
        const imageUrls = newOrders
          .map(order => {
            if (order.productId) {
              const base = import.meta.env.DEV 
                ? 'http://localhost:3001' 
                : 'https://maisoncleo-commande.onrender.com'
              return `${base}/api/woocommerce/products/${order.productId}/image?f=webp`
            }
            return null
          })
          .filter(Boolean)

        if (imageUrls.length > 0) {
          await ImageOptimizationService.preloadNewOrders(newOrders)
          console.log(`✅ Préchargement terminé: ${imageUrls.length} images`)
        }
      } catch (error) {
        console.warn('⚠️ Erreur préchargement nouvelles commandes:', error)
      }
    }

    // Délai pour ne pas impacter la synchronisation
    const timeoutId = setTimeout(preloadNewOrderImages, 1000)
    
    return () => clearTimeout(timeoutId)
  }, [newOrders])

  return null // Composant invisible
}

export default SyncImagePreloader
