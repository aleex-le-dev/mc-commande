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
    
    // Compter les commandes uniques depuis order_items
    const orderItemsCollection = db.getCollection('order_items')
    const totalOrders = await orderItemsCollection.distinct('order_id').then(ids => ids.length)
    
    // Compter tous les articles
    const totalItems = await orderItemsCollection.countDocuments()
    
    // Compter les statuts de production
    const productionStatusCollection = db.getCollection('production_status')
    const totalStatuses = await productionStatusCollection.countDocuments()
    
    // Statistiques par statut
    const statusStats = await productionStatusCollection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray()
    
    // Statistiques par type de production
    const statusesByType = await productionStatusCollection.aggregate([
      {
        $group: {
          _id: '$production_type',
          count: { $sum: 1 }
        }
      }
    ]).toArray()

    return {
      totalOrders,
      totalItems,
      totalStatuses,
      statusStats: statusStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count
        return acc
      }, {}),
      statusesByType
    }
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
