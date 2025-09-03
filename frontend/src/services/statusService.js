import { updateArticleStatus as updateArticleStatusAPI } from './mongodbService'

/**
 * Service simplifié pour les mises à jour de statuts
 */
class StatusService {
  async updateStatus(orderId, lineItemId, newStatus) {
    // Mise à jour immédiate dans l'interface
    const event = new CustomEvent('mc-article-status-updated', {
      detail: { orderId, lineItemId, status: newStatus }
    })
    window.dispatchEvent(event)

    // Synchronisation avec la base de données
    try {
      await updateArticleStatusAPI(orderId, lineItemId, newStatus)
    } catch (error) {
      console.error('Erreur mise à jour statut:', error)
    }
  }
}

export default new StatusService()
