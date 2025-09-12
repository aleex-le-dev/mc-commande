/**
 * Service dédié à la transformation des données
 * Séparation claire des responsabilités : Orders, Assignments, Tricoteuses
 */

/**
 * Transforme un item de commande en article enrichi
 * @param {Object} item - Item de commande
 * @param {Object} order - Commande parente
 * @param {Object} assignment - Assignation (optionnelle)
 * @param {Object} tricoteuse - Tricoteuse assignée (optionnelle)
 * @returns {Object} Article enrichi
 */
export const transformItemToArticle = (item, order, assignment = null, tricoteuse = null) => {
  const articleId = item.line_item_id || item.id
  
  // Extraire une note depuis un tableau de meta_data (order ou item)
  const extractNoteFromMeta = (meta) => {
    if (!Array.isArray(meta)) return null
    const candidates = meta.filter(m => {
      const k = String(m?.key || '').toLowerCase()
      return k.includes('note') || k.includes('customer_note') || k.includes('order_note')
    })
    for (const cand of candidates) {
      const val = (typeof cand?.value === 'string') ? cand.value.trim() : null
      if (val && val.length > 0) return val
    }
    return null
  }
  
  const orderLevelMetaNote = extractNoteFromMeta(order?.meta_data)
  const itemLevelMetaNote = extractNoteFromMeta(item?.meta_data)
  
  return {
    ...item,
    article_id: articleId,
    orderNumber: order.order_number || order.order_id,
    orderId: order.order_id,
    orderDate: order.order_date,
    customer: order.customer_name || order.customer || null,
    customerEmail: order.customer_email || null,
    customerPhone: order.customer_phone || null,
    customerAddress: order.customer_address || null,
    // Note client: prioriser les notes d'articles depuis production_status
    customerNote: (
      (typeof item?.production_status?.notes === 'string' && item.production_status.notes.trim().length > 0 ? item.production_status.notes : null) ||
      (typeof order?.customer_note === 'string' && order.customer_note.trim().length > 0 ? order.customer_note : null) ||
      (typeof order?.order_customer_note === 'string' && order.order_customer_note.trim().length > 0 ? order.order_customer_note : null) ||
      (typeof item?.order_customer_note === 'string' && item.order_customer_note.trim().length > 0 ? item.order_customer_note : null) ||
      orderLevelMetaNote ||
      itemLevelMetaNote
    ),
    shippingMethod: order.shipping_title || order.shipping_method_title || order.shipping_method || 'Livraison gratuite',
    shippingCarrier: order.shipping_carrier || null,
    customerCountry: order.customer_country || null,
    status: item.production_status?.status || item.status || 'a_faire',
    productionType: item.production_status?.production_type || item.production_type || 'couture',
    assignedTo: tricoteuse?.firstName || assignment?.tricoteuse_name || null,
    tricoteuse_photo: tricoteuse?.photoUrl || assignment?.tricoteuse_photo || null,
    tricoteuse_color: tricoteuse?.color || assignment?.tricoteuse_color || null,
    urgent: assignment?.urgent || item.production_status?.urgent || false,
    assignmentId: assignment?._id || null,
    tricoteuseId: assignment?.tricoteuse_id || null,
    // placeholders; computed using _all_order_line_item_ids if provided
    orderItemPosition: (() => {
      const ids = item._all_order_line_item_ids
      if (Array.isArray(ids) && ids.length > 0) {
        const sorted = [...new Set(ids)].sort((a, b) => (a || 0) - (b || 0))
        const idx = sorted.indexOf(item.line_item_id)
        return idx >= 0 ? idx + 1 : null
      }
      return null
    })(),
    orderItemsTotal: (() => {
      const ids = item._all_order_line_item_ids
      if (Array.isArray(ids) && ids.length > 0) {
        return [...new Set(ids)].length
      }
      return null
    })()
  }
}

/**
 * Filtre les articles par type de production
 * @param {Array} articles - Liste des articles
 * @param {string} productionType - Type de production ('maille' ou 'couture')
 * @returns {Array} Articles filtrés
 */
export const filterArticlesByProductionType = (articles, productionType) => {
  if (!productionType || productionType === 'all') {
    return articles
  }
  
  return articles.filter(article => 
    article.productionType === productionType
  )
}

