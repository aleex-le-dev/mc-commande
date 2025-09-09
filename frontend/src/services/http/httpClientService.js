/**
 * Service HTTP centralisé
 * Gère toutes les requêtes HTTP vers l'API backend
 */
import { getApiUrl } from '../../config/api.js'
import { requestWithRetry } from '../cache/httpCacheService.js'

const API_BASE_URL = getApiUrl()

/**
 * Service HTTP centralisé pour toutes les requêtes API
 */
export const HttpClientService = {
  /**
   * Requêtes GET
   */
  async get(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    return requestWithRetry(url, { method: 'GET', ...options })
  },

  /**
   * Requêtes POST
   */
  async post(endpoint, data, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    return requestWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      ...options
    })
  },

  /**
   * Requêtes PUT
   */
  async put(endpoint, data, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    return requestWithRetry(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      ...options
    })
  },

  /**
   * Requêtes DELETE
   */
  async delete(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    return requestWithRetry(url, { method: 'DELETE', ...options })
  },

  /**
   * Test de connexion
   */
  async testConnection() {
    try {
      const response = await this.get('/health')
      return response.ok
    } catch (error) {
      console.error('Test de connexion échoué:', error)
      return false
    }
  }
}

export default HttpClientService
