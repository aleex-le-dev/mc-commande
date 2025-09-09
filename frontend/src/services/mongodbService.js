// Service pour l'API MongoDB
// En dev: backend local; en prod: Render ou VITE_API_URL
const API_BASE_URL = `${(import.meta.env.DEV ? 'http://localhost:3001' : (import.meta.env.VITE_API_URL || 'https://maisoncleo-commande.onrender.com'))}/api`

// Limiteur optimisé + retry/backoff pour réduire les erreurs réseau
let concurrentRequests = 0
const MAX_CONCURRENT = 12  // Augmenté pour plus de parallélisme
const waitQueue = []

const acquireSlot = () => new Promise((resolve) => {
  if (concurrentRequests < MAX_CONCURRENT) {
    concurrentRequests += 1
    resolve()
  } else {
    waitQueue.push(resolve)
  }
})

const releaseSlot = () => {
  concurrentRequests = Math.max(0, concurrentRequests - 1)
  const next = waitQueue.shift()
  if (next) {
    concurrentRequests += 1
    next()
  }
}

// Cache mémoire global avec TTL pour données partagées
const GLOBAL_CACHE_TTL_MS = import.meta.env.DEV ? 5 * 60 * 1000 : 10 * 60 * 1000 // 5min dev, 10min prod
const globalCache = {
  tricoteuses: { data: null, at: 0 },
  assignments: { data: null, at: 0 },
  orders: { data: null, at: 0 }
}

function cacheGet(key) {
  const entry = globalCache[key]
  if (!entry) return null
  if (Date.now() - entry.at > GLOBAL_CACHE_TTL_MS) return null
  return entry.data
}

function cacheSet(key, data) {
  globalCache[key] = { data, at: Date.now() }
}

function cacheDelete(key) {
  globalCache[key] = { data: null, at: 0 }
}

// Cache persistant pour les données critiques en production
function persistentCacheGet(key) {
  if (import.meta.env.DEV) return null
  try {
    const cached = localStorage.getItem(`mc_${key}`)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed && Date.now() - parsed.timestamp < GLOBAL_CACHE_TTL_MS) {
        return parsed.data
      }
    }
  } catch (e) {
    // Ignorer les erreurs de localStorage
  }
  return null
}

