const express = require('express')
const router = express.Router()

// POST /api/sync/test - Tester la connexion à la base de données
router.post('/test', async (req, res) => {
  try {
    const database = require('../services/database')
    
    // Test de connexion à la base de données
    if (!database.isConnected) {
      return res.status(500).json({ 
        success: false, 
        error: 'Base de données non connectée' 
      })
    }

    // Test simple de lecture
    const testCollection = database.getCollection('order_items')
    const count = await testCollection.countDocuments()
    
    res.json({ 
      success: true, 
      message: 'Connexion à la base de données réussie',
      database: 'Connected',
      collections: {
        order_items: count
      }
    })
  } catch (error) {
    console.error('Erreur test sync:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Erreur de connexion à la base de données',
      details: error.message 
    })
  }
})

// POST /api/sync/orders - Synchroniser les commandes
router.post('/orders', async (req, res) => {
  try {
    const database = require('../services/database')
    const ordersService = require('../services/ordersService')
    
    console.log('🔄 Synchronisation des commandes demandée')
    
    // Récupérer la dernière commande en BDD
    const orderItemsCollection = database.getCollection('order_items')
    const lastOrder = await orderItemsCollection
      .find({})
      .sort({ order_id: -1 })
      .limit(1)
      .toArray()
    
    const lastOrderId = lastOrder.length > 0 ? lastOrder[0].order_id : 0
    console.log('📊 Dernière commande en BDD:', lastOrderId)
    
    // Récupérer les commandes plus récentes depuis WooCommerce
    const newOrders = await ordersService.getOrdersFromWooCommerce({
      after: lastOrderId,
      per_page: 100
    })
    
    console.log('📦 Nouvelles commandes trouvées:', newOrders.length)
    
    if (newOrders.length === 0) {
      return res.json({
        success: true,
        message: 'Aucune nouvelle commande à synchroniser',
        synchronized: 0,
        lastOrderId: lastOrderId,
        timestamp: new Date().toISOString()
      })
    }
    
    // Insérer les nouvelles commandes en BDD
    const insertedOrders = []
    for (const order of newOrders) {
      try {
        // Vérifier si la commande existe déjà
        const existingOrder = await orderItemsCollection.findOne({ order_id: order.id })
        if (existingOrder) {
          console.log(`⚠️ Commande ${order.id} déjà existante, ignorée`)
          continue
        }
        
        // Transformer et insérer la commande
        const transformedOrder = await ordersService.transformWooCommerceOrder(order)
        
        // Insérer chaque item de la commande
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
            variation_id: item.variation_id
          }
          
          await orderItemsCollection.insertOne(orderItem)
        }
        
        insertedOrders.push(transformedOrder)
        console.log(`✅ Commande ${order.id} synchronisée avec ${transformedOrder.items.length} articles`)
      } catch (error) {
        console.error(`❌ Erreur synchronisation commande ${order.id}:`, error)
      }
    }
    
    const result = {
      success: true,
      message: `Synchronisation réussie: ${insertedOrders.length} nouvelles commandes`,
      synchronized: insertedOrders.length,
      lastOrderId: lastOrderId,
      newOrders: insertedOrders.map(o => o.order_id),
      timestamp: new Date().toISOString()
    }
    
    console.log('✅ Synchronisation terminée:', result)
    res.json(result)
  } catch (error) {
    console.error('Erreur synchronisation commandes:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Erreur de synchronisation des commandes',
      details: error.message 
    })
  }
})

// POST /api/sync/wordpress - Tester la connexion WordPress
router.post('/wordpress', async (req, res) => {
  try {
    const { url, username, password } = req.body
    
    if (!url || !username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL, nom d\'utilisateur et mot de passe requis' 
      })
    }

    // Test de connexion WordPress (simulation)
    // Dans un vrai projet, vous feriez un appel à l'API WordPress
    const isValidUrl = url.includes('wordpress') || url.includes('wp-json')
    
    if (!isValidUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL WordPress invalide' 
      })
    }

    res.json({ 
      success: true, 
      message: 'Connexion WordPress réussie',
      url: url,
      status: 'Connected'
    })
  } catch (error) {
    console.error('Erreur test WordPress:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Erreur de connexion WordPress',
      details: error.message 
    })
  }
})

module.exports = router
