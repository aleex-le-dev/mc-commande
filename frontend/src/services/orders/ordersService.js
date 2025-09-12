/**
 * Service spécialisé pour la gestion des commandes
 * Responsabilité unique : gestion des commandes et articles
 */
import HttpClientService from '../http/httpClientService.js'
import { HttpCacheService } from '../cache/httpCacheService.js'

/**
 * Service des commandes
 */
export const OrdersService = {
  /**
   * Récupérer les commandes avec options (méthode principale)
   */
  async getOrders(options = {}) {
    const { page = 1, limit = 50, status = 'all', search = '', sortBy = 'order_date', sortOrder = 'desc', productionType = 'all' } = options
    return this.getOrdersPaginated(page, limit, status, search, sortBy, sortOrder, productionType)
  },

  /**
   * Récupérer les commandes depuis la base de données avec pagination
   * Évite de charger toutes les commandes d'un coup
   */
  async getOrdersFromDatabase(page = 1, limit = 50) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })
      
      const response = await HttpClientService.get(`/orders?${params}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      
      // Retourner le format attendu avec pagination
      return {
        orders: data.orders || data || [],
        pagination: {
          page: page,
          limit: limit,
          total: data.total || (data.orders ? data.orders.length : 0),
          totalPages: Math.ceil((data.total || (data.orders ? data.orders.length : 0)) / limit),
          hasNext: page < Math.ceil((data.total || (data.orders ? data.orders.length : 0)) / limit),
          hasPrev: page > 1
        }
      }
    } catch (error) {
      console.error('Erreur récupération commandes:', error)
      return { 
        orders: [], 
        pagination: { 
          page: 1, 
          limit: limit, 
          total: 0, 
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        } 
      }
    }
  },

  /**
   * Créer une nouvelle commande locale via l'API backend
   */
  async createOrder(orderPayload) {
    try {
      const response = await HttpClientService.post('/orders', orderPayload)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Erreur création commande:', error)
      throw error
    }
  },

  /**
   * Récupérer les commandes avec pagination
   */
  async getOrdersPaginated(page = 1, limit = 50, status = 'all', search = '', sortBy = 'order_date', sortOrder = 'desc', productionType = 'all') {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status,
        search,
        sortBy,
        sortOrder
      })
      
      // Si on filtre par type de production, utiliser l'endpoint spécialisé
      const endpoint = productionType !== 'all' ? `/orders/production/${productionType}` : '/orders'
      const response = await HttpClientService.get(`${endpoint}?${params}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      
      return {
        orders: data.orders || [],
        pagination: data.pagination || {
          page,
          limit,
          total: Array.isArray(data.orders) ? data.orders.length : 0,
          totalPages: Math.ceil((Array.isArray(data.orders) ? data.orders.length : 0) / limit),
          hasNext: false,
          hasPrev: false
        },
        stats: data.stats || null
      }
    } catch (error) {
      console.error('Erreur récupération commandes paginées:', error)
      return { 
        orders: [], 
        pagination: { 
          page: 1, 
          limit: limit, 
          total: 0, 
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        } 
      }
    }
  },

  /**
   * Récupérer les commandes par type de production
   */
  async getOrdersByProductionType(productionType) {
    try {
      const response = await HttpClientService.get(`/orders/by-production-type/${productionType}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.orders || []
    } catch (error) {
      console.error('Erreur récupération commandes par type:', error)
      return []
    }
  },

  /**
   * Récupérer une commande par numéro
   */
  async getOrderByNumber(orderNumber) {
    try {
      const response = await HttpClientService.get(`/orders/by-number/${orderNumber}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Erreur récupération commande par numéro:', error)
      return null
    }
  },

  /**
   * Mettre à jour une note de commande
   */
  async updateOrderNote(orderId, note) {
    try {
      const response = await HttpClientService.put(`/orders/${orderId}/note`, { note })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Erreur mise à jour note commande:', error)
      throw error
    }
  },

  /**
   * Mettre à jour le statut d'une commande
   */
  async updateOrderStatus(orderId, newStatus) {
    try {
      const response = await HttpClientService.put(`/orders/${orderId}/status`, { status: newStatus })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Erreur mise à jour statut commande:', error)
      throw error
    }
  },

  /**
   * Supprimer complètement une commande
   */
  async deleteOrderCompletely(orderId) {
    try {
      const response = await HttpClientService.delete(`/orders/${orderId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return true
    } catch (error) {
      console.error('Erreur suppression commande:', error)
      throw error
    }
  },

  /**
   * Récupérer les commandes archivées
   */
  async getArchivedOrders(page = 1, limit = 100) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })
      
      const response = await HttpClientService.get(`/orders/archived?${params}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Erreur récupération commandes archivées:', error)
      return { orders: [], pagination: { page: 1, total: 0, pages: 1 } }
    }
  },

  /**
   * Archiver une commande
   */
  async archiveOrder(orderId) {
    try {
      const response = await HttpClientService.post(`/orders/${orderId}/archive`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Erreur archivage commande:', error)
      throw error
    }
  },

  /**
   * Récupérer les statistiques des commandes
   */
  async getOrdersStats() {
    try {
      const response = await HttpClientService.get('/orders/stats')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Erreur récupération stats commandes:', error)
      return { total: 0, byStatus: {}, byType: {} }
    }
  }
}

export default OrdersService
