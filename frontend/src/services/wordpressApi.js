// Service pour l'API WordPress WooCommerce
class WordPressAPI {
  constructor() {
    this.config = this.loadConfig()
    // Cache simple pour éviter des requêtes répétées de permalinks
    this.productPermalinkCache = new Map()
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
      return envConfig
    }

    // Sinon, essayer de charger depuis le localStorage
    try {
      const saved = localStorage.getItem('wordpressConfig')
      if (saved) {
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

  // Récupère la traduction française d'un produit via Google Translate
  async getProductTranslation(productId, currentName) {
    try {
      console.log('Google Translate: Tentative de traduction pour le produit', productId, 'avec le titre:', currentName)
      
      // Heuristiques simples: si le nom semble déjà FR, ne rien faire
      const frenchAccents = ['é', 'è', 'ê', 'ë', 'à', 'ù', 'û', 'ü', 'î', 'ï', 'ô', 'œ', 'æ', 'ç']
      const frenchWords = [' le ', ' la ', ' les ', ' des ', ' du ', ' de ', ' au ', ' aux ', ' et ', ' avec ', ' sans ', ' robe ', ' jupe ', ' pantalon ', ' chemise ', ' blouse ']
      const lower = ` ${currentName.toLowerCase()} `
      const hasFrenchAccents = frenchAccents.some(ch => currentName.includes(ch))
      const hasFrenchWords = frenchWords.some(w => lower.includes(w))
      if (hasFrenchAccents || hasFrenchWords) {
        console.log('Google Translate: Détecté comme FR (accents/mots FR), pas de traduction:', currentName)
        return currentName
      }
      
      // Auto-détection de langue et traduction uniquement si EN détecté
      const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=fr&dt=t&q=${encodeURIComponent(currentName)}`
      console.log('Google Translate: Appel de l\'API:', translateUrl)
      
      try {
        const response = await fetch(translateUrl)
        if (response.ok) {
          const data = await response.json()
          // data[2] contient normalement la langue source détectée (ex: 'en')
          const detected = Array.isArray(data) ? data[2] : undefined
          console.log('Google Translate: Langue détectée:', detected)
          
          // Si ce n'est pas de l'anglais, ne pas traduire
          if (detected && detected !== 'en') {
            console.log('Google Translate: Source non-EN, pas de traduction. Titre conservé:', currentName)
            return currentName
          }
          
          // Appliquer la traduction uniquement si on a un texte traduit
          if (data && data[0] && data[0][0] && data[0][0][0]) {
            const translatedName = data[0][0][0]
            // Si la traduction est identique, conserver l'original
            if (!translatedName || translatedName.trim() === currentName.trim()) {
              console.log('Google Translate: Traduction identique/invalide, titre original conservé')
              return currentName
            }
            console.log('Google Translate: Traduction réussie:', currentName, '→', translatedName)
            return translatedName
          } else {
            console.log('Google Translate: Format de réponse inattendu:', data)
          }
        } else {
          console.log('Google Translate: Erreur HTTP:', response.status, response.statusText)
        }
      } catch (error) {
        console.log('Google Translate: Erreur lors de l\'appel API:', error.message)
      }
      
      // Si la traduction échoue, retourner le nom original
      console.log('Google Translate: Traduction échouée, nom original conservé:', currentName)
      return currentName
      
    } catch (error) {
      console.log('Google Translate: Erreur générale, nom original conservé:', currentName, 'Erreur:', error.message)
      return currentName
    }
  }

  // Récupère le permalink d'un produit WooCommerce (avec cache)
  async getProductPermalink(productId) {
    try {
      if (!this.isConfigured()) {
        return null
      }
      if (!productId) return null
      
      // Vérifier le cache d'abord
      if (this.productPermalinkCache.has(productId)) {
        return this.productPermalinkCache.get(productId)
      }
      
      const baseUrl = this.getBaseUrl()
      const authParams = this.getAuthParams()
      const url = `${baseUrl}/products/${productId}?${authParams}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Timeout plus court pour éviter les requêtes qui traînent
        signal: AbortSignal.timeout(3000)
      })
      
      if (!response.ok) {
        // Si erreur 500 ou autre, ne pas retenter et retourner null
        if (response.status >= 500) {
          console.warn(`Erreur serveur pour le produit ${productId}: ${response.status}`)
          return null
        }
        // Pour les autres erreurs (404, 401, etc.), retourner null
        return null
      }
      
      const product = await response.json()
      const permalink = product?.permalink || null
      
      if (permalink) {
        this.productPermalinkCache.set(productId, permalink)
      }
      
      return permalink
    } catch (error) {
      // Gérer les erreurs de timeout et CORS
      if (error.name === 'TimeoutError') {
        console.warn(`Timeout pour le produit ${productId}`)
      } else if (error.name === 'TypeError' && error.message.includes('CORS')) {
        console.warn(`Erreur CORS pour le produit ${productId}`)
      } else {
        console.warn(`Erreur lors de la récupération du permalink pour ${productId}:`, error.message)
      }
      
      // En cas d'erreur, essayer de construire un permalink de base
      if (this.config.wordpressUrl) {
        const fallbackPermalink = `${this.config.wordpressUrl}/produit/${productId}/`
        console.log(`Utilisation du permalink de base pour ${productId}: ${fallbackPermalink}`)
        return fallbackPermalink
      }
      
      return null
    }
  }

