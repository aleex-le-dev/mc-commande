/**
 * Service spécialisé pour la synchronisation
 * Responsabilité unique : synchronisation des données avec WooCommerce
 */
import HttpClientService from '../http/httpClientService.js'
import { HttpCacheService } from '../cache/httpCacheService.js'

/**
 * Service de synchronisation
 */
export const SyncService = {
  /**
   * Synchroniser les commandes avec WooCommerce
   */
  async syncOrders(optionsOrOrders = []) {
    try {
      const response = await HttpClientService.post('/sync/orders', {
        orders: optionsOrOrders
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      // Invalider les caches après synchronisation
      HttpCacheService.delete('orders')
      HttpCacheService.delete('assignments')
      
      return result
    } catch (error) {
      console.error('Erreur synchronisation commandes:', error)
      throw error
    }
  },

  /**
   * Récupérer les logs de synchronisation
   */
  async getSyncLogs() {
    try {
      const response = await HttpClientService.get('/sync/logs')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Erreur récupération logs sync:', error)
      return { logs: [] }
    }
  },

  /**
   * Effacer les logs de synchronisation
   */
  async clearSyncLogs() {
    try {
      const response = await HttpClientService.delete('/sync/logs')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return true
    } catch (error) {
      console.error('Erreur effacement logs sync:', error)
      throw error
    }
  },

  /**
   * Tester la synchronisation
   */
  async testSync() {
    try {
      const response = await HttpClientService.post('/sync/test')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Erreur test sync:', error)
      throw error
    }
  },

  /**
   * Précharger les données de l'application
   */
  async prefetchAppData() {
    try {
      console.log('🔄 Préchargement des données de l\'application...')
      
      // Précharger les données en parallèle
      const [tricoteuses, assignments, orders] = await Promise.allSettled([
        HttpClientService.get('/tricoteuses'),
        HttpClientService.get('/assignments'),
        HttpClientService.get('/orders?limit=50')
      ])
      
      // Mettre en cache les données récupérées
      if (tricoteuses.status === 'fulfilled' && tricoteuses.value.ok) {
        const tricoteusesData = await tricoteuses.value.json()
        HttpCacheService.set('tricoteuses', tricoteusesData.tricoteuses || [])
      }
      
      if (assignments.status === 'fulfilled' && assignments.value.ok) {
        const assignmentsData = await assignments.value.json()
        HttpCacheService.set('assignments', assignmentsData.assignments || [])
      }
      
      if (orders.status === 'fulfilled' && orders.value.ok) {
        const ordersData = await orders.value.json()
        HttpCacheService.set('orders', ordersData.orders || [])
      }
      
      console.log('✅ Préchargement terminé')
      return true
    } catch (error) {
      console.error('Erreur préchargement données:', error)
      return false
    }
  }
}

export default SyncService
