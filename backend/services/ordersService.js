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
      // Conserver le production_type et autres champs présents dans order_items.production_status
      // puis fusionner avec la doc production_status (si elle existe) pour ne PAS écraser les champs manquants
      { 
        $addFields: { 
          production_status: { 
            $mergeObjects: [
              { $ifNull: ['$production_status', {}] },
              { $ifNull: [ { $arrayElemAt: ['$ps', 0] }, {} ] }
            ]
          } 
        } 
      },
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
                order_number: { $first: '$order_number' },
                order_date: { $min: { $ifNull: ['$order_date', '$created_at'] } },
                status: { $first: '$status' },
                // Remonter les infos client depuis les items (utile pour commandes manuelles)
                customer: { $first: '$customer' },
                customer_name: { $first: '$customer_name' },
                customer_email: { $first: '$customer_email' },
                customer_phone: { $first: '$customer_phone' },
                customer_address: { $first: '$customer_address' },
                shipping_method: { $first: '$shipping_method' },
                shipping_carrier: { $first: '$shipping_carrier' },
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
            // Récupérer les données client complètes depuis orders_sync
            {
              $lookup: {
                from: 'orders_sync',
                localField: 'order_id',
                foreignField: 'order_id',
                as: 'order_data'
              }
            },
            { $addFields: { 
              order_data: { $arrayElemAt: ['$order_data', 0] },
              order_number: { $ifNull: ['$order_number', '$order_id'] }
            } },
            { $addFields: { 
              customer_name: { $ifNull: ['$order_data.customer_name', '$customer_name', '$customer'] },
              customer_email: { $ifNull: ['$order_data.customer_email', '$customer_email', null] },
              customer_phone: { $ifNull: ['$order_data.customer_phone', '$customer_phone', null] },
              customer_address: { $ifNull: ['$order_data.customer_address', '$customer_address', null] },
              customer_note: { $ifNull: ['$order_data.customer_note', '$customer_note', null] },
              shipping_method: { $ifNull: ['$order_data.shipping_method_title', '$order_data.shipping_method', '$shipping_method', null] },
              shipping_carrier: { $ifNull: ['$order_data.shipping_carrier', '$shipping_carrier', null] }
            } },
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
          order_number: { $first: '$order_number' },
          order_date: { $min: { $ifNull: ['$order_date', '$created_at'] } },
          status: { $first: '$status' },
          items_count: { $sum: 1 },
          items: { $push: '$$ROOT' }
        }
      },
      // Récupérer les données client complètes depuis orders_sync
      {
        $lookup: {
          from: 'orders_sync',
          localField: 'order_id',
          foreignField: 'order_id',
          as: 'order_data'
        }
      },
      { $addFields: { 
        order_data: { $arrayElemAt: ['$order_data', 0] },
        order_number: { $ifNull: ['$order_number', '$order_id'] }
      } },
      {
        $addFields: {
          customer_name: { $ifNull: ['$order_data.customer_name', '$customer_name', '$customer'] },
          customer_email: { $ifNull: ['$order_data.customer_email', '$customer_email', null] },
          customer_phone: { $ifNull: ['$order_data.customer_phone', null] },
          customer_address: { $ifNull: ['$order_data.customer_address', null] },
          customer_note: { $ifNull: ['$order_data.customer_note', '$customer_note', null] },
          shipping_method: { $ifNull: ['$order_data.shipping_method_title', '$order_data.shipping_method', null] },
          shipping_carrier: { $ifNull: ['$order_data.shipping_carrier', null] }
        }
      }
    ]).toArray()

    return result[0] || null
  }

  async createOrder(payload) {
    // Création minimale d'une commande locale dans order_items
    // payload: { order_id?, order_number?, customer, items: [{ product_id, product_name, quantity, price, production_type }], status?, note? }
    const items = db.getCollection('order_items')
    const now = new Date()
    const providedDate = payload?.order_date ? new Date(payload.order_date) : null
    const orderDate = providedDate && !isNaN(providedDate.getTime()) ? providedDate : now

    const orderId = Number(payload?.order_id) || Math.floor(10_000_000 + Math.random() * 90_000_000)
    const orderNumber = payload?.order_number || String(orderId)
    const status = payload?.status || 'a_faire'
    const customer = payload?.customer || 'Client inconnu'
    const customer_note = payload?.note || ''
    const customer_address_input = typeof payload?.customer_address === 'string' && payload.customer_address.trim().length > 0 ? payload.customer_address.trim() : null
    const customer_email_input = typeof payload?.customer_email === 'string' && payload.customer_email.trim().length > 0 ? payload.customer_email.trim() : null
    const customer_phone_input = typeof payload?.customer_phone === 'string' && payload.customer_phone.trim().length > 0 ? payload.customer_phone.trim() : null
    const customer_country_input = typeof payload?.customer_country === 'string' && payload.customer_country.trim().length > 0 ? payload.customer_country.trim().toUpperCase() : null
    // Ne pas forcer shipping_method/carrier pour commandes manuelles; laisser null et se baser sur BDD/affichage
    const shipping_method_input = null
    const shipping_carrier_input = null
    const itemsInput = Array.isArray(payload?.items) && payload.items.length > 0 ? payload.items : [
      { product_id: 0, product_name: 'Article', quantity: 1, price: 0, production_type: 'couture' }
    ]

    const totalAmount = itemsInput.reduce((s, x) => s + Number(x.price || 0) * Number(x.quantity || 1), 0)
    const toInsert = itemsInput.map((it, idx) => ({
      order_id: orderId,
      order_number: orderNumber,
      order_date: orderDate,
      status,
      customer,
      customer_email: customer_email_input,
      customer_phone: customer_phone_input,
      customer_address: customer_address_input,
      customer_country: customer_country_input,
      customer_note,
      shipping_method: shipping_method_input,
      shipping_carrier: shipping_carrier_input,
      total: totalAmount,
      created_at: now,
      updated_at: now,
      line_item_id: Number(it.line_item_id) || (orderId * 1000 + idx + 1),
      product_id: Number(it.product_id) || 0,
      product_name: String(it.product_name || 'Article'),
      quantity: Number(it.quantity) || 1,
      price: Number(it.price) || 0,
      meta_data: Array.isArray(it.meta_data) ? it.meta_data : [],
      image_url: null,
      permalink: null,
      variation_id: null,
      production_status: {
        status: 'a_faire',
        production_type: String(it.production_type || 'couture'),
        urgent: false,
        notes: null,
        updated_at: now
      }
    }))

    await items.insertMany(toInsert)

    return orderId
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

  async deleteOrderItem(orderId, lineItemId) {
    const items = db.getCollection('order_items')
    const res = await items.deleteOne({ order_id: parseInt(orderId), line_item_id: parseInt(lineItemId) })
    return res.deletedCount === 1
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

  async updateOrderNote(orderId, note) {
    try {
      const items = db.getCollection('order_items')
      
      // Mettre à jour tous les order_items de cette commande avec la note
      const result = await items.updateMany(
        { order_id: orderId },
        { 
          $set: { 
            customer_note: note,
            updated_at: new Date()
          }
        }
      )
      
      return result.modifiedCount > 0
    } catch (error) {
      console.error('Erreur mise à jour note commande:', error)
      throw error
    }
  }

  async getArchivedOrders(filters = {}) {
    try {
      const archivedOrders = db.getCollection('archived_orders')
      
      const match = {}
      
      if (filters.search) {
        match.$or = [
          { order_number: { $regex: filters.search, $options: 'i' } },
          { customer: { $regex: filters.search, $options: 'i' } },
          { order_id: isNaN(parseInt(filters.search)) ? undefined : parseInt(filters.search) }
        ].filter(Boolean)
      }

      const sort = { archived_date: -1 } // Trier par date d'archivage
      const limit = parseInt(filters.limit) || 50
      const page = parseInt(filters.page) || 1
      const skip = (page - 1) * limit

      const [orders, totalCount] = await Promise.all([
        archivedOrders.find(match).sort(sort).skip(skip).limit(limit).toArray(),
        archivedOrders.countDocuments(match)
      ])

      return {
        orders,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    } catch (error) {
      console.error('Erreur récupération commandes archivées:', error)
      throw error
    }
  }

  async archiveOrder(orderId) {
    try {
      const items = db.getCollection('order_items')
      const archivedOrders = db.getCollection('archived_orders')
      
      // Récupérer tous les articles de la commande
      const orderItems = await items.find({ order_id: orderId }).toArray()
      
      if (orderItems.length === 0) {
        return false // Commande non trouvée
      }

      // Créer l'objet commande archivée
      const firstItem = orderItems[0]
      const archivedOrder = {
        order_id: orderId,
        order_number: firstItem.order_number,
        customer: firstItem.customer,
        order_date: firstItem.order_date,
        archived_date: new Date(),
        items: orderItems,
        total_items: orderItems.length
      }

      // Sauvegarder dans les archives
      await archivedOrders.insertOne(archivedOrder)

      // Supprimer de la collection active
      await items.deleteMany({ order_id: orderId })

      return true
    } catch (error) {
      console.error('Erreur archivage commande:', error)
      throw error
    }
  }


  // Récupérer les commandes depuis WooCommerce via API REST
  async getOrdersFromWooCommerce(options = {}) {
    try {
      const baseUrl = process.env.VITE_WORDPRESS_URL
      const consumerKey = process.env.VITE_WORDPRESS_CONSUMER_KEY
      const consumerSecret = process.env.VITE_WORDPRESS_CONSUMER_SECRET
      const apiVersion = process.env.VITE_WORDPRESS_API_VERSION || 'wc/v3'
      
      const params = new URLSearchParams({
        per_page: options.per_page || 100,
        orderby: 'id',
        order: 'desc', // Récupérer les plus récentes en premier
        status: 'processing,completed,on-hold'
      })

      const url = `${baseUrl}/wp-json/${apiVersion}/orders?${params.toString()}`
      
      console.log('🔄 Récupération commandes WooCommerce:', url)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64'),
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Erreur API WooCommerce: ${response.status} ${response.statusText}`)
      }

      const orders = await response.json()
      console.log(`📦 ${orders.length} commandes récupérées depuis WooCommerce`)
      return orders
    } catch (error) {
      console.error('Erreur récupération commandes WooCommerce:', error)
      throw error
    }
  }

  // Transformer une commande WooCommerce en format BDD
  async transformWooCommerceOrder(wooOrder) {
    try {
      const transformedOrder = {
        order_id: wooOrder.id,
        order_number: wooOrder.number,
        order_date: new Date(wooOrder.date_created),
        status: wooOrder.status,
        customer: wooOrder.billing.first_name + ' ' + wooOrder.billing.last_name,
        customer_email: wooOrder.billing.email,
        customer_phone: wooOrder.billing.phone,
        customer_address: `${wooOrder.billing.address_1}, ${wooOrder.billing.address_2}, ${wooOrder.billing.city}, ${wooOrder.billing.postcode}, ${wooOrder.billing.country}`,
        customer_note: wooOrder.customer_note || '',
        shipping_method: wooOrder.shipping_lines?.[0]?.method_title || 'Standard',
        shipping_carrier: wooOrder.shipping_lines?.[0]?.method_id || 'standard',
        total: parseFloat(wooOrder.total),
        created_at: new Date(wooOrder.date_created),
        updated_at: new Date(wooOrder.date_modified),
        items: wooOrder.line_items.map(item => {
          // Déterminer le type de production selon le nom du produit
          const productName = item.name.toLowerCase()
          let productionType = 'couture' // Par défaut
          
          // Mots-clés spécifiques pour identifier la maille (tricoté/tricotée/knitted/wool)
          const mailleKeywords = [
            'tricoté', 'tricotée', 'knitted', 'wool'
          ]
          
          // Vérifier si le produit contient des mots-clés de maille
          const isMaille = mailleKeywords.some(keyword => productName.includes(keyword))
          
          if (isMaille) {
            productionType = 'maille'
          }
          
          return {
            line_item_id: item.id,
            product_id: item.product_id,
            product_name: item.name,
            quantity: item.quantity,
            price: parseFloat(item.price),
            meta_data: item.meta_data || [],
            image_url: item.image?.src || null,
            permalink: item.permalink || null,
            variation_id: item.variation_id || null,
            production_status: {
              status: 'a_faire',
              production_type: productionType,
              urgent: false,
              notes: null,
              updated_at: new Date()
            }
          }
        })
      }

      return transformedOrder
    } catch (error) {
      console.error('Erreur transformation commande WooCommerce:', error)
      throw error
    }
  }
}

module.exports = new OrdersService()
