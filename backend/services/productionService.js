const db = require('./database')

class ProductionService {
  async getProductionStatus(orderId, lineItemId) {
    const collection = db.getCollection('production_status')
    return await collection.findOne({ 
      order_id: parseInt(orderId), 
      line_item_id: parseInt(lineItemId) 
    })
  }

  async updateProductionStatus(orderId, lineItemId, status, additionalData = {}) {
    const collection = db.getCollection('production_status')
    
    const updateData = {
      order_id: parseInt(orderId),
      line_item_id: parseInt(lineItemId),
      status,
      updated_at: new Date(),
      ...additionalData
    }

    const result = await collection.updateOne(
      { order_id: parseInt(orderId), line_item_id: parseInt(lineItemId) },
      { $set: updateData },
      { upsert: true }
    )

    return result.upsertedCount > 0 || result.modifiedCount > 0
  }

  async getProductionStats() {
    const db = require('./database')
    
    console.log('🔍 [getProductionStats] Début du calcul des statistiques')
    
    // Vérifier la connexion à la base
    console.log('🔍 [getProductionStats] Connexion DB:', db.isConnected)
    
    // Compter les commandes uniques depuis order_items
    const orderItemsCollection = db.getCollection('order_items')
    console.log('🔍 [getProductionStats] Collection order_items:', orderItemsCollection ? 'OK' : 'ERREUR')
    
    const totalOrders = await orderItemsCollection.distinct('order_id').then(ids => {
      console.log('🔍 [getProductionStats] IDs de commandes distincts:', ids.length, ids.slice(0, 5))
      return ids.length
    })
    
    // Compter tous les articles
    const totalItems = await orderItemsCollection.countDocuments()
    console.log('🔍 [getProductionStats] Total articles:', totalItems)
    
    // Compter les statuts de production
    const productionStatusCollection = db.getCollection('production_status')
    console.log('🔍 [getProductionStats] Collection production_status:', productionStatusCollection ? 'OK' : 'ERREUR')
    
    const totalStatuses = await productionStatusCollection.countDocuments()
    console.log('🔍 [getProductionStats] Total statuts:', totalStatuses)
    
    // Lister toutes les collections disponibles
    try {
      const collections = await db.db.listCollections().toArray()
      console.log('🔍 [getProductionStats] Collections disponibles:', collections.map(c => c.name))
    } catch (error) {
      console.log('🔍 [getProductionStats] Erreur listage collections:', error.message)
    }
    
    // Statistiques par statut
    const statusStats = await productionStatusCollection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray()
    console.log('🔍 [getProductionStats] Stats par statut:', statusStats)
    
    // Statistiques par type de production
    const statusesByType = await productionStatusCollection.aggregate([
      {
        $group: {
          _id: '$production_type',
          count: { $sum: 1 }
        }
      }
    ]).toArray()
    console.log('🔍 [getProductionStats] Stats par type:', statusesByType)

    const result = {
      totalOrders,
      totalItems,
      totalStatuses,
      statusStats: statusStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count
        return acc
      }, {}),
      statusesByType
    }
    
    console.log('🔍 [getProductionStats] Résultat final:', result)
    return result
  }

  async getProductionByStatus(status) {
    const collection = db.getCollection('production_status')
    return await collection.find({ status }).sort({ updated_at: -1 }).toArray()
  }

  async bulkUpdateStatus(updates) {
    const collection = db.getCollection('production_status')
    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { 
          order_id: parseInt(update.orderId), 
          line_item_id: parseInt(update.lineItemId) 
        },
        update: {
          $set: {
            status: update.status,
            updated_at: new Date()
          }
        },
        upsert: true
      }
    }))

    const result = await collection.bulkWrite(bulkOps)
    return result
  }

  async updateUrgentFlag(orderId, lineItemId, urgent) {
    const collection = db.getCollection('production_status')
    const parsedOrderId = parseInt(orderId)
    const parsedLineItemId = parseInt(lineItemId)

    const result = await collection.updateOne(
      { order_id: parsedOrderId, line_item_id: parsedLineItemId },
      {
        $set: {
          order_id: parsedOrderId,
          line_item_id: parsedLineItemId,
          urgent: Boolean(urgent),
          updated_at: new Date()
        }
      },
      { upsert: true }
    )

    return result.upsertedCount > 0 || result.modifiedCount > 0
  }
}

module.exports = new ProductionService()
