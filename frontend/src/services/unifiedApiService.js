/**
 * Service API unifié
 * Consolide toute la logique de communication avec le backend
 */
import { HttpCacheService } from './cache/httpCacheService.js'

class UnifiedApiService {
  constructor() {
    this.baseUrl = this.getBaseUrl()
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Cache-Control': 'max-age=300'
    }
  }

  getBaseUrl() {
    if (import.meta.env.DEV) {
      return 'http://localhost:3001'
    }
    // Forcer l'URL Render même si VITE_API_URL est définie
    return 'https://maisoncleo-commande.onrender.com'
  }

  /**
   * Méthode de requête unifiée avec gestion d'erreurs
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const config = {
      method: 'GET',
      headers: this.defaultHeaders,
      credentials: 'include',
      ...options
    }

    try {
      const response = await HttpCacheService.requestWithRetry(url, config)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Erreur API ${endpoint}:`, error)
      throw error
    }
  }

  // === TRICOTEUSES ===
  tricoteuses = {
    async getTricoteuses() {
      return await this.request('/api/tricoteuses')
    },

    async createTricoteuse(data) {
      return await this.request('/api/tricoteuses', {
        method: 'POST',
        body: JSON.stringify(data)
      })
    },

    async updateTricoteuse(id, data) {
      return await this.request(`/api/tricoteuses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
    },

    async deleteTricoteuse(id) {
      return await this.request(`/api/tricoteuses/${id}`, {
        method: 'DELETE'
      })
    }
  }

  // === ASSIGNMENTS ===
  assignments = {
    async getAssignments() {
      return await this.request('/api/assignments')
    },

    async assignArticle(articleId, tricoteuseId) {
      return await this.request('/api/assignments', {
        method: 'POST',
        body: JSON.stringify({ articleId, tricoteuseId })
      })
    },

    async updateAssignment(assignmentId, data) {
      return await this.request(`/api/assignments/${assignmentId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
    },

    async unassignArticle(assignmentId) {
      return await this.request(`/api/assignments/${assignmentId}`, {
        method: 'DELETE'
      })
    }
  }

  // === ORDERS ===
  orders = {
    async getOrders(page = 1, limit = 50) {
      return await this.request(`/api/orders?page=${page}&limit=${limit}`)
    },

    async getOrderById(id) {
      return await this.request(`/api/orders/${id}`)
    },

    async deleteOrder(id) {
      return await this.request(`/api/orders/${id}`, {
        method: 'DELETE'
      })
    },

    async deleteOrderItem(orderId, itemId) {
      return await this.request(`/api/orders/${orderId}/items/${itemId}`, {
        method: 'DELETE'
      })
    }
  }

  // === PRODUCTION ===
  production = {
    async getProductionStatuses() {
      return await this.request('/api/production')
    },

    async updateArticleStatus(orderId, lineItemId, status) {
      return await this.request('/api/production/status', {
        method: 'PUT',
        body: JSON.stringify({ orderId, lineItemId, status })
      })
    }
  }

  // === AUTH ===
  auth = {
    async verify(password) {
      return await this.request('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ password })
      })
    },

    async setPassword(password) {
      return await this.request('/api/auth/set-password', {
        method: 'POST',
        body: JSON.stringify({ password })
      })
    },

    async logout() {
      return await this.request('/api/auth/logout', {
        method: 'POST'
      })
    }
  }

  // === SYNC ===
  sync = {
    async syncOrders(options = {}) {
      return await this.request('/api/sync/orders', {
        method: 'POST',
        body: JSON.stringify(options)
      })
    }
  }

  // === HEALTH CHECK ===
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        credentials: 'include'
      })
      return response.ok
    } catch (error) {
      console.error('Health check échoué:', error)
      return false
    }
  }
}

export const UnifiedApiService = new UnifiedApiService()
export default UnifiedApiService
