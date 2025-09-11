const db = require('./database')

class OrdersService {
  async getOrders(filters = {}) {
    // Lecture depuis order_items, agrégé par order_id
    const items = db.getCollection('order_items')
    
    const match = {}
    if (filters.status && filters.status !== 'all') {
      match.status = filters.status
    }
    if (filters.search) {
      match.$or = [
        { order_number: { $regex: filters.search, $options: 'i' } },
        { customer: { $regex: filters.search, $options: 'i' } },
        { order_id: isNaN(parseInt(filters.search)) ? undefined : parseInt(filters.search) }
      ].filter(Boolean)
    }

    const sort = {}
    if (filters.sortBy) {
      sort[filters.sortBy] = filters.sortOrder === 'asc' ? 1 : -1
    } else {
      sort.order_date = -1
    }

    const limit = parseInt(filters.limit) || 15
    const page = parseInt(filters.page) || 1
    const skip = (page - 1) * limit

    const pipeline = [
      { $match: match },
      // Joindre les statuts de production si on filtre par type (couture/maille)
      ...(filters.productionType && ['couture','maille'].includes(String(filters.productionType))
        ? [
            {
              $lookup: {
                from: 'production_status',
                let: { oid: '$order_id', lid: '$line_item_id' },
                pipeline: [
                  { $match: { $expr: { $and: [ { $eq: ['$order_id', '$$oid'] }, { $eq: ['$line_item_id', '$$lid'] } ] } } },
                  { $project: { production_type: 1 } }
                ],
                as: 'ps'
              }
            },
            { $match: { ps: { $elemMatch: { production_type: String(filters.productionType) } } } }
          ]
        : []),
      {
        $group: {
          _id: '$order_id',
          order_id: { $first: '$order_id' },
          order_date: { $min: { $ifNull: ['$order_date', '$created_at'] } },
          status: { $first: '$status' },
          items_count: { $sum: 1 },
          items: { $push: '$$ROOT' }
        }
      },
      {
        // Normaliser les champs attendus par le frontend
        $addFields: {
          order_number: { $ifNull: ['$order_number', '$order_id'] },
          customer_name: { $ifNull: ['$customer_name', '$customer'] },
          customer_email: { $ifNull: ['$customer_email', null] }
        }
      },
      { $sort: sort },
      {
        $facet: {
          data: [ { $skip: skip }, { $limit: limit } ],
          totalCount: [ { $count: 'count' } ]
        }
      }
    ]

    const agg = await items.aggregate(pipeline).toArray()
    const data = agg[0]?.data || []
    const total = (agg[0]?.totalCount?.[0]?.count) || 0

    return {
      orders: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }
  }

  async getOrderById(orderId) {
    const id = parseInt(orderId)
    const items = db.getCollection('order_items')

    const result = await items.aggregate([
      { $match: { order_id: id } },
      {
        $group: {
          _id: '$order_id',
          order_id: { $first: '$order_id' },
          order_date: { $min: { $ifNull: ['$order_date', '$created_at'] } },
          status: { $first: '$status' },
          items_count: { $sum: 1 },
          items: { $push: '$$ROOT' }
        }
      },
      {
        $addFields: {
          order_number: { $ifNull: ['$order_number', '$order_id'] },
          customer_name: { $ifNull: ['$customer_name', '$customer'] },
          customer_email: { $ifNull: ['$customer_email', null] }
        }
      }
    ]).toArray()

    return result[0] || null
  }

  async createOrder() {
    // Non supporté sur order_items (création multi-lignes requise)
    throw new Error('createOrder non supporté avec order_items')
  }

  async updateOrder() {
    // Non supporté au niveau commande avec order_items
    throw new Error('updateOrder non supporté avec order_items')
  }

  async deleteOrder(orderId) {
    // Supprimer tous les items liés à la commande
    const items = db.getCollection('order_items')
    const res = await items.deleteMany({ order_id: parseInt(orderId) })
    return res.deletedCount > 0
  }

  async getOrdersStats() {
    // Statistiques basées sur order_items.status
    const items = db.getCollection('order_items')
    const stats = await items.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray()

    return stats.reduce((acc, stat) => {
      acc[stat._id || 'unknown'] = stat.count
      return acc
    }, {})
  }
}

module.exports = new OrdersService()
