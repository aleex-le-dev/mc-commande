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

  // Récupère la traduction française d'un produit via WPML
  async getProductTranslation(productId, currentName) {
    // TEMPORAIREMENT DÉSACTIVÉ - Retourner le nom original pour voir les vrais articles
    console.log('WPML: Traduction temporairement désactivée, nom original conservé:', currentName)
    return currentName
    
    // CODE ORIGINAL COMMENTÉ EN ATTENDANT LA CORRECTION
    /*
    try {
      if (!this.isConfigured()) {
        console.log('WPML: Configuration WordPress manquante, titre original conservé:', currentName)
        return currentName
      }

      const baseUrl = this.getBaseUrl()
      const authParams = this.getAuthParams()
      
      console.log('WPML: Tentative de récupération de la traduction pour le produit', productId, 'avec le titre:', currentName)
      
      // Approche 1: Utiliser _wpml_import_translation_group pour trouver les traductions
      const wpmlTranslationGroup = product.meta_data.find(meta => meta.key === '_wpml_import_translation_group')
      if (wpmlTranslationGroup) {
        console.log('WPML: Groupe de traduction trouvé:', wpmlTranslationGroup.value)
        
        // Chercher tous les produits avec le même groupe de traduction
        const groupSearchUrl = `${baseUrl}/products?${authParams}&meta_key=_wpml_import_translation_group&meta_value=${wpmlTranslationGroup.value}`
        console.log('WPML: Recherche par groupe de traduction:', groupSearchUrl)
        
        try {
          const groupResponse = await fetch(groupSearchUrl)
          if (groupResponse.ok) {
            const groupProducts = await groupResponse.json()
            console.log('WPML: Produits du même groupe de traduction trouvés:', groupProducts.length)
            
            // Chercher le produit français parmi les résultats
            for (const groupProduct of groupProducts) {
              if (groupProduct.id !== productId) { // Exclure le produit original
                console.log('WPML: Produit du groupe trouvé:', {
                  id: groupProduct.id,
                  name: groupProduct.name,
                  meta_data: groupProduct.meta_data ? groupProduct.meta_data.length : 0
                })
                
                // Vérifier si c'est le produit français
                const groupProductLanguageMeta = groupProduct.meta_data?.find(meta => meta.key === '_wpml_language')
                if (groupProductLanguageMeta && groupProductLanguageMeta.value === 'fr') {
                  console.log('WPML: Produit français trouvé par groupe de traduction:', currentName, '→', groupProduct.name)
                  return groupProduct.name
                }
                
                // Si pas de langue spécifiée, vérifier si le nom est différent (probablement français)
                if (groupProduct.name && groupProduct.name !== currentName) {
                  console.log('WPML: Produit alternatif trouvé par groupe de traduction (nom différent):', currentName, '→', groupProduct.name)
                  return groupProduct.name
                }
              }
            }
          }
        } catch (error) {
          console.log('WPML: Erreur lors de la recherche par groupe de traduction:', error.message)
        }
      }
      
      // Approche 2: Utiliser les bonnes clés WPML (wpml_post_language et wpml_translation_of)
      const wpmlPostLanguage = product.meta_data.find(meta => meta.key === 'wpml_post_language')
      const wpmlTranslationOf = product.meta_data.find(meta => meta.key === 'wpml_translation_of')
      
      if (wpmlPostLanguage) {
        console.log('WPML: Langue du post trouvée:', wpmlPostLanguage.value)
      }
      
      if (wpmlTranslationOf) {
        console.log('WPML: ID du post parent trouvé:', wpmlTranslationOf.value)
      }
      
      // Si ce produit a un post parent (wpml_translation_of), chercher ses traductions
      if (wpmlTranslationOf && wpmlTranslationOf.value) {
        const parentId = wpmlTranslationOf.value
        console.log('WPML: Recherche des traductions du post parent:', parentId)
        
        // Chercher tous les produits qui ont ce post comme parent
        const parentSearchUrl = `${baseUrl}/products?${authParams}&meta_key=wpml_translation_of&meta_value=${parentId}`
        console.log('WPML: Recherche des traductions du parent:', parentSearchUrl)
        
        try {
          const parentResponse = await fetch(parentSearchUrl)
          if (parentResponse.ok) {
            const parentTranslations = await parentResponse.json()
            console.log('WPML: Traductions du parent trouvées:', parentTranslations.length)
            
            // Chercher le produit français parmi les traductions
            for (const translation of parentTranslations) {
              if (translation.id !== productId) { // Exclure le produit original
                console.log('WPML: Traduction trouvée:', {
                  id: translation.id,
                  name: translation.name
                })
                
                // Vérifier la langue du produit traduit
                const translationLanguage = translation.meta_data?.find(meta => meta.key === 'wpml_post_language')
                if (translationLanguage && translationLanguage.value === 'fr') {
                  console.log('WPML: Produit français trouvé via wpml_translation_of:', currentName, '→', translation.name)
                  return translation.name
                }
                
                // Si pas de langue spécifiée, vérifier si le nom est différent
                if (translation.name && translation.name !== currentName) {
                  console.log('WPML: Produit alternatif trouvé via wpml_translation_of (nom différent):', currentName, '→', translation.name)
                  return translation.name
                }
              }
            }
          }
        } catch (error) {
          console.log('WPML: Erreur lors de la recherche des traductions du parent:', error.message)
        }
      }
      
      // Approche 3: Si ce produit est en anglais, chercher directement sa traduction française
      if (wpmlPostLanguage && wpmlPostLanguage.value === 'en') {
        console.log('WPML: Produit en anglais détecté, recherche de la traduction française')
        
        // Chercher le produit français qui a ce produit comme parent
        const frenchSearchUrl = `${baseUrl}/products?${authParams}&meta_key=wpml_translation_of&meta_value=${productId}`
        console.log('WPML: Recherche de la traduction française:', frenchSearchUrl)
        
        try {
          const frenchResponse = await fetch(frenchSearchUrl)
          if (frenchResponse.ok) {
            const frenchProducts = await frenchResponse.json()
            console.log('WPML: Produits français trouvés:', frenchProducts.length)
            
            for (const frenchProduct of frenchProducts) {
              const frenchLanguage = frenchProduct.meta_data?.find(meta => meta.key === 'wpml_post_language')
              if (frenchLanguage && frenchLanguage.value === 'fr') {
                console.log('WPML: Produit français trouvé directement:', currentName, '→', frenchProduct.name)
                return frenchProduct.name
              }
            }
          }
        } catch (error) {
          console.log('WPML: Erreur lors de la recherche directe de la traduction française:', error.message)
        }
      }
      
      console.log('WPML: Aucune traduction trouvée après toutes les tentatives, titre original conservé:', currentName)
      return currentName
      
    } catch (error) {
      console.log('WPML: Erreur générale lors de la récupération de la traduction, titre original conservé:', currentName, 'Erreur:', error.message)
      return currentName
    }
    */
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
      queryParams.append('per_page', '4') // Limite à 2 commandes pour le moment
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
      
      // Traitement des données pour un affichage optimisé
      const processedOrders = await Promise.all(orders.map(async order => {
        const processedLineItems = await Promise.all(order.line_items?.map(async item => {
          const translatedName = await this.getProductTranslation(item.product_id, item.name)
          return {
            id: item.id,
            name: translatedName,
            product_id: item.product_id,
            variation_id: item.variation_id,
            quantity: item.quantity,
            total: item.total,
            price: item.price,
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
