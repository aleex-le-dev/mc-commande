// Service pour l'API WordPress WooCommerce
class WordPressAPI {
  constructor() {
    this.config = this.loadConfig()
  }

  // Charge la configuration depuis les variables d'environnement ou le localStorage
  loadConfig() {
    // Priorité aux variables d'environnement
    const envConfig = {
      wordpressUrl: import.meta.env.VITE_WORDPRESS_URL,
      consumerKey: import.meta.env.VITE_WORDPRESS_CONSUMER_KEY,
      consumerSecret: import.meta.env.VITE_WORDPRESS_CONSUMER_SECRET,
      version: import.meta.env.VITE_WORDPRESS_API_VERSION || 'wc/v3'
    }

    // Si toutes les variables d'environnement sont définies, les utiliser
    if (envConfig.wordpressUrl && envConfig.consumerKey && envConfig.consumerSecret) {
      console.log('Configuration chargée depuis les variables d\'environnement')
      return envConfig
    }

    // Sinon, essayer de charger depuis le localStorage
    try {
      const saved = localStorage.getItem('wordpressConfig')
      if (saved) {
        console.log('Configuration chargée depuis le localStorage')
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration depuis localStorage:', error)
    }

    return null
  }

  // Vérifie si la configuration est valide
  isConfigured() {
    return this.config && 
           this.config.wordpressUrl && 
           this.config.consumerKey && 
           this.config.consumerSecret
  }

  // Construit l'URL de base de l'API
  getBaseUrl() {
    if (!this.isConfigured()) {
      throw new Error('Configuration WordPress manquante')
    }
    
    const { wordpressUrl, version } = this.config
    return `${wordpressUrl}/wp-json/${version}`
  }

  // Construit les paramètres d'authentification
  getAuthParams() {
    if (!this.isConfigured()) {
      throw new Error('Configuration WordPress manquante')
    }
    
    const { consumerKey, consumerSecret } = this.config
    return `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`
  }

  // Récupère les commandes avec filtres
  async fetchOrders(filters = {}) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Veuillez configurer la connexion WordPress dans l\'onglet Configuration')
      }

      const baseUrl = this.getBaseUrl()
      const authParams = this.getAuthParams()
      
      // Construction des paramètres de requête
      const queryParams = new URLSearchParams()
      queryParams.append('consumer_key', this.config.consumerKey)
      queryParams.append('consumer_secret', this.config.consumerSecret)
      queryParams.append('per_page', '2') // Limite à 2 commandes pour le debug
      queryParams.append('orderby', 'date')
      queryParams.append('order', 'desc')
      // Supprimer la restriction _fields pour récupérer toutes les données
      // queryParams.append('_fields', 'id,number,status,date_created,date_modified,total,total_tax,currency,billing,shipping,line_items,payment_method,payment_method_title,shipping_method,shipping_method_title,transaction_id,customer_id,customer_note,meta_data')

      // Ajout des filtres
      if (filters.status && filters.status !== 'all') {
        queryParams.append('status', filters.status)
      }
      
      if (filters.dateFrom) {
        queryParams.append('after', filters.dateFrom + 'T00:00:00')
      }
      
      if (filters.dateTo) {
        queryParams.append('before', filters.dateTo + 'T23:59:59')
      }

      if (filters.search) {
        queryParams.append('search', filters.search)
      }

      const url = `${baseUrl}/orders?${queryParams.toString()}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Clés d\'API invalides. Vérifiez votre configuration.')
        } else if (response.status === 404) {
          throw new Error('API WooCommerce non trouvée. Vérifiez que WooCommerce est installé.')
        } else {
          throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`)
        }
      }

      const orders = await response.json()
      
      // Debug: afficher la première commande brute
      if (orders.length > 0) {
        console.log('=== PREMIÈRE COMMANDE BRUTE ===')
        console.log(orders[0])
        console.log('=== FIN PREMIÈRE COMMANDE ===')
      }

      // Traitement des données pour un affichage optimisé
      return orders.map(order => ({
        id: order.id,
        number: order.number,
        status: order.status,
        date_created: order.date_created,
        date_modified: order.date_modified,
        total: order.total,
        total_tax: order.total_tax,
        currency: order.currency,
        billing: {
          first_name: order.billing?.first_name || '',
          last_name: order.billing?.last_name || '',
          email: order.billing?.email || '',
          phone: order.billing?.phone || '',
          address_1: order.billing?.address_1 || '',
          address_2: order.billing?.address_2 || '',
          city: order.billing?.city || '',
          state: order.billing?.state || '',
          postcode: order.billing?.postcode || '',
          country: order.billing?.country || ''
        },
        shipping: {
          first_name: order.shipping?.first_name || '',
          last_name: order.shipping?.last_name || '',
          address_1: order.shipping?.address_1 || '',
          address_2: order.shipping?.address_2 || '',
          city: order.shipping?.city || '',
          state: order.shipping?.state || '',
          postcode: order.shipping?.postcode || '',
          country: order.shipping?.country || ''
        },
        line_items: order.line_items?.map(item => ({
          id: item.id,
          name: item.name,
          product_id: item.product_id,
          variation_id: item.variation_id,
          quantity: item.quantity,
          total: item.total,
          price: item.price,
          meta_data: item.meta_data || []
        })) || [],
        payment_method: order.payment_method,
        payment_method_title: order.payment_method_title,
        shipping_method: order.shipping_method || '',
        shipping_method_title: order.shipping_method_title || '',
        transaction_id: order.transaction_id,
        customer_id: order.customer_id,
        customer_note: order.customer_note,
        meta_data: order.meta_data || []
      }))

    } catch (error) {
      console.error('Erreur lors de la récupération des commandes:', error)
      throw error
    }
  }

  // Récupère une commande spécifique
  async fetchOrder(orderId) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Configuration WordPress manquante')
      }

      const baseUrl = this.getBaseUrl()
      const authParams = this.getAuthParams()
      
      const url = `${baseUrl}/orders/${orderId}?${authParams}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Erreur lors de la récupération de la commande ${orderId}:`, error)
      throw error
    }
  }

  // Met à jour le statut d'une commande
  async updateOrderStatus(orderId, newStatus) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Configuration WordPress manquante')
      }

      const baseUrl = this.getBaseUrl()
      const authParams = this.getAuthParams()
      
      const url = `${baseUrl}/orders/${orderId}?${authParams}`
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        })
      })
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la commande ${orderId}:`, error)
      throw error
    }
  }

  // Récupère les statistiques des commandes
  async fetchOrderStats() {
    try {
      if (!this.isConfigured()) {
        throw new Error('Configuration WordPress manquante')
      }

      const baseUrl = this.getBaseUrl()
      const authParams = this.getAuthParams()
      
      // Récupérer toutes les commandes pour calculer les stats
      const orders = await this.fetchOrders()
      
      const stats = {
        total: orders.length,
        completed: orders.filter(o => o.status === 'completed').length,
        processing: orders.filter(o => o.status === 'processing').length,
        pending: orders.filter(o => o.status === 'pending').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        refunded: orders.filter(o => o.status === 'refunded').length,
        totalRevenue: orders
          .filter(o => o.status === 'completed')
          .reduce((sum, o) => sum + parseFloat(o.total), 0)
      }
      
      return stats
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error)
      throw error
    }
  }
}

// Instance singleton
const wordpressAPI = new WordPressAPI()

// Fonction d'export pour React Query
export const fetchOrders = (filters) => wordpressAPI.fetchOrders(filters)
export const fetchOrder = (orderId) => wordpressAPI.fetchOrder(orderId)
export const updateOrderStatus = (orderId, newStatus) => wordpressAPI.updateOrderStatus(orderId, newStatus)
export const fetchOrderStats = () => wordpressAPI.fetchOrderStats()

export default wordpressAPI