function persistentCacheSet(key, data) {
  if (import.meta.env.DEV) return
  try {
    localStorage.setItem(`mc_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  } catch (e) {
    // Ignorer les erreurs de localStorage
  }
}



async function requestWithRetry(url, options = {}, retries = 0) {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, options.timeoutMs || (import.meta.env.DEV ? 15000 : 5000)) // 15s local, 5s prod
  
  try {
    await acquireSlot()
    const res = await fetch(url, { 
      // Toujours envoyer le cookie d'auth httpOnly
      credentials: 'include',
      // Activer CORS explicite
      mode: 'cors',
      ...options, 
      signal: controller.signal 
    })
    if (!res.ok) {
      if (retries > 0 && (res.status >= 500 || res.status === 429 || res.status === 502)) {
        // Backoff exponentiel avec jitter pour les erreurs serveur
        const delay = Math.min(1000 * Math.pow(2, 2 - retries) + Math.random() * 1000, 5000)
        console.warn(`Erreur ${res.status} - retry dans ${delay}ms`)
        await new Promise(r => setTimeout(r, delay))
        return requestWithRetry(url, options, retries - 1)
      }
      // Pour les erreurs 502, essayer de retourner des données du cache
      if (res.status === 502) {
        throw new Error('Service temporairement indisponible (502)')
      }
    }
    return res
  } catch (e) {
    if (e && e.name === 'AbortError') {
      // Ne pas relancer les requêtes annulées
      throw e
    }
    if (retries > 0) {
      // Backoff exponentiel avec jitter pour les erreurs réseau
      const delay = Math.min(1000 * Math.pow(2, 2 - retries) + Math.random() * 1000, 5000)
      await new Promise(r => setTimeout(r, delay))
      return requestWithRetry(url, options, retries - 1)
    }
    throw e
  } finally {
    clearTimeout(timeout)
    releaseSlot()
  }
}

// Récupérer tous les statuts de production
export const getProductionStatuses = async () => {
  try {
    const response = await requestWithRetry(`${API_BASE_URL}/production-status`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data.statuses || []
    } catch (error) {
    // Erreur silencieuse lors de la récupération des statuts
    return []
  }
}

// Mettre à jour le statut d'un article (mise à jour immédiate en BDD)
export const updateArticleStatus = async (orderId, lineItemId, status, notes = null) => {
  try {
    const response = await requestWithRetry(`${API_BASE_URL}/production/status`, {
      method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id: orderId,
        line_item_id: lineItemId,
        status,
        notes
      })
      })

      if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
    
    // Invalider le cache pour forcer le rechargement
    cacheDelete('orders')
    cacheDelete('assignments')
    
    // Déclencher un événement pour forcer le rechargement des données
    window.dispatchEvent(new CustomEvent('mc-data-updated', {
      detail: { orderId, lineItemId, status }
    }))
    
    // Déclencher un événement pour forcer le rechargement des assignations
    window.dispatchEvent(new CustomEvent('mc-assignments-updated'))
    
    return data
    } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error)
    throw error
  }
}

// Mettre à jour l'urgence d'un article sans passer par les assignations
export const setArticleUrgent = async (orderId, lineItemId, urgent) => {
  try {
    const response = await requestWithRetry(`${API_BASE_URL}/production/urgent`, {
      method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id: orderId,
        line_item_id: lineItemId,
        urgent: Boolean(urgent)
      })
      })

      if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

    // Invalider le cache pour forcer le rechargement
    cacheDelete('orders')
    cacheDelete('assignments')

    // Déclencher un événement pour re-tri urgent
    window.dispatchEvent(new Event('mc-mark-urgent'))

    return data
    } catch (error) {
    return { success: false }
  }
}

// Dispatcher un article vers la production
export const dispatchToProduction = async (orderId, lineItemId, productionType, assignedTo = null) => {
  try {
    const response = await requestWithRetry(`${API_BASE_URL}/production/dispatch`, {
      method: 'POST',
        headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id: orderId,
        line_item_id: lineItemId,
        production_type: productionType,
        assigned_to: assignedTo
      })
      })

      if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
    return data
    } catch (error) {
    // Erreur silencieuse lors du dispatch vers la production
    throw error
  }
}

// Synchroniser les commandes avec la base de données
export const syncOrders = async (optionsOrOrders = []) => {
  try {
    // Construire le corps de requête de façon rétrocompatible
    let bodyPayload
    if (Array.isArray(optionsOrOrders)) {
      // Ancien usage: tableau d'ordres fourni
      bodyPayload = { orders: optionsOrOrders }
    } else if (optionsOrOrders && typeof optionsOrOrders === 'object') {
      // Nouvel usage: options (ex: { since: '2025-09-01T00:00:00.000Z' })
      bodyPayload = { ...optionsOrOrders }
    } else {
      bodyPayload = {}
    }

    // Appeler le backend qui se chargera de récupérer les données WooCommerce
    const response = await requestWithRetry(`${API_BASE_URL}/sync/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      body: JSON.stringify(bodyPayload)
      })

      if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
      }

    const data = await response.json()
    return data
    } catch (error) {
    // Erreur silencieuse lors de la synchronisation des commandes
      throw error
    }
  }

