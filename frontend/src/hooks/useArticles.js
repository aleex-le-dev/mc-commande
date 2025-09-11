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
  
  // Tick pour forcer le re-calcul après synchronisation
  const [syncTick, setSyncTick] = useState(0)
  
  // Écouter l'événement de synchronisation terminée
  useEffect(() => {
    const handleSyncCompleted = () => {
      setSyncTick(prev => prev + 1)
    }
    
    window.addEventListener('mc-sync-completed', handleSyncCompleted)
    return () => {
      window.removeEventListener('mc-sync-completed', handleSyncCompleted)
    }
  }, [])

  // Transformation des commandes en articles (responsabilité unique)
  const articles = useMemo(() => {
    // Inclure syncTick dans les dépendances pour forcer le re-calcul
    const tick = syncTick
    const ordersArray = orders?.orders || orders
    
    if (!ordersArray || !Array.isArray(ordersArray)) {
      return []
    }
    
    // Marquer que les données sont chargées
    if (ordersArray.length > 0) {
      window.mcDataLoaded = true
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
  }, [orders, assignments, tricoteuses, getAssignmentByArticleId, getTricoteuseById, externalNotesTick, syncTick])

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
    const filtered = applyFilters(articles, {
      productionType,
      status,
      searchTerm: search,
      showUrgentOnly
    })
    return filtered
  }, [articles, productionType, status, search, showUrgentOnly])

  // Pagination côté client pour les articles filtrés
  const paginatedArticles = useMemo(() => {
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    return filteredArticles.slice(startIndex, endIndex)
  }, [filteredArticles, page, limit])

  // Calcul de la pagination pour les articles filtrés
  const clientPagination = useMemo(() => {
    const totalItems = filteredArticles.length
    const totalPages = Math.ceil(totalItems / limit)
    
    return {
      total: totalItems,
      totalPages,
      pages: totalPages,
      currentPage: page,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  }, [filteredArticles.length, page, limit])

  // Statistiques des articles (responsabilité unique)
  const stats = useMemo(() => {
    // Inclure syncTick pour forcer le re-calcul des stats
    const tick = syncTick
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
  }, [articles, productionType, syncTick])

  // Articles groupés par commande (pour TerminePage)
  const groupedArticles = useMemo(() => {
    return groupArticlesByOrder(articles)
  }, [articles])

  // État de chargement global
  const isLoading = ordersLoading || assignmentsLoading || tricoteusesLoading

  return {
    // Données
    articles,
    filteredArticles: paginatedArticles, // Utiliser les articles paginés
    groupedArticles,
    stats,
    pagination: clientPagination, // Utiliser la pagination côté client
    
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
