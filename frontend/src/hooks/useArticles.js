/**
 * Hook dédié à la gestion des articles
 * Séparation claire des responsabilités
 */
import { useMemo, useEffect, useState } from 'react'
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
  // Récupérer TOUS les articles sans filtrage côté serveur
  const { 
    orders, 
    pagination, 
    stats: serverStats,
    loading: ordersLoading, 
    error: ordersError 
  } = useOrders({
    page: 1,
    limit: 5000, // Récupérer beaucoup d'articles
    status: 'all', // Pas de filtre côté serveur
    search: '', // Pas de filtre côté serveur
    sortBy,
    sortOrder,
    productionType: 'all' // Pas de filtre côté serveur
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

  // Tick local pour re-calculer les articles quand on récupère des notes externes
  const [externalNotesTick, setExternalNotesTick] = useState(0)

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
      // Debug ciblé désactivé
      
      if (Array.isArray(orderItems)) {
        orderItems.forEach(item => {
          // Récupérer les données liées
          const articleId = item.line_item_id || item.id
          const assignment = getAssignmentByArticleId(articleId)
          const tricoteuse = assignment ? getTricoteuseById(assignment.tricoteuse_id) : null
          
          // Transformer l'item en article enrichi
          // Inject per-order ids to compute x/y in transform
          const itemWithMeta = { ...item, _all_order_line_item_ids: allIds }
          // Injecter note depuis cache externe si disponible
          let injectedOrder = order
          try {
            const cachedNote = (typeof window !== 'undefined' && window.__mcOrderNotes) ? window.__mcOrderNotes[order.order_id] : null
            if (typeof cachedNote === 'string' && cachedNote.trim().length > 0) {
              injectedOrder = { ...order, order_customer_note: cachedNote }
            }
          } catch {}
          const article = transformItemToArticle(itemWithMeta, injectedOrder, assignment, tricoteuse)
          // Debug ciblé désactivé
          allArticles.push(article)
        })
      }
    })
    
    return allArticles
  }, [orders, assignments, tricoteuses, getAssignmentByArticleId, getTricoteuseById, externalNotesTick])

  // Récupérer les notes manquantes directement depuis WooCommerce si possible
  useEffect(() => {
    const run = async () => {
      try {
        const ordersArray = orders?.orders || orders
        if (!ordersArray || !Array.isArray(ordersArray)) return
        if (typeof window === 'undefined') return
        if (!window.__mcOrderNotes) window.__mcOrderNotes = {}
        // Si on a ajouté des notes, forcer un recalcul
        setExternalNotesTick(t => t + 1)
      } catch {}
    }
    run()
  }, [orders])

  // Filtrage des articles (responsabilité unique)
  const filteredArticles = useMemo(() => {
    console.log('Filtrage articles:', { productionType, status, search, showUrgentOnly, articlesCount: articles.length })
    const filtered = applyFilters(articles, {
      productionType,
      status,
      searchTerm: search,
      showUrgentOnly
    })
    console.log('Articles filtrés:', filtered.length)
    return filtered
  }, [articles, productionType, status, search, showUrgentOnly])

  // Statistiques des articles (responsabilité unique)
  const stats = useMemo(() => {
    // Calculer les stats sur les articles du type de production pour TOUS les compteurs
    const productionTypeArticles = productionType === 'all' ? articles : articles.filter(a => a.productionType === productionType)
    const productionStats = calculateArticleStats(productionTypeArticles)
    
    return {
      total: productionStats.total, // Total pour le type de production (maille/couture)
      a_faire: productionStats.a_faire, // Toujours le total pour ce statut
      en_cours: productionStats.en_cours, // Toujours le total pour ce statut
      en_pause: productionStats.en_pause, // Toujours le total pour ce statut
      termine: productionStats.termine, // Toujours le total pour ce statut
      urgent: productionStats.urgent // Toujours le total pour ce statut
    }
  }, [articles, productionType])

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
