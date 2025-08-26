// Service pour l'API MongoDB
const API_BASE_URL = 'http://localhost:3001/api'

// Récupérer tous les statuts de production
export const getProductionStatuses = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/production-status`)
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
    const response = await fetch(`${API_BASE_URL}/production/status`, {
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
    const response = await fetch(`${API_BASE_URL}/production/dispatch`, {
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
    const response = await fetch(`${API_BASE_URL}/sync/orders`, {
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
    const response = await fetch(`${API_BASE_URL}/orders`)
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
    const response = await fetch(`${API_BASE_URL}/orders/production/${productionType}`)
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
    const response = await fetch(`${API_BASE_URL}/production-status/stats`)
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
    const response = await fetch(`${API_BASE_URL}/woocommerce/products/${productId}/permalink`)
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
    const response = await fetch(`${API_BASE_URL}/woocommerce/products/permalink/batch`, {
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
    const response = await fetch(`${API_BASE_URL}/sync/logs`)
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
    const response = await fetch(`${API_BASE_URL}/sync/logs/clear`, {
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
