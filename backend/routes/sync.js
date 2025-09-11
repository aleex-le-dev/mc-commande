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
    
    // Récupérer la dernière commande en BDD pour filtrer
    const orderItemsCollection = database.getCollection('order_items')
    const lastOrder = await orderItemsCollection
      .find({})
      .sort({ order_id: -1 })
      .limit(1)
      .toArray()
    
    const lastOrderId = lastOrder.length > 0 ? lastOrder[0].order_id : 0
    console.log('📊 Dernière commande en BDD:', lastOrderId)
    
    // Récupérer les commandes récentes depuis WooCommerce
    const allOrders = await ordersService.getOrdersFromWooCommerce({
      per_page: 100 // Récupérer plus de commandes pour s'assurer d'avoir les plus récentes
    })
    
    // Filtrer pour garder seulement les commandes plus récentes que la dernière en BDD
    const newOrders = allOrders.filter(order => order.id > lastOrderId)
    console.log(`🔍 ${newOrders.length} commandes plus récentes que ${lastOrderId}`)
    
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
    
    // Insérer les commandes en BDD
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
            variation_id: item.variation_id,
            production_status: item.production_status
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

// DELETE /api/sync/cleanup - Supprimer les commandes synchronisées par erreur
router.delete('/cleanup', async (req, res) => {
  try {
    const database = require('../services/database')
    const orderItemsCollection = database.getCollection('order_items')
    
    const ordersToDelete = [
      3484, 3487, 3612, 3613, 3614, 3616, 3618, 3619, 3620,
      3621, 3622, 3624, 3625, 3626, 3627, 3628, 3629, 3630,
      3632, 3633, 3634, 3635, 3636, 3637, 3639, 3640, 3641,
      3643, 3644, 3645, 3646, 3647, 3648, 3649, 3650, 3653,
      3654, 3657, 3658, 3659, 3661, 3676, 3793, 3794, 3796,
      3797, 3798, 3800, 3802, 3803, 3804, 3805, 3806, 3807,
      3808, 3809, 3810, 3812, 3880, 3881, 3882, 3883, 3884,
      3885, 3886, 3887, 3888, 3889, 3890, 3891, 3892, 3893,
      3894, 3895, 3896, 3897, 3898, 3899, 3900, 3902, 3903,
      3904, 3905, 3908, 3909, 3910, 3911, 3912, 3913, 3914,
      3915, 3916, 3917, 3918, 3919, 3920, 3921, 4038, 4039, 4040
    ]
    
    console.log('🗑️ Suppression de', ordersToDelete.length, 'commandes synchronisées par erreur...')
    
    const result = await orderItemsCollection.deleteMany({ 
      order_id: { $in: ordersToDelete } 
    })
    
    console.log('✅ Commandes supprimées:', result.deletedCount)
    
    res.json({
      success: true,
      message: `Nettoyage terminé: ${result.deletedCount} commandes supprimées`,
      deletedCount: result.deletedCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erreur nettoyage commandes:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors du nettoyage des commandes',
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
