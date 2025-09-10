const db = require('./database')

class OrdersService {
  async getOrders(filters = {}) {
    const collection = db.getCollection('orders')
    const query = {}
    
    if (filters.status && filters.status !== 'all') {
      query.status = filters.status
    }
    
    if (filters.search) {
      query.$or = [
        { order_number: { $regex: filters.search, $options: 'i' } },
        { customer: { $regex: filters.search, $options: 'i' } }
      ]
    }

    const sort = {}
    if (filters.sortBy) {
      sort[filters.sortBy] = filters.sortOrder === 'asc' ? 1 : -1
    } else {
      sort.order_date = -1
    }

    const limit = parseInt(filters.limit) || 15
    const skip = ((parseInt(filters.page) || 1) - 1) * limit

    const [orders, total] = await Promise.all([
      collection.find(query).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(query)
    ])

    return {
      orders,
      pagination: {
        page: parseInt(filters.page) || 1,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }

  async getOrderById(orderId) {
    const collection = db.getCollection('orders')
    return await collection.findOne({ order_id: parseInt(orderId) })
  }

  async createOrder(orderData) {
    const collection = db.getCollection('orders')
    const result = await collection.insertOne({
      ...orderData,
      created_at: new Date(),
      updated_at: new Date()
    })
    return result.insertedId
  }

  async updateOrder(orderId, updateData) {
    const collection = db.getCollection('orders')
    const result = await collection.updateOne(
      { order_id: parseInt(orderId) },
      { 
        $set: {
          ...updateData,
          updated_at: new Date()
        }
      }
    )
    return result.modifiedCount > 0
  }

  async deleteOrder(orderId) {
    const collection = db.getCollection('orders')
    const result = await collection.deleteOne({ order_id: parseInt(orderId) })
    return result.deletedCount > 0
  }

  async getOrdersStats() {
    const collection = db.getCollection('orders')
    const stats = await collection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray()

    return stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count
      return acc
    }, {})
  }
}

module.exports = new OrdersService()