  // Récupère les commandes avec filtres
  async fetchOrders(filters = {}, options = {}) {
    try {
      if (!this.isConfigured()) {
        throw new Error('Veuillez configurer la connexion WordPress dans l\'onglet Configuration')
      }

      const { skipPermalinks = false } = options
      const baseUrl = this.getBaseUrl()
      const authParams = this.getAuthParams()
      
      // Construction des paramètres de requête
      const queryParams = new URLSearchParams()
      queryParams.append('consumer_key', this.config.consumerKey)
      queryParams.append('consumer_secret', this.config.consumerSecret)
      queryParams.append('per_page', '30') // Limite à 15 commandes pour le moment
      queryParams.append('orderby', 'date')
      queryParams.append('order', 'desc')
      
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
  
      // Traitement des données pour un affichage optimisé
      const processedOrders = await Promise.all(orders.map(async order => {
        const processedLineItems = await Promise.all(order.line_items?.map(async item => {
          // Récupérer le permalink depuis WooCommerce
          let permalink = null
          try {
            if (!skipPermalinks) {
              // Essayer de récupérer le permalink depuis le cache d'abord
              if (this.productPermalinkCache.has(item.product_id)) {
                permalink = this.productPermalinkCache.get(item.product_id)
              } else {
                // Récupérer le permalink depuis WooCommerce
                const productResponse = await fetch(`${baseUrl}/products/${item.product_id}?${authParams}`, {
                  method: 'GET',
                  headers: {
                    'Accept': 'application/json',
                  },
                  signal: AbortSignal.timeout(3000) // Timeout plus court
                })
                
                if (productResponse.ok) {
                  const product = await productResponse.json()
                  permalink = product?.permalink || null
                  if (permalink) {
                    this.productPermalinkCache.set(item.product_id, permalink)
                  }
                }
              }
            }
          } catch (error) {
            // En cas d'erreur, construire un permalink de base
            if (this.config.wordpressUrl) {
              permalink = `${this.config.wordpressUrl}/produit/${item.product_id}/`
            }
            console.warn(`Erreur permalink pour produit ${item.product_id}, utilisation du lien de base:`, error.message)
          }
          
          return {
            id: item.id,
            name: item.name, // Nom original sans traduction
            product_id: item.product_id,
            variation_id: item.variation_id,
            quantity: item.quantity,
            total: item.total,
            price: item.price,
            permalink: permalink,
            meta_data: item.meta_data || []
          }
        }) || [])

        return {
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
          line_items: processedLineItems,
          payment_method: order.payment_method,
          payment_method_title: order.payment_method_title,
          shipping_method: order.shipping_method || '',
          shipping_method_title: order.shipping_method_title || '',
          shipping_lines: order.shipping_lines || [],
          transaction_id: order.transaction_id,
          customer_id: order.customer_id,
          customer_note: order.customer_note,
          meta_data: order.meta_data || []
        }
      }))

      return processedOrders

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
