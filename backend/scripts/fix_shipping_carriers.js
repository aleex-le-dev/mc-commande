require('dotenv').config()
const database = require('../services/database')
const ordersService = require('../services/ordersService')

/**
 * Script pour corriger les transporteurs des commandes existantes
 * Remplace "flat_rate" par le bon transporteur (DHL, UPS, etc.)
 */
class ShippingCarrierFixer {
  constructor() {
    this.updatedCount = 0
    this.errorCount = 0
  }

  async run() {
    try {
      console.log('🚀 Démarrage correction transporteurs...')
      
      // Connexion à la base de données
      await database.connect()
      console.log('✅ Base de données connectée')
      
      const orderItemsCollection = database.getCollection('order_items')
      
      // Récupérer toutes les commandes avec shipping_carrier = 'flat_rate'
      const ordersWithFlatRate = await orderItemsCollection.find({
        shipping_carrier: 'flat_rate'
      }).toArray()
      
      console.log(`📦 ${ordersWithFlatRate.length} commandes avec "flat_rate" trouvées`)
      
      // Grouper par order_id pour éviter les doublons
      const uniqueOrders = new Map()
      ordersWithFlatRate.forEach(item => {
        if (!uniqueOrders.has(item.order_id)) {
          uniqueOrders.set(item.order_id, item)
        }
      })
      
      console.log(`🔄 Traitement de ${uniqueOrders.size} commandes uniques...`)
      
      for (const [orderId, orderItem] of uniqueOrders) {
        await this.fixOrderCarrier(orderId, orderItem, orderItemsCollection)
      }
      
      console.log('\n📊 Résumé:')
      console.log(`✅ Commandes corrigées: ${this.updatedCount}`)
      console.log(`❌ Erreurs: ${this.errorCount}`)
      
    } catch (error) {
      console.error('❌ Erreur générale:', error)
    } finally {
      await database.disconnect()
      console.log('🔌 Connexion fermée')
    }
  }

  async fixOrderCarrier(orderId, orderItem, orderItemsCollection) {
    try {
      console.log(`\n🔄 Correction commande ${orderId}...`)
      
      // Récupérer la commande depuis WooCommerce pour obtenir les vraies données de livraison
      const wooOrder = await this.fetchOrderFromWooCommerce(orderId)
      if (!wooOrder) {
        console.log(`   ⚠️  Commande ${orderId} non trouvée sur WooCommerce`)
        this.errorCount++
        return
      }
      
      // Extraire le bon transporteur
      const correctCarrier = ordersService.extractShippingCarrier(wooOrder.shipping_lines?.[0])
      const correctMethod = wooOrder.shipping_lines?.[0]?.method_title || 'Standard'
      
      console.log(`   📦 Ancien: ${orderItem.shipping_carrier} | Nouveau: ${correctCarrier}`)
      
      // Mettre à jour tous les items de cette commande
      const result = await orderItemsCollection.updateMany(
        { order_id: orderId },
        { 
          $set: { 
            shipping_carrier: correctCarrier,
            shipping_method: correctMethod,
            updated_at: new Date()
          }
        }
      )
      
      this.updatedCount++
      console.log(`   ✅ ${result.modifiedCount} items mis à jour`)
      
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
  const fixer = new ShippingCarrierFixer()
  fixer.run().then(() => {
    console.log('🏁 Script terminé')
    process.exit(0)
  }).catch(error => {
    console.error('💥 Erreur fatale:', error)
    process.exit(1)
  })
}

module.exports = ShippingCarrierFixer
