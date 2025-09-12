require('dotenv').config()
const database = require('../services/database')
const ordersService = require('../services/ordersService')

/**
 * Script pour synchroniser des commandes spécifiques depuis WordPress
 * et les mettre en statut "pause"
 */
class SpecificOrdersSyncer {
  constructor() {
    this.orderIds = [
      380723, 385236, 385930, 386272, 388747, 389860, 389866
    ]
    this.syncedCount = 0
    this.errorCount = 0
  }

  async run() {
    try {
      console.log('🚀 Démarrage synchronisation commandes spécifiques...')
      
      // Connexion à la base de données
      await database.connect()
      console.log('✅ Base de données connectée')
      
      const orderItemsCollection = database.getCollection('order_items')
      
      for (const orderId of this.orderIds) {
        await this.processOrder(orderId, orderItemsCollection)
      }
      
      console.log('\n📊 Résumé:')
      console.log(`✅ Commandes synchronisées: ${this.syncedCount}`)
      console.log(`❌ Erreurs: ${this.errorCount}`)
      
    } catch (error) {
      console.error('❌ Erreur générale:', error)
    } finally {
      await database.disconnect()
      console.log('🔌 Connexion fermée')
    }
  }

  async processOrder(orderId, orderItemsCollection) {
    try {
      console.log(`\n🔄 Traitement commande ${orderId}...`)
      
      // Vérifier si la commande existe déjà
      const existingOrder = await orderItemsCollection.findOne({ order_id: orderId })
      if (existingOrder) {
        console.log(`   ⚠️  Commande ${orderId} déjà présente en BDD`)
        return
      }
      
      // Récupérer la commande depuis WooCommerce
      const wooOrder = await this.fetchOrderFromWooCommerce(orderId)
      if (!wooOrder) {
        console.log(`   ❌ Commande ${orderId} non trouvée sur WooCommerce`)
        this.errorCount++
        return
      }
      
      // Transformer la commande
      const transformedOrder = await ordersService.transformWooCommerceOrder(wooOrder)
      
      // Insérer les items avec statut "pause"
      for (const item of transformedOrder.items) {
        const orderItem = {
          order_id: transformedOrder.order_id,
          order_number: transformedOrder.order_number,
          order_date: transformedOrder.order_date,
          status: 'pause', // Statut en pause
          customer: transformedOrder.customer,
          customer_email: transformedOrder.customer_email,
          customer_phone: transformedOrder.customer_phone,
          customer_address: transformedOrder.customer_address,
          customer_note: transformedOrder.customer_note,
          shipping_method: transformedOrder.shipping_method,
          shipping_carrier: transformedOrder.shipping_carrier,
          total: transformedOrder.total,
          created_at: transformedOrder.created_at,
          updated_at: transformedOrder.updated_at,
          line_item_id: item.line_item_id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          meta_data: item.meta_data,
          image_url: item.image_url,
          permalink: item.permalink,
          variation_id: item.variation_id,
          production_status: {
            status: 'pause',
            production_type: 'couture',
            urgent: false,
            notes: null,
            updated_at: new Date()
          }
        }

        await orderItemsCollection.insertOne(orderItem)
      }
      
      this.syncedCount++
      console.log(`   ✅ Commande ${orderId} synchronisée avec statut "pause"`)
      
    } catch (error) {
      this.errorCount++
      console.error(`   ❌ Erreur commande ${orderId}:`, error.message)
    }
  }

  async fetchOrderFromWooCommerce(orderId) {
    try {
      const baseUrl = process.env.VITE_WORDPRESS_URL
      const consumerKey = process.env.VITE_WORDPRESS_CONSUMER_KEY
      const consumerSecret = process.env.VITE_WORDPRESS_CONSUMER_SECRET
      const apiVersion = process.env.VITE_WORDPRESS_API_VERSION || 'wc/v3'
      
      const url = `${baseUrl}/wp-json/${apiVersion}/orders/${orderId}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64'),
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null // Commande non trouvée
        }
        throw new Error(`Erreur API WooCommerce: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Erreur récupération commande ${orderId}:`, error.message)
      return null
    }
  }
}

// Exécution du script
if (require.main === module) {
  const syncer = new SpecificOrdersSyncer()
  syncer.run().then(() => {
    console.log('🏁 Script terminé')
    process.exit(0)
  }).catch(error => {
    console.error('💥 Erreur fatale:', error)
    process.exit(1)
  })
}

module.exports = SpecificOrdersSyncer
