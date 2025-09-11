/**
 * Hook pour la logique métier unifiée
 * Expose toutes les fonctions métier de manière cohérente
 */
import { useState, useEffect, useCallback } from 'react'
import { BusinessLogicService } from '../services/businessLogicService.js'
import { useUnifiedData } from './useUnifiedData.js'

export const useBusinessLogic = () => {
  const { 
    tricoteuses, 
    assignments, 
    orders, 
    production, 
    loading, 
    errors, 
    isOffline,
    loadData,
    refresh
  } = useUnifiedData()

  const [delais, setDelais] = useState({})
  const [stats, setStats] = useState({})

  // Charger les délais
  useEffect(() => {
    const loadDelais = async () => {
      try {
        // Simuler le chargement des délais (à adapter selon votre API)
        const defaultDelais = {
          couture: 7,
          maille: 5,
          fourniture: 3,
          default: 7
        }
        setDelais(defaultDelais)
      } catch (error) {
        console.error('Erreur chargement délais:', error)
      }
    }

    loadDelais()
  }, [])

  // Calculer les statistiques
  useEffect(() => {
    const newStats = BusinessLogicService.calculateStats(orders, assignments, tricoteuses)
    setStats(newStats)
  }, [orders, assignments, tricoteuses])

  // === GESTION DES COMMANDES ===

  const getOrderStatus = useCallback((order) => {
    return BusinessLogicService.calculateOrderStatus(order)
  }, [])

  const getOrderPriority = useCallback((order) => {
    return BusinessLogicService.calculateOrderPriority(order)
  }, [])

  const isOrderLate = useCallback((order) => {
    return BusinessLogicService.isOrderLate(order, delais)
  }, [delais])

  const getOrderDeadline = useCallback((order) => {
    if (!order?.order_date) return null
    return BusinessLogicService.calculateDeadline(order.order_date, order.production_type, delais)
  }, [delais])

  const getDaysRemaining = useCallback((deadline) => {
    return BusinessLogicService.calculateDaysRemaining(deadline)
  }, [])

  // === GESTION DES ASSIGNATIONS ===

  const assignArticle = useCallback(async (articleId, tricoteuseId, metadata = {}) => {
    try {
      const result = await BusinessLogicService.assignArticle(articleId, tricoteuseId, metadata)
      await refresh() // Rafraîchir les données
      return result
    } catch (error) {
      console.error('Erreur assignation:', error)
      throw error
    }
  }, [refresh])

  const unassignArticle = useCallback(async (assignmentId) => {
    try {
      await BusinessLogicService.unassignArticle(assignmentId)
      await refresh() // Rafraîchir les données
    } catch (error) {
      console.error('Erreur désassignation:', error)
      throw error
    }
  }, [refresh])

  const updateArticleStatus = useCallback(async (orderId, lineItemId, status) => {
    try {
      const result = await BusinessLogicService.updateArticleStatus(orderId, lineItemId, status)
      await refresh() // Rafraîchir les données
      return result
    } catch (error) {
      console.error('Erreur mise à jour statut:', error)
      throw error
    }
  }, [refresh])

  // === GESTION DES TRICOTEUSES ===

  const getActiveTricoteuses = useCallback(() => {
    return BusinessLogicService.getActiveTricoteuses(tricoteuses)
  }, [tricoteuses])

  const getTricoteuseWorkload = useCallback((tricoteuseId) => {
    return BusinessLogicService.calculateTricoteuseWorkload(tricoteuseId, assignments)
  }, [assignments])

  // === GESTION DES DÉLAIS ===

  const getDeadline = useCallback((orderDate, productionType) => {
    return BusinessLogicService.calculateDeadline(orderDate, productionType, delais)
  }, [delais])

  const getDaysUntilDeadline = useCallback((deadline) => {
    return BusinessLogicService.calculateDaysRemaining(deadline)
  }, [])

  // === UTILITAIRES ===

  const formatDate = useCallback((date, options = {}) => {
    return BusinessLogicService.formatDate(date, options)
  }, [])

  const syncData = useCallback(async (options = {}) => {
    try {
      const result = await BusinessLogicService.syncData(options)
      await refresh() // Rafraîchir après synchronisation
      return result
    } catch (error) {
      console.error('Erreur synchronisation:', error)
      throw error
    }
  }, [refresh])

  // === FILTRES ET RECHERCHE ===

  const getOrdersByStatus = useCallback((status) => {
    return orders?.filter(order => getOrderStatus(order) === status) || []
  }, [orders, getOrderStatus])

  const getOrdersByPriority = useCallback((priority) => {
    return orders?.filter(order => getOrderPriority(order) === priority) || []
  }, [orders, getOrderPriority])

  const getLateOrders = useCallback(() => {
    return orders?.filter(order => isOrderLate(order)) || []
  }, [orders, isOrderLate])

  const getAssignmentsByTricoteuse = useCallback((tricoteuseId) => {
    return assignments?.filter(assignment => assignment.tricoteuseId === tricoteuseId) || []
  }, [assignments])

  const getAssignmentsByStatus = useCallback((status) => {
    return assignments?.filter(assignment => assignment.status === status) || []
  }, [assignments])

  return {
    // Données
    tricoteuses,
    assignments,
    orders,
    production,
    delais,
    stats,
    
    // États
    loading,
    errors,
    isOffline,
    
    // Actions de base
    loadData,
    refresh,
    syncData,
    
    // Gestion des commandes
    getOrderStatus,
    getOrderPriority,
    isOrderLate,
    getOrderDeadline,
    getDaysRemaining,
    getOrdersByStatus,
    getOrdersByPriority,
    getLateOrders,
    
    // Gestion des assignations
    assignArticle,
    unassignArticle,
    updateArticleStatus,
    getAssignmentsByTricoteuse,
    getAssignmentsByStatus,
    
    // Gestion des tricoteuses
    getActiveTricoteuses,
    getTricoteuseWorkload,
    
    // Gestion des délais
    getDeadline,
    getDaysUntilDeadline,
    
    // Utilitaires
    formatDate
  }
}