// Récupérer les commandes avec pagination côté serveur (ULTRA-RAPIDE)
export const getOrdersPaginated = async (page = 1, limit = 50, type = 'all', search = '') => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      type: type,
      search: search
    })
    
    const response = await requestWithRetry(`${API_BASE_URL}/orders/paginated?${params}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Erreur pagination:', error)
    return { orders: [], pagination: { page: 1, limit: 50, total: 0, pages: 1 } }
  }
}

// Récupérer toutes les commandes depuis la base de données avec synchronisation automatique
export const getOrdersFromDatabase = async () => {
  try {
    // Vérifier le cache d'abord (sauf si bypass demandé)
    try {
      if (!(typeof window !== 'undefined' && window && window.mcBypassOrdersCache === true)) {
        const cached = cacheGet('orders')
        if (cached) {
          return cached
        }
      }
    } catch {}

    // Récupérer toutes les commandes depuis la BDD (sans lancer de synchronisation)
    const response = await requestWithRetry(`${API_BASE_URL}/orders`, {
      timeoutMs: 15000 // 15 secondes optimisé
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    const orders = data.orders || []
    
    // Mettre en cache
    cacheSet('orders', orders)
    try { if (typeof window !== 'undefined' && window) window.mcBypassOrdersCache = false } catch {}
    return orders
  } catch (error) {
    if (error.name === 'AbortError') {
      // Ne pas retourner de tableau vide, laisser React Query gérer
      throw error
    }
    return []
  }
}

// Récupérer les commandes par type de production
export const getOrdersByProductionType = async (productionType) => {
  try {
    const response = await requestWithRetry(`${API_BASE_URL}/orders/production/${productionType}`, {
      timeoutMs: 15000 // 15 secondes optimisés
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return data.orders || []
  } catch (error) {
    if (error.name === 'AbortError') {
      // Ne pas retourner de tableau vide, laisser React Query gérer
      throw error
    }
    return []
  }
}

// Récupérer les statistiques de production
export const getProductionStats = async () => {
  try {
    // Utiliser désormais les statistiques basées sur les archives
    const response = await requestWithRetry(`${API_BASE_URL}/archived-orders/stats`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data.stats || {}
  } catch (error) {
    // Erreur silencieuse lors de la récupération des statistiques
    return {}
  }
}

// Récupérer le permalink d'un produit via le backend
export const getProductPermalink = async (productId) => {
  try {
    const response = await requestWithRetry(`${API_BASE_URL}/woocommerce/products/${productId}/permalink`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data.permalink
  } catch (error) {
    // Erreur silencieuse lors de la récupération du permalink
    return null
  }
}

// Récupérer les permalinks de plusieurs produits en lot
export const getProductPermalinksBatch = async (productIds) => {
  try {
    const response = await requestWithRetry(`${API_BASE_URL}/woocommerce/products/permalink/batch`, {
      method: 'POST',
        headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productIds })
      })

      if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
    return data
  } catch (error) {
    // Erreur silencieuse lors de la récupération des permalinks en lot
    return { results: [], errors: [] }
  }
}

// Récupérer le dernier log de synchronisation
export const getSyncLogs = async () => {
  try {
    const response = await requestWithRetry(`${API_BASE_URL}/sync/logs`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data
    } catch (error) {
    // Erreur silencieuse lors de la récupération des logs
      return { log: null, hasLog: false }
    }
  }

// Vider le log de synchronisation
export const clearSyncLogs = async () => {
  try {
    const response = await requestWithRetry(`${API_BASE_URL}/sync/logs/clear`, {
      method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
    return data.success
    } catch (error) {
    // Erreur silencieuse lors du vidage des logs
    return false
  }
}

// Test de connexion à la base de données
export const testConnection = async () => {
  try {
    const response = await requestWithRetry(`${API_BASE_URL}/test/connection`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Test de synchronisation
export const testSync = async () => {
  try {
    const response = await requestWithRetry(`${API_BASE_URL}/test/sync`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Récupérer une commande par numéro
export const getOrderByNumber = async (orderNumber) => {
  try {
    const response = await requestWithRetry(`${API_BASE_URL}/orders/search/${orderNumber}`)
    if (!response.ok) {
      if (response.status === 404) {
        return null // Commande non trouvée
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data.order
  } catch (error) {
    throw new Error(`Erreur lors de la récupération: ${error.message}`)
  }
}

// Mettre à jour la note client d'une commande
export const updateOrderNote = async (orderId, note) => {
  try {
    const response = await requestWithRetry(`${API_BASE_URL}/orders/${orderId}/note`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note })
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data.success === true
  } catch (error) {
    return false
  }
}

// Mettre à jour le statut d'une commande
export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    throw new Error(`Erreur lors de la mise à jour: ${error.message}`)
  }
}

// Supprimer entièrement une commande (et ses éléments/statuts) par orderId
export const deleteOrderCompletely = async (orderId) => {
  try {
    // Archiver d'abord
    try {
      await requestWithRetry(`${API_BASE_URL}/orders/${orderId}/archive`, { method: 'POST' })
    } catch (e) {
      // on continue même si l'archive échoue
    }
    const response = await requestWithRetry(`${API_BASE_URL}/orders/${orderId}`, {
      method: 'DELETE'
    })
    if (!response) throw new Error('Aucune réponse')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    // Invalider caches
    cacheDelete('orders')
    cacheDelete('assignments')
    // Notifier le front
    try { window.dispatchEvent(new Event('mc-data-updated')) } catch {}
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Lister les commandes archivées (résumé)
export const getArchivedOrders = async (page = 1, limit = 100) => {
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    const response = await requestWithRetry(`${API_BASE_URL}/archived-orders?${params}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    return { success: true, ...data }
  } catch (error) {
    return { success: false, data: [], pagination: { page: 1, limit: 100, total: 0 } }
  }
}

