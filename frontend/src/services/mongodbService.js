// Service MongoDB pour la gestion des statuts de production
class MongoDBService {
  constructor() {
    this.mongoUrl = import.meta.env.VITE_MONGODB_URL
    this.database = 'maisoncleo'
    this.collection = 'production_status'
  }

  // Vérifie si la configuration MongoDB est disponible
  isConfigured() {
    return !!this.mongoUrl
  }

  // Récupère tous les statuts de production
  async getProductionStatuses() {
    try {
      if (!this.isConfigured()) {
        console.log('MongoDB: Configuration manquante')
        return []
      }

      const response = await fetch(`${this.mongoUrl}/api/production-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }

      const data = await response.json()
      return data.statuses || []
    } catch (error) {
      console.error('MongoDB: Erreur lors de la récupération des statuts:', error)
      return []
    }
  }

  // Récupère le statut d'un article spécifique
  async getArticleStatus(orderId, lineItemId) {
    try {
      if (!this.isConfigured()) return null

      const response = await fetch(`${this.mongoUrl}/api/production-status/${orderId}/${lineItemId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data.status || null
    } catch (error) {
      console.error('MongoDB: Erreur lors de la récupération du statut:', error)
      return null
    }
  }

  // Met à jour le statut d'un article
  async updateArticleStatus(orderId, lineItemId, status, assignedTo = null) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Configuration MongoDB manquante')
      }

      const statusData = {
        order_id: orderId,
        line_item_id: lineItemId,
        status: status,
        assigned_to: assignedTo,
        updated_at: new Date().toISOString()
      }

      const response = await fetch(`${this.mongoUrl}/api/production-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(statusData)
      })

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }

      const result = await response.json()
      console.log('MongoDB: Statut mis à jour avec succès:', result)
      return result
    } catch (error) {
      console.error('MongoDB: Erreur lors de la mise à jour du statut:', error)
      throw error
    }
  }

  // Récupère les statuts par type de production
  async getStatusesByProductionType(productionType) {
    try {
      if (!this.isConfigured()) return []

      const response = await fetch(`${this.mongoUrl}/api/production-status/type/${productionType}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      return data.statuses || []
    } catch (error) {
      console.error('MongoDB: Erreur lors de la récupération par type:', error)
      return []
    }
  }

  // Récupère les statistiques de production
  async getProductionStats() {
    try {
      if (!this.isConfigured()) return {}

      const response = await fetch(`${this.mongoUrl}/api/production-status/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        return {}
      }

      const data = await response.json()
      return data.stats || {}
    } catch (error) {
      console.error('MongoDB: Erreur lors de la récupération des stats:', error)
      return {}
    }
  }
}

// Instance singleton
const mongodbService = new MongoDBService()

// Fonctions d'export
export const getProductionStatuses = () => mongodbService.getProductionStatuses()
export const getArticleStatus = (orderId, lineItemId) => mongodbService.getArticleStatus(orderId, lineItemId)
export const updateArticleStatus = (orderId, lineItemId, status, assignedTo) => mongodbService.updateArticleStatus(orderId, lineItemId, status, assignedTo)
export const getStatusesByProductionType = (productionType) => mongodbService.getStatusesByProductionType(productionType)
export const getProductionStats = () => mongodbService.getProductionStats()

export default mongodbService