/**
 * Filtre les articles par statut
 * @param {Array} articles - Liste des articles
 * @param {string} status - Statut ('a_faire', 'en_cours', 'termine', etc.)
 * @returns {Array} Articles filtrés
 */
export const filterArticlesByStatus = (articles, status) => {
  if (!status || status === 'all') {
    return articles
  }
  
  return articles.filter(article => article.status === status)
}

/**
 * Filtre les articles urgents
 * @param {Array} articles - Liste des articles
 * @returns {Array} Articles urgents
 */
export const filterUrgentArticles = (articles) => {
  return articles.filter(article => article.urgent === true)
}

/**
 * Filtre les articles par terme de recherche
 * @param {Array} articles - Liste des articles
 * @param {string} searchTerm - Terme de recherche
 * @returns {Array} Articles filtrés
 */
export const filterArticlesBySearch = (articles, searchTerm) => {
  if (!searchTerm || searchTerm.trim() === '') {
    return articles
  }
  
  const term = searchTerm.toLowerCase().trim()
  
  return articles.filter(article => 
    `${article.orderNumber}`.toLowerCase().includes(term) ||
    (article.customer || '').toLowerCase().includes(term) ||
    (article.product_name || '').toLowerCase().includes(term)
  )
}

/**
 * Applique tous les filtres aux articles
 * @param {Array} articles - Liste des articles
 * @param {Object} filters - Objet contenant les filtres
 * @returns {Array} Articles filtrés
 */
export const applyFilters = (articles, filters = {}) => {
  let filtered = [...articles]
  
  // Filtre urgent prioritaire
  if (filters.showUrgentOnly) {
    filtered = filterUrgentArticles(filtered)
  } else {
    // Filtrage par statut
    if (filters.status && filters.status !== 'all') {
      filtered = filterArticlesByStatus(filtered, filters.status)
    }
  }
  
  // Filtrage par type de production
  if (filters.productionType && filters.productionType !== 'all') {
    filtered = filterArticlesByProductionType(filtered, filters.productionType)
  }
  
  // Filtrage par recherche
  if (filters.searchTerm) {
    filtered = filterArticlesBySearch(filtered, filters.searchTerm)
  }
  
  return filtered
}

/**
 * Calcule les statistiques des articles
 * @param {Array} articles - Liste des articles
 * @returns {Object} Statistiques
 */
export const calculateArticleStats = (articles) => {
  const stats = {
    total: articles.length,
    a_faire: 0,
    en_cours: 0,
    en_pause: 0,
    termine: 0,
    urgent: 0
  }
  
  articles.forEach(article => {
    if (stats[article.status] !== undefined) {
      stats[article.status] += 1
    }
    if (article.urgent) {
      stats.urgent += 1
    }
  })
  
  return stats
}

/**
 * Groupe les articles par commande
 * @param {Array} articles - Liste des articles
 * @returns {Object} Articles groupés par numéro de commande
 */
export const groupArticlesByOrder = (articles) => {
  const grouped = {}
  
  articles.forEach(article => {
    const orderNumber = article.orderNumber
    if (!grouped[orderNumber]) {
      grouped[orderNumber] = {
        order: {
          order_number: orderNumber,
          order_id: article.orderId,
          order_date: article.orderDate,
          customer_name: article.customer,
          customer_email: article.customerEmail,
          customer_phone: article.customerPhone,
          customer_address: article.customerAddress,
          customer_note: article.customerNote,
          shipping_title: article.shippingMethod,
          shipping_carrier: article.shippingCarrier,
          customer_country: article.customerCountry
        },
        articles: []
      }
    }
    grouped[orderNumber].articles.push(article)
  })
  
  // After grouping, fallback: if not set yet, assign position across ALL types
  Object.values(grouped).forEach(group => {
    const uniqueIds = Array.from(new Set(group.articles.map(a => a.line_item_id))).sort((a, b) => (a || 0) - (b || 0))
    const total = uniqueIds.length
    group.articles.forEach(art => {
      if (!art.orderItemPosition || !art.orderItemsTotal) {
        const pos = uniqueIds.indexOf(art.line_item_id)
        art.orderItemPosition = (pos >= 0 ? pos + 1 : 1)
        art.orderItemsTotal = total
      }
    })
  })
  
  return grouped
}
