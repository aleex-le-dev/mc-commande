/**
 * Script pour importer les notes client depuis WooCommerce vers order_items
 * Récupère les notes pour toutes les commandes existantes dans order_items
 */
require('dotenv').config()
const db = require('../services/database')

const WORDPRESS_URL = process.env.VITE_WORDPRESS_URL
const CONSUMER_KEY = process.env.VITE_WORDPRESS_CONSUMER_KEY
const CONSUMER_SECRET = process.env.VITE_WORDPRESS_CONSUMER_SECRET

class CustomerNotesImporter {
  constructor() {
    this.updatedCount = 0
    this.errorCount = 0
    this.notesFound = 0
  }

  async importNotes() {
    try {
      await db.connect()
      console.log('✅ Connecté à MongoDB')
      
      // Récupérer toutes les commandes uniques
      const orderItems = db.getCollection('order_items')
      const orderIds = await orderItems.distinct('order_id')
      console.log(`📋 ${orderIds.length} commandes trouvées`)
      
      // Traiter par batch de 10 pour éviter de surcharger l'API
      const batchSize = 10
      for (let i = 0; i < orderIds.length; i += batchSize) {
        const batch = orderIds.slice(i, i + batchSize)
        console.log(`\n🔄 Traitement batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(orderIds.length/batchSize)} (${batch.length} commandes)`)
        
        await this.processBatch(batch, orderItems)
        
        // Pause entre les batches pour éviter le rate limiting
        if (i + batchSize < orderIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      console.log(`\n✅ Import terminé:`)
      console.log(`   - Notes trouvées: ${this.notesFound}`)
      console.log(`   - Items mis à jour: ${this.updatedCount}`)
      console.log(`   - Erreurs: ${this.errorCount}`)
      
    } catch (error) {
      console.error('❌ Erreur import:', error)
    } finally {
      await db.disconnect()
    }
  }

  async processBatch(orderIds, orderItemsCollection) {
    const promises = orderIds.map(orderId => this.processOrder(orderId, orderItemsCollection))
    await Promise.all(promises)
  }

  async processOrder(orderId, orderItemsCollection) {
    try {
      // Récupérer la commande depuis WooCommerce
      const orderData = await this.fetchOrderFromWooCommerce(orderId)
      
      if (!orderData) {
        console.log(`   ⚠️  Commande ${orderId} non trouvée sur WooCommerce`)
        return
      }

      const customerNote = orderData.customer_note || orderData.customer_note_meta || null
      
      if (customerNote && customerNote.trim().length > 0) {
        this.notesFound++
        console.log(`   📝 Commande ${orderId}: "${customerNote.substring(0, 50)}${customerNote.length > 50 ? '...' : ''}"`)
        
        // Récupérer tous les articles de cette commande
        const orderItems = await orderItemsCollection.find({ order_id: orderId }).toArray()
        
        // Appliquer la note à chaque article individuellement dans production_status
        const productionCollection = db.getCollection('production_status')
        let articlesUpdated = 0
        
        for (const item of orderItems) {
          await productionCollection.updateOne(
            { order_id: orderId, line_item_id: item.line_item_id },
            { 
              $set: { 
                notes: customerNote.trim(),
                updated_at: new Date()
              }
            },
            { upsert: true }
          )
          articlesUpdated++
        }
        
        // Garder aussi la note au niveau de la commande pour compatibilité
        const result = await orderItemsCollection.updateMany(
          { order_id: orderId },
          { 
            $set: { 
              customer_note: customerNote.trim(),
              updated_at: new Date()
            }
          }
        )
        
        this.updatedCount += articlesUpdated
        console.log(`   ✅ ${articlesUpdated} articles mis à jour avec notes individuelles`)
      } else {
        console.log(`   ℹ️  Commande ${orderId}: pas de note client`)
      }
      
    } catch (error) {
      this.errorCount++
      console.error(`   ❌ Erreur commande ${orderId}:`, error.message)
    }
  }

  async fetchOrderFromWooCommerce(orderId) {
    const url = `${WORDPRESS_URL}/wp-json/wc/v3/orders/${orderId}`
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64')
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        return null // Commande non trouvée
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    return await response.json()
  }
}

// Exécution du script
if (require.main === module) {
  const importer = new CustomerNotesImporter()
  importer.importNotes()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Erreur fatale:', error)
      process.exit(1)
    })
}

module.exports = CustomerNotesImporter