// Service pour les tricoteuses
export const tricoteusesService = {
  // Récupérer toutes les tricoteuses
  async getAllTricoteuses() {
    try {
      // Vérifier d'abord le cache mémoire
      const cached = cacheGet('tricoteuses')
      if (cached) return cached
      
      // En production, vérifier le cache persistant
      const persistentCached = persistentCacheGet('tricoteuses')
      if (persistentCached) {
        cacheSet('tricoteuses', persistentCached)
        return persistentCached
      }
      
      const response = await requestWithRetry(`${API_BASE_URL}/tricoteuses`, { timeoutMs: 3000 })
      if (!response || !response.ok) throw new Error('Erreur lors de la récupération des tricoteuses')
      const result = await response.json()
      const data = result.data || []
      cacheSet('tricoteuses', data)
      persistentCacheSet('tricoteuses', data)
      return data
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Tricoteuses timeout - utilisation du cache')
        const fallback = cacheGet('tricoteuses') || persistentCacheGet('tricoteuses') || []
        return fallback
      }
      if (error.message.includes('502')) {
        console.warn('Service indisponible (502) - utilisation du cache')
        const fallback = cacheGet('tricoteuses') || persistentCacheGet('tricoteuses') || []
        return fallback
      }
      console.error('Erreur récupération tricoteuses:', error)
      return []
    }
  },

  // Créer une nouvelle tricoteuse
  async createTricoteuse(tricoteuseData) {
    try {
      const response = await requestWithRetry(`${API_BASE_URL}/tricoteuses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tricoteuseData)
      })
      if (!response.ok) throw new Error('Erreur lors de la création de la tricoteuse')
      const result = await response.json()
      // Invalider le cache pour rendre visible immédiatement la nouvelle tricoteuse
      cacheSet('tricoteuses', null)
      try { window.dispatchEvent(new Event('mc-tricoteuses-updated')) } catch {}
      return result.data
    } catch (error) {
      console.error('Erreur création tricoteuse:', error)
      throw error
    }
  },

  // Modifier une tricoteuse
  async updateTricoteuse(id, tricoteuseData) {
    try {
      const response = await requestWithRetry(`${API_BASE_URL}/tricoteuses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tricoteuseData)
      })
      if (!response.ok) throw new Error('Erreur lors de la modification de la tricoteuse')
      const result = await response.json()
      // Invalider le cache et notifier
      cacheSet('tricoteuses', null)
      try { window.dispatchEvent(new Event('mc-tricoteuses-updated')) } catch {}
      return result.data
    } catch (error) {
      console.error('Erreur modification tricoteuse:', error)
      throw error
    }
  },

  // Supprimer une tricoteuse
  async deleteTricoteuse(id) {
    try {
      const response = await requestWithRetry(`${API_BASE_URL}/tricoteuses/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Erreur lors de la suppression de la tricoteuse')
      const result = await response.json()
      // Invalider le cache et notifier
      cacheSet('tricoteuses', null)
      try { window.dispatchEvent(new Event('mc-tricoteuses-updated')) } catch {}
      return result.success
    } catch (error) {
      console.error('Erreur suppression tricoteuse:', error)
      throw error
    }
  }
}

// Service pour les assignations d'articles aux tricoteuses
export const assignmentsService = {
  // Récupérer toutes les assignations
  async getAllAssignments() {
    try {
      // Vérifier d'abord le cache mémoire
      const cached = cacheGet('assignments')
      if (cached) return cached
      
      // En production, vérifier le cache persistant
      const persistentCached = persistentCacheGet('assignments')
      if (persistentCached) {
        cacheSet('assignments', persistentCached)
        return persistentCached
      }
      
      const response = await requestWithRetry(`${API_BASE_URL}/assignments`, { timeoutMs: 3000 })
      if (!response || !response.ok) throw new Error('Erreur lors de la récupération des assignations')
      const result = await response.json()
      const data = result.data || []
      cacheSet('assignments', data)
      persistentCacheSet('assignments', data)
      return data
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Assignations timeout - utilisation du cache')
        const fallback = cacheGet('assignments') || persistentCacheGet('assignments') || []
        return fallback
      }
      if (error.message.includes('502')) {
        console.warn('Service indisponible (502) - utilisation du cache')
        const fallback = cacheGet('assignments') || persistentCacheGet('assignments') || []
        return fallback
      }
      console.error('Erreur récupération assignations:', error)
      return []
    }
  },

  // Récupérer l'assignation d'un article
  async getAssignmentByArticleId(articleId) {
    try {
      // Récupérer toutes les assignations en une fois (pas d'erreur 404)
      const response = await requestWithRetry(`${API_BASE_URL}/assignments`)
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des assignations')
      }
      
      const result = await response.json()
      const allAssignments = result.data || []
      
      // Chercher l'assignation pour cet article
      const assignment = allAssignments.find(a => a.article_id === articleId)
      
      return assignment || null
    } catch (error) {
      console.error('Erreur assignation:', error.message)
      return null
    }
  },

  // Créer ou mettre à jour une assignation
  async createOrUpdateAssignment(assignmentData) {
    try {
      const response = await requestWithRetry(`${API_BASE_URL}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData)
      })
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Erreur HTTP assignation:', response.status, errorText)
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`)
      }
      const result = await response.json()
      
      // Invalider le cache pour refléter la mise à jour
      cacheDelete('assignments')
      
      // Déclencher un événement pour forcer le rechargement des assignations
      window.dispatchEvent(new CustomEvent('mc-assignments-updated'))
      
      return result.data
    } catch (error) {
      console.error('❌ Erreur sauvegarde assignation:', error)
      throw error
    }
  },

  // Supprimer une assignation
  async deleteAssignment(idOrArticleId) {
    try {
      const isObjectId = typeof idOrArticleId === 'string' && /^[a-fA-F0-9]{24}$/.test(idOrArticleId)
      let response
      if (isObjectId) {
        response = await requestWithRetry(`${API_BASE_URL}/assignments/${idOrArticleId}`, {
          method: 'DELETE'
        })
      } else {
        // Suppression par article_id directement
        response = await requestWithRetry(`${API_BASE_URL}/assignments/by-article/${idOrArticleId}`, {
          method: 'DELETE'
        })
      }
      // Si 404, l'assignation n'existe pas - ce n'est pas une erreur
      if (response.status === 404) {
        console.log(`ℹ️ Aucune assignation trouvée pour l'article ${idOrArticleId} - suppression ignorée`)
        // La route DELETE /api/assignments/by-article/:articleId met déjà à jour production_status
        // Pas besoin de faire un PUT séparé
        return { success: true, message: 'Aucune assignation à supprimer' }
      }
      
      if (!response.ok) throw new Error('Erreur lors de la suppression de l\'assignation')
      const result = await response.json()
      cacheDelete('assignments')
      
      // Déclencher un événement pour forcer le rechargement des assignations
      window.dispatchEvent(new CustomEvent('mc-assignments-updated'))
      
      return result.success
    } catch (error) {
      console.error('Erreur suppression assignation:', error)
      throw error
    }
  }
}

// Préchargement des données à l'ouverture de l'app (désactivé pour accélérer le chargement)
export async function prefetchAppData() {
  try {
    // Préchargement complètement désactivé - pas de chargement au démarrage
    try { sessionStorage.setItem('mc-prefetch-ok-v1', '1') } catch {}
    try { window.dispatchEvent(new Event('mc-prefetch-done')) } catch {}
  } catch {
    // silencieux
  }
}


