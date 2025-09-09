/**
 * Service spécialisé pour la gestion des commandes
 * Optimisé pour la performance et la pagination
 */
import { getApiUrl } from '../config/api.js'
import CacheService from './cacheService.js'

const API_BASE_URL = getApiUrl()

/**
 * Service des commandes avec pagination et cache optimisé
 */
export const OrdersService = {
  /**
   * Obtenir les commandes avec pagination
   */
  async getOrders(options = {}) {
    const {
      page = 1,
      limit = 15,
      status = 'all',
      search = '',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options

    const cacheKey = `orders_${page}_${limit}_${status}_${search}_${sortBy}_${sortOrder}`
    
    // Forcer un refetch sans cache pour diagnostic
    console.log('🔄 Refetch forcé sans cache pour diagnostic...')
    
    // Vider le cache persistant
    try {
      // Vider tous les caches possibles
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.includes('orders') || key.includes('cache')) {
          localStorage.removeItem(key)
        }
      })
      
      // Vider aussi sessionStorage
      const sessionKeys = Object.keys(sessionStorage)
      sessionKeys.forEach(key => {
        if (key.includes('orders') || key.includes('cache')) {
          sessionStorage.removeItem(key)
        }
      })
      
      console.log('🗑️ Cache localStorage et sessionStorage vidé')
    } catch (e) {
      console.log('⚠️ Erreur vidage cache:', e.message)
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status,
        search,
        sortBy,
        sortOrder
      })

      // Ajouter un paramètre de cache-busting
      params.append('_t', Date.now().toString())
      
      const fullUrl = `${API_BASE_URL}/orders?${params}`
      console.log('🔗 URL complète:', fullUrl)
      
      const response = await fetch(fullUrl, {
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Ne pas mettre en cache pour diagnostic
      console.log(`📋 Commandes récupérées: page ${page}, ${data.orders?.length || 0} articles`)
      console.log('🔍 Structure des données:', data)
      console.log('🔍 Premier ordre:', data.orders?.[0])
      if (data.orders?.[0]) {
        console.log('🔍 Clés du premier ordre:', Object.keys(data.orders[0]))
        console.log('🔍 line_items du premier ordre:', data.orders[0].line_items)
        console.log('🔍 items du premier ordre:', data.orders[0].items)
      }
      return data

    } catch (error) {
      console.error('Erreur récupération commandes:', error)
      
      // Fallback: retourner les données du cache même si expirées
      const fallback = CacheService.getMemory(cacheKey)
      if (fallback) {
        console.warn('⚠️ Utilisation du cache expiré pour les commandes')
        return fallback
      }
      
      throw error
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Obtenir une commande par ID
   */
  async getOrderById(orderId) {
    const cacheKey = `order_${orderId}`
    
    // Désactiver le cache pour diagnostic
    console.log(`🚫 Cache désactivé pour diagnostic: ${cacheKey}`)
    const cached = null
    if (cached) {
      return cached
    }

    try {
      await CacheService.acquireSlot()
      
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        credentials: 'include',
        mode: 'cors'
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }

      const data = await response.json()
      CacheService.set(cacheKey, data)
      
      return data

    } catch (error) {
      console.error(`Erreur récupération commande ${orderId}:`, error)
      throw error
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Obtenir les statistiques des commandes
   */
  async getOrdersStats() {
    const cacheKey = 'orders_stats'
    
    // Désactiver le cache pour diagnostic
    console.log(`🚫 Cache désactivé pour diagnostic: ${cacheKey}`)
    const cached = null
    if (cached) {
      return cached
    }

    try {
      await CacheService.acquireSlot()
      
      const response = await fetch(`${API_BASE_URL}/orders/stats`, {
        credentials: 'include',
        mode: 'cors'
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }

      const data = await response.json()
      CacheService.set(cacheKey, data)
      
      return data

    } catch (error) {
      console.error('Erreur récupération stats commandes:', error)
      throw error
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Rechercher des commandes
   */
  async searchOrders(query, options = {}) {
    const {
      page = 1,
      limit = 15,
      status = 'all'
    } = options

    const cacheKey = `search_${query}_${page}_${limit}_${status}`
    
    // Désactiver le cache pour diagnostic
    console.log(`🚫 Cache désactivé pour diagnostic: ${cacheKey}`)
    const cached = null
    if (cached) {
      return cached
    }

    try {
      await CacheService.acquireSlot()
      
      const params = new URLSearchParams({
        q: query,
        page: page.toString(),
        limit: limit.toString(),
        status
      })

      const response = await fetch(`${API_BASE_URL}/orders/search?${params}`, {
        credentials: 'include',
        mode: 'cors'
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }

      const data = await response.json()
      CacheService.set(cacheKey, data)
      
      return data

    } catch (error) {
      console.error('Erreur recherche commandes:', error)
      throw error
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Mettre à jour une commande
   */
  async updateOrder(orderId, updates) {
    try {
      await CacheService.acquireSlot()
      
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: 'PUT',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }

      const data = await response.json()
      
      // Invalider le cache
      this.invalidateCache()
      
      return data

    } catch (error) {
      console.error(`Erreur mise à jour commande ${orderId}:`, error)
      throw error
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Supprimer une commande
   */
  async deleteOrder(orderId) {
    try {
      await CacheService.acquireSlot()
      
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: 'DELETE',
        credentials: 'include',
        mode: 'cors'
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }

      // Invalider le cache
      this.invalidateCache()
      
      return true

    } catch (error) {
      console.error(`Erreur suppression commande ${orderId}:`, error)
      throw error
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Invalider le cache des commandes
   */
  invalidateCache() {
    const stats = CacheService.getStats()
    stats.memoryKeys.forEach(key => {
      if (key.startsWith('orders_') || key.startsWith('order_') || key.startsWith('search_')) {
        CacheService.delete(key)
      }
    })
    console.log('🗑️ Cache commandes invalidé')
  },

  /**
   * Obtenir les commandes en mode offline (depuis le cache)
   */
  getOfflineOrders(options = {}) {
    const {
      page = 1,
      limit = 15,
      status = 'all'
    } = options

    const cacheKey = `orders_${page}_${limit}_${status}_`
    
    // Chercher dans le cache même expiré
    const cached = CacheService.getMemory(cacheKey)
    if (cached) {
      console.log('📱 Mode offline: commandes depuis le cache')
      return cached
    }

    return {
      orders: [],
      pagination: {
        page: 1,
        limit: 15,
        total: 0,
        pages: 1
      }
    }
  }
}

export default OrdersService
