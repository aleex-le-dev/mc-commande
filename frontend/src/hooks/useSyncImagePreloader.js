import { useEffect, useRef } from 'react'
import { ImageOptimizationService } from '../services/imageOptimizationService'

/**
 * Hook pour précharger les images après synchronisation
 * Écoute les événements de synchronisation et précharge les nouvelles images
 */
export const useSyncImagePreloader = () => {
  const isPreloadingRef = useRef(false)

  useEffect(() => {
    const handleSyncComplete = async (event) => {
      if (isPreloadingRef.current) return
      
      try {
        isPreloadingRef.current = true
        console.log('🔄 Événement de synchronisation détecté - préchargement des images')
        
        // Attendre un peu pour que les données soient mises à jour
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Récupérer les nouvelles commandes
        const base = import.meta.env.DEV 
          ? 'http://localhost:3001' 
          : 'https://maisoncleo-commande.onrender.com'
        
        const response = await fetch(`${base}/api/orders`, { 
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          const orders = Array.isArray(data?.orders) ? data.orders : []
          
          if (orders.length > 0) {
            // Filtrer les commandes très récentes (dernières 2h)
            const veryRecentOrders = orders.filter(order => {
              const orderDate = new Date(order.order_date)
              const now = new Date()
              const diffHours = (now - orderDate) / (1000 * 60 * 60)
              return diffHours <= 2 // Commandes des dernières 2h
            })
            
            if (veryRecentOrders.length > 0) {
              console.log(`🖼️ Préchargement images pour ${veryRecentOrders.length} nouvelles commandes`)
              await ImageOptimizationService.preloadNewOrders(veryRecentOrders)
            }
          }
        }
      } catch (error) {
        console.warn('Erreur préchargement post-sync:', error)
      } finally {
        isPreloadingRef.current = false
      }
    }

    // Écouter les événements de synchronisation
    window.addEventListener('mc-data-updated', handleSyncComplete)
    window.addEventListener('mc-sync-complete', handleSyncComplete)
    
    return () => {
      window.removeEventListener('mc-data-updated', handleSyncComplete)
      window.removeEventListener('mc-sync-complete', handleSyncComplete)
    }
  }, [])

  return {
    isPreloading: isPreloadingRef.current
  }
}

export default useSyncImagePreloader
