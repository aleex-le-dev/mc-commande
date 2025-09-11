/**
 * Service de logique métier unifié
 * Consolide toute la logique métier dispersée dans l'application
 */
import { UnifiedApiService } from './unifiedApiService.js'

class BusinessLogicService {
  constructor() {
    this.cache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5 minutes
  }

  // === GESTION DES COMMANDES ===
  
  /**
   * Calculer le statut d'une commande basé sur ses articles
   */
  calculateOrderStatus(order) {
    if (!order?.items || order.items.length === 0) {
      return 'vide'
    }

    const statuses = order.items.map(item => item.status || 'a_faire')
    const uniqueStatuses = [...new Set(statuses)]

    if (uniqueStatuses.includes('termine')) {
      if (uniqueStatuses.length === 1) return 'termine'
      return 'partiellement_termine'
    }

    if (uniqueStatuses.includes('en_cours')) {
      return 'en_cours'
    }

    if (uniqueStatuses.includes('en_pause')) {
      return 'en_pause'
    }

    return 'a_faire'
  }

  /**
   * Calculer la priorité d'une commande
   */
  calculateOrderPriority(order) {
    const now = new Date()
    const orderDate = new Date(order.order_date)
    const daysSinceOrder = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24))
    
    // Priorité basée sur l'âge de la commande
    if (daysSinceOrder > 14) return 'urgent'
    if (daysSinceOrder > 7) return 'haute'
    if (daysSinceOrder > 3) return 'normale'
    return 'basse'
  }

  /**
   * Calculer si une commande est en retard
   */
  isOrderLate(order, delais) {
    if (!order?.order_date || !delais) return false
    
    const orderDate = new Date(order.order_date)
    const delai = delais[order.production_type] || delais.default || 7
    const deadline = new Date(orderDate.getTime() + (delai * 24 * 60 * 60 * 1000))
    
    return new Date() > deadline
  }

  // === GESTION DES ASSIGNATIONS ===

  /**
   * Assigner un article à une tricoteuse
   */
  async assignArticle(articleId, tricoteuseId, metadata = {}) {
    try {
      const assignment = {
        articleId,
        tricoteuseId,
        assignedAt: new Date().toISOString(),
        status: 'a_faire',
        ...metadata
      }

      const result = await UnifiedApiService.assignments.assignArticle(articleId, tricoteuseId)
      
      // Mettre à jour le cache local
      this.updateCache('assignments', result)
      
      return result
    } catch (error) {
      console.error('Erreur assignation article:', error)
      throw error
    }
  }

  /**
   * Désassigner un article
   */
  async unassignArticle(assignmentId) {
    try {
      await UnifiedApiService.assignments.unassignArticle(assignmentId)
      
      // Mettre à jour le cache local
      this.removeFromCache('assignments', assignmentId)
      
    } catch (error) {
      console.error('Erreur désassignation article:', error)
      throw error
    }
  }

  /**
   * Mettre à jour le statut d'un article
   */
  async updateArticleStatus(orderId, lineItemId, status) {
    try {
      const result = await UnifiedApiService.production.updateArticleStatus(
        orderId, 
        lineItemId, 
        status
      )
      
      // Mettre à jour le cache local
      this.updateCache('production', result)
      
      return result
    } catch (error) {
      console.error('Erreur mise à jour statut:', error)
      throw error
    }
  }

  // === GESTION DES TRICOTEUSES ===

  /**
   * Obtenir les tricoteuses actives
   */
  getActiveTricoteuses(tricoteuses) {
    return tricoteuses?.filter(t => t.status === 'active') || []
  }

  /**
   * Calculer la charge de travail d'une tricoteuse
   */
  calculateTricoteuseWorkload(tricoteuseId, assignments) {
    const tricoteuseAssignments = assignments?.filter(a => a.tricoteuseId === tricoteuseId) || []
    
    return {
      total: tricoteuseAssignments.length,
      a_faire: tricoteuseAssignments.filter(a => a.status === 'a_faire').length,
      en_cours: tricoteuseAssignments.filter(a => a.status === 'en_cours').length,
      en_pause: tricoteuseAssignments.filter(a => a.status === 'en_pause').length,
      termine: tricoteuseAssignments.filter(a => a.status === 'termine').length
    }
  }

  // === GESTION DES DÉLAIS ===

  /**
   * Calculer la date limite pour un article
   */
  calculateDeadline(orderDate, productionType, delais) {
    if (!orderDate || !delais) return null
    
    const baseDate = new Date(orderDate)
    const delai = delais[productionType] || delais.default || 7
    
    return new Date(baseDate.getTime() + (delai * 24 * 60 * 60 * 1000))
  }

  /**
   * Calculer le nombre de jours restants
   */
  calculateDaysRemaining(deadline) {
    if (!deadline) return null
    
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays
  }

  // === GESTION DU CACHE ===

  /**
   * Obtenir des données du cache
   */
  getFromCache(key) {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }

  /**
   * Mettre des données en cache
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  /**
   * Mettre à jour le cache
   */
  updateCache(key, newData) {
    const cached = this.getFromCache(key)
    if (cached && Array.isArray(cached)) {
      const updated = [...cached, newData]
      this.setCache(key, updated)
    }
  }

  /**
   * Supprimer du cache
   */
  removeFromCache(key, itemId) {
    const cached = this.getFromCache(key)
    if (cached && Array.isArray(cached)) {
      const updated = cached.filter(item => item._id !== itemId && item.id !== itemId)
      this.setCache(key, updated)
    }
  }

  /**
   * Vider le cache
   */
  clearCache() {
    this.cache.clear()
  }

  // === SYNCHRONISATION ===

  /**
   * Synchroniser les données avec le backend
   */
  async syncData(options = {}) {
    try {
      const result = await UnifiedApiService.sync.syncOrders(options)
      
      // Vider le cache après synchronisation
      this.clearCache()
      
      return result
    } catch (error) {
      console.error('Erreur synchronisation:', error)
      throw error
    }
  }

  // === UTILITAIRES ===

  /**
   * Formater une date pour l'affichage
   */
  formatDate(date, options = {}) {
    if (!date) return ''
    
    const defaultOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }
    
    return new Date(date).toLocaleDateString('fr-FR', { ...defaultOptions, ...options })
  }

  /**
   * Calculer les statistiques globales
   */
  calculateStats(orders, assignments, tricoteuses) {
    const totalOrders = orders?.length || 0
    const totalAssignments = assignments?.length || 0
    const activeTricoteuses = this.getActiveTricoteuses(tricoteuses).length
    
    const orderStats = {
      a_faire: orders?.filter(o => this.calculateOrderStatus(o) === 'a_faire').length || 0,
      en_cours: orders?.filter(o => this.calculateOrderStatus(o) === 'en_cours').length || 0,
      termine: orders?.filter(o => this.calculateOrderStatus(o) === 'termine').length || 0
    }
    
    return {
      totalOrders,
      totalAssignments,
      activeTricoteuses,
      orderStats
    }
  }
}

export const BusinessLogicService = new BusinessLogicService()
export default BusinessLogicService
