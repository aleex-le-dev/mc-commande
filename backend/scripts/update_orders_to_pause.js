require('dotenv').config()
const database = require('../services/database')

/**
 * Script pour mettre des commandes spécifiques en statut "pause"
 */
class OrdersStatusUpdater {
  constructor() {
    this.orderIds = [
      380723, 385236, 385930, 386272, 388747, 389860, 389866
    ]
    this.updatedCount = 0
    this.errorCount = 0
  }

  async run() {
    try {
      console.log('🚀 Démarrage mise à jour statut commandes...')
      
      // Connexion à la base de données
      await database.connect()
      console.log('✅ Base de données connectée')
      
      const orderItemsCollection = database.getCollection('order_items')
      
      for (const orderId of this.orderIds) {
        await this.updateOrderStatus(orderId, orderItemsCollection)
      }
      
      console.log('\n📊 Résumé:')
      console.log(`✅ Commandes mises à jour: ${this.updatedCount}`)
      console.log(`❌ Erreurs: ${this.errorCount}`)
      
    } catch (error) {
      console.error('❌ Erreur générale:', error)
    } finally {
      await database.disconnect()
      console.log('🔌 Connexion fermée')
    }
  }

  async updateOrderStatus(orderId, orderItemsCollection) {
    try {
      console.log(`\n🔄 Mise à jour commande ${orderId}...`)
      
      // Mettre à jour le statut et le statut de production
      const result = await orderItemsCollection.updateMany(
        { order_id: orderId },
        { 
          $set: { 
            status: 'pause',
            production_status: {
              status: 'pause',
              production_type: 'couture',
              urgent: false,
              notes: null,
              updated_at: new Date()
            },
            updated_at: new Date()
          }
        }
      )
      
      if (result.matchedCount === 0) {
        console.log(`   ⚠️  Aucun item trouvé pour la commande ${orderId}`)
        this.errorCount++
        return
      }
      
      this.updatedCount++
      console.log(`   ✅ ${result.modifiedCount} items mis à jour pour la commande ${orderId}`)
      
    } catch (error) {
      this.errorCount++
      console.error(`   ❌ Erreur commande ${orderId}:`, error.message)
    }
  }
}

// Exécution du script
if (require.main === module) {
  const updater = new OrdersStatusUpdater()
  updater.run().then(() => {
    console.log('🏁 Script terminé')
    process.exit(0)
  }).catch(error => {
    console.error('💥 Erreur fatale:', error)
    process.exit(1)
  })
}

module.exports = OrdersStatusUpdater
