/**
 * Service spécialisé pour la gestion des statuts de production
 * Responsabilité unique : gestion des statuts et types de production
 */
import HttpClientService from '../http/httpClientService.js'

/**
 * Service des statuts de production
 */
export const ProductionStatusService = {
  /**
   * Récupérer tous les statuts de production
   */
  async getProductionStatuses() {
    try {
      const response = await HttpClientService.get('/production-status')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.statuses || []
    } catch (error) {
      console.error('Erreur récupération statuts production:', error)
      return []
    }
  },

  /**
   * Mettre à jour le statut d'un article
   */
  async updateArticleStatus(orderId, lineItemId, status, notes = null) {
    try {
      const response = await HttpClientService.put('/production/status', {
        order_id: orderId,
        line_item_id: lineItemId,
        status,
        notes
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Erreur mise à jour statut article:', error)
      throw error
    }
  },

  /**
   * Définir un article comme urgent
   */
  async setArticleUrgent(orderId, lineItemId, urgent) {
    try {
      const response = await HttpClientService.put('/production/urgent', {
        order_id: orderId,
        line_item_id: lineItemId,
        urgent
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Erreur mise à jour urgence article:', error)
      throw error
    }
  },

  /**
   * Dispatcher un article vers la production
   */
  async dispatchToProduction(orderId, lineItemId, productionType, assignedTo = null) {
    try {
      const response = await HttpClientService.post('/production/dispatch', {
        order_id: orderId,
        line_item_id: lineItemId,
        production_type: productionType,
        assigned_to: assignedTo
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Erreur dispatch production:', error)
      throw error
    }
  },

  /**
   * Récupérer les statistiques de production
   */
  async getProductionStats() {
    try {
      const response = await HttpClientService.get('/production/stats')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Erreur récupération stats production:', error)
      return { total: 0, byStatus: {}, byType: {} }
    }
  }
}

export default ProductionStatusService
