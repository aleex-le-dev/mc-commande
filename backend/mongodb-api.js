require('dotenv').config()
const express = require('express')
const { MongoClient, ObjectId } = require('mongodb')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Configuration MongoDB
const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017'
const dbName = 'maisoncleo'

// Configuration WooCommerce (à ajouter dans .env)
const WOOCOMMERCE_URL = process.env.WOOCOMMERCE_URL || 'https://maisoncleo.com'
const WOOCOMMERCE_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY
const WOOCOMMERCE_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET

console.log('🔍 URL MongoDB configurée:', mongoUrl)
console.log('🔍 Variables d\'environnement:', {
  MONGO_URI: process.env.MONGO_URI ? '✅ Définie' : '❌ Manquante',
  WOOCOMMERCE_URL: WOOCOMMERCE_URL ? '✅ Définie' : '❌ Manquante',
  WOOCOMMERCE_CONSUMER_KEY: WOOCOMMERCE_CONSUMER_KEY ? '✅ Définie' : '❌ Manquante',
  WOOCOMMERCE_CONSUMER_SECRET: WOOCOMMERCE_CONSUMER_SECRET ? '✅ Définie' : '❌ Manquante',
  PORT: process.env.PORT || '3001 (défaut)'
})

let db

// Connexion à MongoDB
async function connectToMongo() {
  try {
    const client = new MongoClient(mongoUrl)
    await client.connect()
    db = client.db(dbName)
    
    // Créer les collections et index nécessaires
    await createCollectionsAndIndexes()
    
    console.log('✅ Connecté à MongoDB Atlas')
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error)
  }
}

// Créer les collections et index
async function createCollectionsAndIndexes() {
  try {
    // Collection des commandes synchronisées
    const ordersCollection = db.collection('orders_sync')
    await ordersCollection.createIndex({ order_id: 1 }, { unique: true })
    await ordersCollection.createIndex({ order_date: -1 })
    
    // Collection des articles de commande
    const itemsCollection = db.collection('order_items')
    await itemsCollection.createIndex({ order_id: 1 })
    await itemsCollection.createIndex({ order_id: 1, line_item_id: 1 }, { unique: true })
    
    // Collection des statuts de production
    const statusCollection = db.collection('production_status')
    await statusCollection.createIndex({ order_id: 1, line_item_id: 1 }, { unique: true })
    await statusCollection.createIndex({ production_type: 1 })
    await statusCollection.createIndex({ status: 1 })
    
    console.log('✅ Collections et index créés')
  } catch (error) {
    console.error('❌ Erreur création collections:', error)
  }
}

// Routes API

