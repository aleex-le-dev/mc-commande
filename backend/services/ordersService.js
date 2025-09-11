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

    // Étapes communes au niveau item (avant groupement par commande)
    const baseItemStages = [
      { $match: match },
      {
        $lookup: {
          from: 'production_status',
          let: { oid: '$order_id', lid: '$line_item_id' },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ['$order_id', '$$oid'] }, { $eq: ['$line_item_id', '$$lid'] } ] } } },
            { $project: { status: 1, production_type: 1, urgent: 1, updated_at: 1 } }
          ],
          as: 'ps'
        }
      },
      { $addFields: { production_status: { $arrayElemAt: ['$ps', 0] } } },
      { $project: { ps: 0 } },
      ...(filters.productionType && ['couture','maille'].includes(String(filters.productionType))
        ? [ { $match: { 'production_status.production_type': String(filters.productionType) } } ]
        : [])
    ]

    const pipeline = [
      {
        $facet: {
          // Données paginées par commande
          data: [
            ...baseItemStages,
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
            { $addFields: { order_number: { $ifNull: ['$order_number', '$order_id'] }, customer_name: { $ifNull: ['$customer_name', '$customer'] }, customer_email: { $ifNull: ['$customer_email', null] } } },
            { $sort: sort },
            { $skip: skip },
            { $limit: limit }
          ],
          // Total de commandes (pour la pagination)
          totalCount: [
            ...baseItemStages,
            { $group: { _id: '$order_id' } },
            { $count: 'count' }
          ],
          // Statistiques globales par statut (sur tous les items)
          statusCounts: [
            ...baseItemStages,
            { $group: { _id: '$production_status.status', count: { $sum: 1 } } }
          ],
          urgentCount: [
            ...baseItemStages,
            { $match: { 'production_status.urgent': true } },
            { $count: 'count' }
          ],
          totalItems: [
            ...baseItemStages,
            { $count: 'count' }
          ]
        }
      }
    ]

    const agg = await items.aggregate(pipeline).toArray()
    const data = agg[0]?.data || []
    const total = (agg[0]?.totalCount?.[0]?.count) || 0
    const statusCountsArr = agg[0]?.statusCounts || []
    const urgentCount = (agg[0]?.urgentCount?.[0]?.count) || 0
    const totalItems = (agg[0]?.totalItems?.[0]?.count) || 0

    const stats = statusCountsArr.reduce((acc, s) => {
      const key = s._id || 'a_faire'
      acc[key] = s.count
      return acc
    }, { a_faire: 0, en_cours: 0, en_pause: 0, termine: 0, urgent: urgentCount, total: totalItems })

    return {
      orders: data,
      stats,
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
