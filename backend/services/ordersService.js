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
            { $project: { status: 1, production_type: 1, urgent: 1, notes: 1, updated_at: 1 } }
          ],
          as: 'ps'
        }
      },
      { $addFields: { production_status: { $arrayElemAt: ['$ps', 0] } } },
      // Extraire une note potentielle depuis les meta_data de l'item
      {
        $addFields: {
          item_meta_note: {
            $let: {
              vars: {
                notes: {
                  $filter: {
                    input: { $ifNull: ['$meta_data', []] },
                    as: 'm',
                    cond: {
                      $regexMatch: {
                        input: { $toString: '$$m.key' },
                        regex: '(customer_)?note|order_?note|message|instructions',
                        options: 'i'
                      }
                    }
                  }
                }
              },
              in: { $arrayElemAt: ['$$notes.value', 0] }
            }
          }
        }
      },
      // Rapatrier une note au niveau commande depuis d'autres items de la même commande
      {
        $lookup: {
          from: 'order_items',
          let: { oid: '$order_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$order_id', '$$oid'] } } },
            { $project: { customer_note: 1 } }
          ],
          as: 'ord'
        }
      },
      // Priorité: note explicite -> meta_data de l'item -> notes de production
      {
        $addFields: {
          order_customer_note: {
            $let: {
              vars: { ocn: { $arrayElemAt: ['$ord.customer_note', 0] } },
              in: {
                $ifNull: [
                  '$$ocn',
                  { $ifNull: ['$item_meta_note', { $ifNull: ['$production_status.notes', null] }] }
                ]
              }
            }
          }
        }
      },
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
                customer_note: { $first: '$order_customer_note' },
                items_count: { $sum: 1 },
                items: { $push: '$$ROOT' }
              }
            },
            // Récupérer TOUTES les lignes de la commande (tous types) pour calculer x/y global
            {
              $lookup: {
                from: 'order_items',
                localField: 'order_id',
                foreignField: 'order_id',
                as: 'all_items'
              }
            },
            { $addFields: { all_line_item_ids: { $map: { input: '$all_items', as: 'it', in: '$$it.line_item_id' } } } },
            { $addFields: { order_number: { $ifNull: ['$order_number', '$order_id'] }, customer_name: { $ifNull: ['$customer_name', '$customer'] }, customer_email: { $ifNull: ['$customer_email', null] } } },
            { $addFields: { all_line_item_ids: { $sortArray: { input: '$all_line_item_ids', sortBy: 1 } } } },
            { $project: { all_items: 0 } },
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
          // Statistiques globales par statut AU NIVEAU COMMANDE (order-level)
          orderStatusCounts: [
            ...baseItemStages,
            { $group: { _id: '$order_id', statuses: { $addToSet: '$production_status.status' }, urgents: { $addToSet: '$production_status.urgent' } } },
            { $addFields: {
                uniqueStatuses: { $setUnion: ['$statuses', []] },
                hasUrgent: {
                  $anyElementTrue: {
                    $map: {
                      input: { $setUnion: ['$urgents', []] },
                      as: 'u',
                      in: { $cond: [{ $eq: ['$$u', true] }, true, false] }
                    }
                  }
                }
              } 
            },
            { $addFields: {
                order_status: {
                  $switch: {
                    branches: [
                      { case: { $setEquals: ['$uniqueStatuses', ['termine']] }, then: 'termine' },
                      { case: { $in: ['en_cours', '$uniqueStatuses'] }, then: 'en_cours' },
                      { case: { $in: ['en_pause', '$uniqueStatuses'] }, then: 'en_pause' }
                    ],
                    default: 'a_faire'
                  }
                }
              }
            },
            { $group: { _id: '$order_status', count: { $sum: 1 }, urgentOrders: { $sum: { $cond: ['$hasUrgent', 1, 0] } } } }
          ]
        }
      }
    ]

    const agg = await items.aggregate(pipeline).toArray()
    const data = agg[0]?.data || []
    const total = (agg[0]?.totalCount?.[0]?.count) || 0
    const orderStatusCountsArr = agg[0]?.orderStatusCounts || []
    const stats = orderStatusCountsArr.reduce((acc, s) => {
      const key = s._id || 'a_faire'
      acc[key] = s.count
      return acc
    }, { a_faire: 0, en_cours: 0, en_pause: 0, termine: 0, urgent: 0, total })
    // Urgent au niveau commande: sommer les urgentOrders
    stats.urgent = orderStatusCountsArr.reduce((sum, s) => sum + (s.urgentOrders || 0), 0)

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
