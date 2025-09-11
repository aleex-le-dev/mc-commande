/**
 * Hook dédié à la gestion des articles
 * Séparation claire des responsabilités
 */
import { useMemo } from 'react'
import { useOrders } from './useOrders'
import { useAssignments } from './useAssignments'
import { useTricoteuses } from './useTricoteuses'
import {
  transformItemToArticle,
  applyFilters,
  calculateArticleStats,
  groupArticlesByOrder
} from '../services/articleTransformationService'

/**
 * Hook pour gérer les articles avec séparation des responsabilités
 * @param {Object} options - Options de configuration
 * @returns {Object} Données et fonctions des articles
 */
export const useArticles = (options = {}) => {
  const {
    page = 1,
    limit = 15,
    status = 'all',
    search = '',
    sortBy = 'order_date',
    sortOrder = 'desc',
    productionType = 'all',
    showUrgentOnly = false
  } = options

  // Hooks séparés pour chaque responsabilité
  const { 
    orders, 
    pagination, 
    stats: serverStats,
    loading: ordersLoading, 
    error: ordersError 
  } = useOrders({
    page,
    limit,
    status,
    search,
    sortBy,
    sortOrder,
    productionType // Ajouter le type de production dans la requête
  })
  
  const { 
    assignments, 
    loading: assignmentsLoading,
    getAssignmentByArticleId
  } = useAssignments()
  
  const { 
    tricoteuses, 
    loading: tricoteusesLoading,
    getTricoteuseById 
  } = useTricoteuses()

  // Transformation des commandes en articles (responsabilité unique)
  const articles = useMemo(() => {
    const ordersArray = orders?.orders || orders
    
    if (!ordersArray || !Array.isArray(ordersArray)) {
      return []
    }
    
    const allArticles = []
    
    ordersArray.forEach(order => {
      const orderItems = order.items || order.line_items || []
      const allIds = (order.all_line_item_ids || []).filter(id => typeof id !== 'undefined' && id !== null)
      
      if (Array.isArray(orderItems)) {
        orderItems.forEach(item => {
          // Récupérer les données liées
          const articleId = item.line_item_id || item.id
          const assignment = getAssignmentByArticleId(articleId)
          const tricoteuse = assignment ? getTricoteuseById(assignment.tricoteuse_id) : null
          
          // Transformer l'item en article enrichi
          // Inject per-order ids to compute x/y in transform
          const itemWithMeta = { ...item, _all_order_line_item_ids: allIds }
          const article = transformItemToArticle(itemWithMeta, order, assignment, tricoteuse)
          allArticles.push(article)
        })
      }
    })
    
    return allArticles
  }, [orders, assignments, tricoteuses, getAssignmentByArticleId, getTricoteuseById])

  // Filtrage des articles (responsabilité unique)
  // Note: Le filtrage par productionType est maintenant géré côté serveur
  const filteredArticles = useMemo(() => {
    return applyFilters(articles, {
      productionType: 'all', // Désactivé car géré côté serveur
      status: 'all', // Désactivé car géré côté serveur
      searchTerm: '', // Désactivé car géré côté serveur
      showUrgentOnly
    })
  }, [articles, showUrgentOnly])

  // Statistiques des articles (responsabilité unique)
  const stats = useMemo(() => {
    // Utiliser d'abord les stats serveur (sur l'ensemble), fallback sur calcul local
    if (serverStats && typeof serverStats === 'object') {
      return {
        total: serverStats.total ?? articles.length,
        a_faire: serverStats.a_faire ?? 0,
        en_cours: serverStats.en_cours ?? 0,
        en_pause: serverStats.en_pause ?? 0,
        termine: serverStats.termine ?? 0,
        urgent: serverStats.urgent ?? 0
      }
    }
    return calculateArticleStats(articles)
  }, [articles, serverStats])

  // Articles groupés par commande (pour TerminePage)
  const groupedArticles = useMemo(() => {
    return groupArticlesByOrder(articles)
  }, [articles])

  // État de chargement global
  const isLoading = ordersLoading || assignmentsLoading || tricoteusesLoading

  return {
    // Données
    articles,
    filteredArticles,
    groupedArticles,
    stats,
    pagination,
    
    // État
    isLoading,
    error: ordersError,
    
    // Fonctions utilitaires
    getArticleById: (articleId) => articles.find(a => a.article_id === articleId),
    getArticlesByOrder: (orderNumber) => groupedArticles[orderNumber]?.articles || [],
    getArticlesByStatus: (status) => articles.filter(a => a.status === status),
    getUrgentArticles: () => articles.filter(a => a.urgent)
  }
}
