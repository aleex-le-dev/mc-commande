// Service pour l'API MongoDB
const API_BASE_URL = 'http://localhost:3001/api'

// Limiteur simple + retry/backoff pour réduire les erreurs réseau au démarrage
let concurrentRequests = 0
const MAX_CONCURRENT = 4
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

async function requestWithRetry(url, options = {}, retries = 2) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 8000)
  try {
    await acquireSlot()
    const res = await fetch(url, { ...options, signal: controller.signal })
    if (!res.ok) {
      if (retries > 0 && res.status >= 500) {
        await new Promise(r => setTimeout(r, (options.backoffMs || 300) * (3 - retries)))
        return requestWithRetry(url, options, retries - 1)
      }
    }
    return res
  } catch (e) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, (options.backoffMs || 300) * (3 - retries)))
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

// Mettre à jour le statut d'un article
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
    return data
    } catch (error) {
    // Erreur silencieuse lors de la mise à jour du statut
    throw error
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
export const syncOrders = async (woocommerceOrders = []) => {
  try {
    // Appeler le backend qui se chargera de récupérer les données WooCommerce
    const response = await requestWithRetry(`${API_BASE_URL}/sync/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      body: JSON.stringify({ orders: woocommerceOrders })
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

// Récupérer toutes les commandes depuis la base de données
export const getOrdersFromDatabase = async () => {
  try {
    const response = await requestWithRetry(`${API_BASE_URL}/orders`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data.orders || []
  } catch (error) {
    // Erreur silencieuse lors de la récupération des commandes
    return []
  }
}

// Récupérer les commandes par type de production
export const getOrdersByProductionType = async (productionType) => {
  try {
    const response = await requestWithRetry(`${API_BASE_URL}/orders/production/${productionType}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data.orders || []
  } catch (error) {
    // Erreur silencieuse lors de la récupération des commandes
    return []
  }
}

// Récupérer les statistiques de production
export const getProductionStats = async () => {
  try {
    const response = await requestWithRetry(`${API_BASE_URL}/production-status/stats`)
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

// Service pour les tricoteuses
export const tricoteusesService = {
  // Récupérer toutes les tricoteuses
  async getAllTricoteuses() {
    try {
      const response = await requestWithRetry('http://localhost:3001/api/tricoteuses')
      if (!response.ok) throw new Error('Erreur lors de la récupération des tricoteuses')
      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Erreur récupération tricoteuses:', error)
      return []
    }
  },

  // Créer une nouvelle tricoteuse
  async createTricoteuse(tricoteuseData) {
    try {
      const response = await requestWithRetry('http://localhost:3001/api/tricoteuses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tricoteuseData)
      })
      if (!response.ok) throw new Error('Erreur lors de la création de la tricoteuse')
      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Erreur création tricoteuse:', error)
      throw error
    }
  },

  // Modifier une tricoteuse
  async updateTricoteuse(id, tricoteuseData) {
    try {
      const response = await requestWithRetry(`http://localhost:3001/api/tricoteuses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tricoteuseData)
      })
      if (!response.ok) throw new Error('Erreur lors de la modification de la tricoteuse')
      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Erreur modification tricoteuse:', error)
      throw error
    }
  },

  // Supprimer une tricoteuse
  async deleteTricoteuse(id) {
    try {
      const response = await requestWithRetry(`http://localhost:3001/api/tricoteuses/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Erreur lors de la suppression de la tricoteuse')
      const result = await response.json()
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
      const response = await requestWithRetry('http://localhost:3001/api/assignments')
      if (!response.ok) throw new Error('Erreur lors de la récupération des assignations')
      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Erreur récupération assignations:', error)
      return []
    }
  },

  // Récupérer l'assignation d'un article
  async getAssignmentByArticleId(articleId) {
    try {
      // Récupérer toutes les assignations en une fois (pas d'erreur 404)
      const response = await requestWithRetry('http://localhost:3001/api/assignments')
      
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
      const response = await requestWithRetry('http://localhost:3001/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData)
      })
      if (!response.ok) throw new Error('Erreur lors de la sauvegarde de l\'assignation')
      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Erreur sauvegarde assignation:', error)
      throw error
    }
  },

  // Supprimer une assignation
  async deleteAssignment(articleId) {
    try {
      const response = await requestWithRetry(`http://localhost:3001/api/assignments/${articleId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Erreur lors de la suppression de l\'assignation')
      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Erreur suppression assignation:', error)
      throw error
    }
  }
}