// GET /api/woocommerce/products/:productId/permalink - Récupérer le permalink d'un produit
app.get('/api/woocommerce/products/:productId/permalink', async (req, res) => {
  try {
    const { productId } = req.params
    
    if (!WOOCOMMERCE_CONSUMER_KEY || !WOOCOMMERCE_CONSUMER_SECRET) {
      return res.status(500).json({ 
        error: 'Configuration WooCommerce manquante',
        message: 'Veuillez configurer WOOCOMMERCE_CONSUMER_KEY et WOOCOMMERCE_CONSUMER_SECRET'
      })
    }
    
    const authParams = `consumer_key=${WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${WOOCOMMERCE_CONSUMER_SECRET}`
    const url = `${WOOCOMMERCE_URL}/wp-json/wc/v3/products/${productId}?${authParams}&_fields=id,permalink`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Timeout de 5 secondes
      signal: AbortSignal.timeout(5000)
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Produit non trouvé' })
      } else if (response.status >= 500) {
        return res.status(502).json({ error: 'Erreur serveur WooCommerce' })
      } else {
        return res.status(response.status).json({ error: `Erreur HTTP: ${response.status}` })
      }
    }
    
    const product = await response.json()
    const permalink = product?.permalink || null
    
    if (!permalink) {
      return res.status(404).json({ error: 'Permalink non trouvé pour ce produit' })
    }
    
    res.json({ 
      success: true,
      product_id: parseInt(productId),
      permalink: permalink
    })
    
  } catch (error) {
    if (error.name === 'TimeoutError') {
      return res.status(408).json({ error: 'Timeout lors de la récupération du permalink' })
    }
    
    console.error('Erreur GET /woocommerce/products/:productId/permalink:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// GET /api/woocommerce/products/permalink/batch - Récupérer les permalinks de plusieurs produits
app.post('/api/woocommerce/products/permalink/batch', async (req, res) => {
  try {
    const { productIds } = req.body
    
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'Liste de productIds invalide' })
    }
    
    if (!WOOCOMMERCE_CONSUMER_KEY || !WOOCOMMERCE_CONSUMER_SECRET) {
      return res.status(500).json({ 
        error: 'Configuration WooCommerce manquante',
        message: 'Veuillez configurer WOOCOMMERCE_CONSUMER_KEY et WOOCOMMERCE_CONSUMER_SECRET'
      })
    }
    
    const authParams = `consumer_key=${WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${WOOCOMMERCE_CONSUMER_SECRET}`
    const results = []
    const errors = []
    
    // Traiter les produits en parallèle avec un délai pour éviter la surcharge
    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i]
      
      try {
        // Délai entre les requêtes pour éviter la surcharge
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        const url = `${WOOCOMMERCE_URL}/wp-json/wc/v3/products/${productId}?${authParams}&_fields=id,permalink`
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(3000)
        })
        
        if (response.ok) {
          const product = await response.json()
          if (product?.permalink) {
            results.push({
              product_id: parseInt(productId),
              permalink: product.permalink
            })
          }
        } else {
          errors.push({
            product_id: parseInt(productId),
            error: `HTTP ${response.status}`,
            status: response.status
          })
        }
      } catch (error) {
        errors.push({
          product_id: parseInt(productId),
          error: error.message,
          type: error.name
        })
      }
    }
    
    res.json({ 
      success: true,
      results: results,
      errors: errors,
      total_processed: productIds.length,
      total_success: results.length,
      total_errors: errors.length
    })
    
  } catch (error) {
    console.error('Erreur POST /woocommerce/products/permalink/batch:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/sync/orders - Synchroniser les commandes WooCommerce
app.post('/api/sync/orders', async (req, res) => {
  try {
    const { orders } = req.body
    
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: 'Données de commandes invalides' })
    }
    
    const syncResults = {
      ordersCreated: 0,
      ordersUpdated: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      errors: []
    }
    
    for (const order of orders) {
      try {
        // Synchroniser la commande
        const orderResult = await syncOrderToDatabase(order)
        if (orderResult.created) {
          syncResults.ordersCreated++
        } else {
          syncResults.ordersUpdated++
        }
        
        // Synchroniser les articles
        for (const item of order.line_items || []) {
          const itemResult = await syncOrderItem(order.id, item)
          if (itemResult.created) {
            syncResults.itemsCreated++
          } else {
            syncResults.itemsUpdated++
          }
        }
      } catch (error) {
        syncResults.errors.push({
          orderId: order.id,
          error: error.message
        })
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Synchronisation terminée',
      results: syncResults
    })
  } catch (error) {
    console.error('Erreur POST /sync/orders:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/orders - Récupérer toutes les commandes avec articles et statuts
app.get('/api/orders', async (req, res) => {
  try {
    const ordersCollection = db.collection('orders_sync')
    const itemsCollection = db.collection('order_items')
    const statusCollection = db.collection('production_status')
    
    // Récupérer toutes les commandes
    const orders = await ordersCollection.find({}).sort({ order_date: -1 }).toArray()
    
    // Pour chaque commande, récupérer les articles et statuts
    const ordersWithDetails = await Promise.all(orders.map(async (order) => {
      const items = await itemsCollection.find({ order_id: order.order_id }).toArray()
      
      // Ajouter les statuts de production à chaque article
      const itemsWithStatus = await Promise.all(items.map(async (item) => {
        const status = await statusCollection.findOne({
          order_id: order.order_id,
          line_item_id: item.line_item_id
        })
        
        return {
          ...item,
          production_status: status || {
            status: 'a_faire',
            production_type: null,
            assigned_to: null
          }
        }
      }))
      
      return {
        ...order,
        items: itemsWithStatus
      }
    }))
    
    res.json({ orders: ordersWithDetails })
  } catch (error) {
    console.error('Erreur GET /orders:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/orders/production/:type - Récupérer les commandes par type de production
app.get('/api/orders/production/:type', async (req, res) => {
  try {
    const { type } = req.params // 'couture' ou 'maille'
    const statusCollection = db.collection('production_status')
    
    // Récupérer les articles assignés à ce type de production
    const assignedItems = await statusCollection.find({
      production_type: type
    }).toArray()
    
    // Récupérer les détails des commandes et articles
    const ordersWithDetails = await Promise.all(assignedItems.map(async (status) => {
      const order = await db.collection('orders_sync').findOne({ order_id: status.order_id })
      const item = await db.collection('order_items').findOne({
        order_id: status.order_id,
        line_item_id: status.line_item_id
      })
      
      return {
        order,
        item: {
          ...item,
          production_status: status
        }
      }
    }))
    
    res.json({ orders: ordersWithDetails })
  } catch (error) {
    console.error('Erreur GET /orders/production/:type:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/production/dispatch - Dispatcher un article vers la production
app.post('/api/production/dispatch', async (req, res) => {
  try {
    const { order_id, line_item_id, production_type, assigned_to } = req.body
    
    if (!order_id || !line_item_id || !production_type) {
      return res.status(400).json({ error: 'Paramètres manquants' })
    }
    
    const statusCollection = db.collection('production_status')
    
    const result = await statusCollection.updateOne(
      {
        order_id: parseInt(order_id),
        line_item_id: parseInt(line_item_id)
      },
      {
        $set: {
          order_id: parseInt(order_id),
          line_item_id: parseInt(line_item_id),
          status: 'en_cours',
          production_type,
          assigned_to: assigned_to || null,
          created_at: new Date(),
          updated_at: new Date()
        }
      },
      { upsert: true }
    )
    
    res.json({ 
      success: true, 
      message: 'Article dispatché vers la production',
      result 
    })
  } catch (error) {
    console.error('Erreur POST /production/dispatch:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/production/status - Mettre à jour le statut de production
app.put('/api/production/status', async (req, res) => {
  try {
    const { order_id, line_item_id, status, notes } = req.body
    
    if (!order_id || !line_item_id || !status) {
      return res.status(400).json({ error: 'Paramètres manquants' })
    }
    
    const statusCollection = db.collection('production_status')
    
    const result = await statusCollection.updateOne(
      {
        order_id: parseInt(order_id),
        line_item_id: parseInt(line_item_id)
      },
      {
        $set: {
          status,
          notes: notes || null,
          updated_at: new Date()
        }
      }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Article non trouvé' })
    }
    
    res.json({ 
      success: true, 
      message: 'Statut mis à jour',
      result 
    })
  } catch (error) {
    console.error('Erreur PUT /production/status:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Fonctions utilitaires

async function syncOrderToDatabase(order) {
  const ordersCollection = db.collection('orders_sync')
  
  const orderData = {
    order_id: order.id,
    order_number: order.number,
    order_date: new Date(order.date_created),
    customer_name: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim(),
    customer_email: order.billing?.email || '',
    customer_phone: order.billing?.phone || '',
    customer_address: `${order.billing?.address_1 || ''}, ${order.billing?.city || ''}, ${order.billing?.postcode || ''}`.trim(),
    total: parseFloat(order.total) || 0,
    status: order.status,
    updated_at: new Date()
  }
  
  const result = await ordersCollection.updateOne(
    { order_id: order.id },
    { $set: orderData },
    { upsert: true }
  )
  
  return {
    created: result.upsertedCount > 0,
    updated: result.modifiedCount > 0
  }
}

async function syncOrderItem(orderId, item) {
  const itemsCollection = db.collection('order_items')
  
  // Récupérer le permalink depuis WooCommerce via notre API
  let permalink = null
  try {
    if (WOOCOMMERCE_CONSUMER_KEY && WOOCOMMERCE_CONSUMER_SECRET) {
      const authParams = `consumer_key=${WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${WOOCOMMERCE_CONSUMER_SECRET}`
      const url = `${WOOCOMMERCE_URL}/wp-json/wc/v3/products/${item.product_id}?${authParams}&_fields=id,permalink`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(3000)
      })
      
      if (response.ok) {
        const product = await response.json()
        permalink = product?.permalink || null
      }
    }
  } catch (error) {
    console.warn(`Erreur lors de la récupération du permalink pour le produit ${item.product_id}:`, error.message)
  }
  
  const itemData = {
    order_id: orderId,
    line_item_id: item.id,
    product_name: item.name,
    product_id: item.product_id,
    variation_id: item.variation_id,
    quantity: item.quantity,
    price: parseFloat(item.price) || 0,
    permalink: permalink, // Stocker le vrai permalink
    meta_data: item.meta_data || [],
    created_at: new Date()
  }
  
  const result = await itemsCollection.updateOne(
    { order_id: orderId, line_item_id: item.id },
    { $set: itemData },
    { upsert: true }
  )
  
  return {
    created: result.upsertedCount > 0,
    updated: result.modifiedCount > 0
  }
}

// Routes existantes pour la compatibilité
app.get('/api/production-status', async (req, res) => {
  try {
    const collection = db.collection('production_status')
    const statuses = await collection.find({}).toArray()
    res.json({ statuses })
  } catch (error) {
    console.error('Erreur GET /production-status:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

app.post('/api/production-status', async (req, res) => {
  try {
    const { order_id, line_item_id, status, assigned_to } = req.body
    const collection = db.collection('production_status')
    
    const result = await collection.updateOne(
      {
        order_id: parseInt(order_id),
        line_item_id: parseInt(line_item_id)
      },
      {
        $set: {
          order_id: parseInt(order_id),
          line_item_id: parseInt(line_item_id),
          status,
          assigned_to,
          updated_at: new Date()
        }
      },
      { upsert: true }
    )
    
    res.json({ 
      success: true, 
      message: 'Statut mis à jour',
      result 
    })
  } catch (error) {
    console.error('Erreur POST /production-status:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Démarrage du serveur
async function startServer() {
  await connectToMongo()
  
  app.listen(PORT, () => {
    console.log(`🚀 Serveur MongoDB API démarré sur le port ${PORT}`)
    console.log(`📊 Endpoints disponibles:`)
    console.log(`   POST /api/sync/orders - Synchroniser les commandes`)
    console.log(`   GET  /api/orders - Récupérer toutes les commandes`)
    console.log(`   GET  /api/orders/production/:type - Commandes par type de production`)
    console.log(`   POST /api/production/dispatch - Dispatcher vers production`)
    console.log(`   PUT  /api/production/status - Mettre à jour le statut`)
    console.log(`   GET  /api/production-status - Statuts de production`)
    console.log(`   POST /api/production-status - Mettre à jour statut`)
    console.log(`   GET  /api/woocommerce/products/:productId/permalink - Permalink d'un produit`)
    console.log(`   POST /api/woocommerce/products/permalink/batch - Permalinks en lot`)
  })
}

startServer().catch(console.error)
