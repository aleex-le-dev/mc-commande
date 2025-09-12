const database = require('./database')
const ordersService = require('./ordersService')

/**
 * Service de synchronisation des commandes WooCommerce → MongoDB.
 * - Lit la dernière commande en BDD
 * - Récupère les commandes récentes depuis WooCommerce
 * - Transforme et insère les items manquants
 * Retourne un résumé d'exécution.
 */
async function synchronizeOrdersOnce() {
  if (!database.isConnected) {
    throw new Error('Base de données non connectée')
  }

  const orderItemsCollection = database.getCollection('order_items')

  const lastOrder = await orderItemsCollection
    .find({})
    .sort({ order_id: -1 })
    .limit(1)
    .toArray()

  const lastOrderId = lastOrder.length > 0 ? lastOrder[0].order_id : 0

  const allOrders = await ordersService.getOrdersFromWooCommerce({ per_page: 100 })
  const newOrders = allOrders.filter(order => order.id > lastOrderId)

  if (newOrders.length === 0) {
    return {
      success: true,
      message: 'Aucune nouvelle commande à synchroniser',
      synchronized: 0,
      lastOrderId,
      newOrders: [],
      timestamp: new Date().toISOString()
    }
  }

  const insertedOrders = []

  for (const order of newOrders) {
    try {
      const existingOrder = await orderItemsCollection.findOne({ order_id: order.id })
      if (existingOrder) {
        continue
      }

      const transformedOrder = await ordersService.transformWooCommerceOrder(order)

      for (const item of transformedOrder.items) {
        const orderItem = {
          order_id: transformedOrder.order_id,
          order_number: transformedOrder.order_number,
          order_date: transformedOrder.order_date,
          status: transformedOrder.status,
          customer: transformedOrder.customer,
          customer_email: transformedOrder.customer_email,
          customer_phone: transformedOrder.customer_phone,
          customer_address: transformedOrder.customer_address,
          customer_note: transformedOrder.customer_note,
          shipping_method: transformedOrder.shipping_method,
          shipping_carrier: transformedOrder.shipping_carrier,
          total: transformedOrder.total,
          created_at: transformedOrder.created_at,
          updated_at: transformedOrder.updated_at,
          line_item_id: item.line_item_id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          meta_data: item.meta_data,
          image_url: item.image_url,
          permalink: item.permalink,
          variation_id: item.variation_id,
          production_status: item.production_status
        }

        await orderItemsCollection.insertOne(orderItem)
      }

      insertedOrders.push(transformedOrder)
    } catch (error) {
      // On journalise les erreurs par commande et on continue
      console.error(`Erreur synchronisation commande ${order.id}:`, error)
    }
  }

  return {
    success: true,
    message: `Synchronisation réussie: ${insertedOrders.length} nouvelles commandes`,
    synchronized: insertedOrders.length,
    lastOrderId,
    newOrders: insertedOrders.map(o => o.order_id),
    timestamp: new Date().toISOString()
  }
}

module.exports = {
  synchronizeOrdersOnce
}


