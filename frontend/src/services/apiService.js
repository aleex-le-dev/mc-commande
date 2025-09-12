/**
 * Service API principal
 * Orchestre tous les services spécialisés
 */
import OrdersService from './orders/ordersService.js'
import ProductionStatusService from './production/productionStatusService.js'
import TricoteusesService from './tricoteuses/tricoteusesService.js'
import AssignmentsService from './assignments/assignmentsService.js'
import SyncService from './sync/syncService.js'
import ProductsService from './products/productsService.js'
import HttpClientService from './http/httpClientService.js'
import { HttpCacheService } from './cache/httpCacheService.js'

/**
 * Service API principal qui expose tous les services spécialisés
 */
export const ApiService = {
  // Services spécialisés
  orders: OrdersService,
  production: ProductionStatusService,
  tricoteuses: TricoteusesService,
  assignments: AssignmentsService,
  sync: SyncService,
  products: ProductsService,
  fournitures: {
    async list() {
      const res = await HttpClientService.get('/fournitures')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return data.data || []
    },
    async create(label, qty) {
      const res = await HttpClientService.post('/fournitures', { label, qty })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()).data
    },
    async update(id, patch) {
      const res = await HttpClientService.put(`/fournitures/${id}`, patch)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()).data
    },
    async remove(id) {
      const res = await HttpClientService.delete(`/fournitures/${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return true
    }
  },
  
  // Services utilitaires
  http: HttpClientService,
  cache: HttpCacheService,
  
  // Méthodes de convenance pour la compatibilité
  async getProductionStatuses() {
    return ProductionStatusService.getProductionStatuses()
  },
  
  async updateArticleStatus(orderId, lineItemId, status, notes = null) {
    return ProductionStatusService.updateArticleStatus(orderId, lineItemId, status, notes)
  },
  
  async setArticleUrgent(orderId, lineItemId, urgent) {
    return ProductionStatusService.setArticleUrgent(orderId, lineItemId, urgent)
  },
  
  async dispatchToProduction(orderId, lineItemId, productionType, assignedTo = null) {
    return ProductionStatusService.dispatchToProduction(orderId, lineItemId, productionType, assignedTo)
  },
  
  async syncOrders(optionsOrOrders = []) {
    return SyncService.syncOrders(optionsOrOrders)
  },
  
  async getOrdersPaginated(page = 1, limit = 50, type = 'all', search = '') {
    return OrdersService.getOrdersPaginated(page, limit, type, search)
  },
  
  async getOrdersFromDatabase() {
    return OrdersService.getOrdersFromDatabase()
  },
  
  async getOrdersByProductionType(productionType) {
    return OrdersService.getOrdersByProductionType(productionType)
  },
  
  async getProductionStats() {
    return ProductionStatusService.getProductionStats()
  },
  
  async getProductPermalink(productId) {
    return ProductsService.getProductPermalink(productId)
  },
  
  async getProductPermalinksBatch(productIds) {
    return ProductsService.getProductPermalinksBatch(productIds)
  },
  
  async getSyncLogs() {
    return SyncService.getSyncLogs()
  },
  
  async clearSyncLogs() {
    return SyncService.clearSyncLogs()
  },
  
  async testConnection() {
    return HttpClientService.testConnection()
  },
  
  async testSync() {
    return SyncService.testSync()
  },
  
  async getOrderByNumber(orderNumber) {
    return OrdersService.getOrderByNumber(orderNumber)
  },
  
  async updateOrderNote(orderId, note) {
    return OrdersService.updateOrderNote(orderId, note)
  },
  
  async updateOrderStatus(orderId, newStatus) {
    return OrdersService.updateOrderStatus(orderId, newStatus)
  },
  
  async deleteOrderCompletely(orderId) {
    return OrdersService.deleteOrderCompletely(orderId)
  },
  
  async getArchivedOrders(page = 1, limit = 100) {
    return OrdersService.getArchivedOrders(page, limit)
  },
  
  // Services pour la compatibilité avec l'ancien code
  tricoteusesService: TricoteusesService,
  assignmentsService: AssignmentsService,
  
  async prefetchAppData() {
    return SyncService.prefetchAppData()
  },
  
  // Méthode getOrders pour compatibilité
  async getOrders(options = {}) {
    return OrdersService.getOrders(options)
  }
}

export default ApiService
