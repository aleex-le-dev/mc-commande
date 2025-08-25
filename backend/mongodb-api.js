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

// Configuration WooCommerce (utiliser les variables existantes)
const WOOCOMMERCE_URL = process.env.VITE_WORDPRESS_URL || 'https://maisoncleo.com'
const WOOCOMMERCE_CONSUMER_KEY = process.env.VITE_WORDPRESS_CONSUMER_KEY
const WOOCOMMERCE_CONSUMER_SECRET = process.env.VITE_WORDPRESS_CONSUMER_SECRET

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
    addSyncLog('🔄 Début de la synchronisation des commandes', 'info')
    
    // Récupérer les commandes depuis WooCommerce
    let woocommerceOrders = []
    
    if (WOOCOMMERCE_CONSUMER_KEY && WOOCOMMERCE_CONSUMER_SECRET) {
      try {
        const authParams = `consumer_key=${WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${WOOCOMMERCE_CONSUMER_SECRET}`
        const url = `${WOOCOMMERCE_URL}/wp-json/wc/v3/orders?${authParams}&per_page=50&status=processing,completed&orderby=date&order=desc`
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(10000)
        })
        
        if (response.ok) {
          woocommerceOrders = await response.json()
        } else {
          addSyncLog(`⚠️ Erreur HTTP ${response.status} lors de la récupération des commandes`, 'warning')
        }
      } catch (error) {
        addSyncLog(`⚠️ Erreur lors de la récupération des commandes WooCommerce: ${error.message}`, 'error')
      }
    } else {
      addSyncLog('⚠️ Clés WooCommerce non configurées, synchronisation impossible', 'error')
      return res.status(500).json({ 
        error: 'Configuration WooCommerce manquante',
        message: 'Veuillez configurer les clés API WooCommerce'
      })
    }
    
    if (woocommerceOrders.length === 0) {
      addSyncLog('ℹ️ Aucune commande à synchroniser', 'info')
      return res.json({
        success: true,
        message: 'Aucune nouvelle commande',
        results: {
          ordersCreated: 0,
          ordersUpdated: 0,
          itemsCreated: 0,
          itemsUpdated: 0
        }
      })
    }
    
    // Synchroniser les commandes
    addSyncLog('🔄 Début de la synchronisation avec la base de données...', 'info')
    const syncResults = await syncOrdersToDatabase(woocommerceOrders)
    
    // Afficher le message approprié selon le résultat
    if (syncResults.ordersCreated === 0 && syncResults.itemsCreated === 0) {
      addSyncLog('ℹ️ Aucune nouvelle commande à traiter', 'info')
    } else {
      addSyncLog('✅ Synchronisation terminée avec succès', 'success')
    }
    
    res.json({
      success: true,
      message: 'Synchronisation réussie',
      results: syncResults
    })
    
  } catch (error) {
    addSyncLog(`❌ Erreur lors de la synchronisation: ${error.message}`, 'error')
    res.status(500).json({ 
      error: 'Erreur lors de la synchronisation',
      message: error.message 
    })
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
    const itemsCollection = db.collection('order_items')
    
    // Récupérer les articles assignés à ce type de production
    const assignedItems = await statusCollection.find({
      production_type: type
    }).toArray()
    
    console.log(`📊 Articles trouvés pour ${type}:`, assignedItems.length)
    
    // Si aucun article n'est dispatché, essayer de dispatcher automatiquement
    if (assignedItems.length === 0) {
      console.log(`🔄 Aucun article dispatché pour ${type}, tentative de dispatch automatique...`)
      
      // Récupérer tous les articles
      const allItems = await itemsCollection.find({}).toArray()
      console.log(`📋 Total d'articles en base:`, allItems.length)
      
      // Dispatcher automatiquement les articles non dispatchés
      for (const item of allItems) {
        const existingStatus = await statusCollection.findOne({
          order_id: item.order_id,
          line_item_id: item.line_item_id
        })
        
        if (!existingStatus) {
          const productionType = determineProductionType(item.product_name)
          console.log(`📋 Dispatch automatique: ${item.product_name} -> ${productionType}`)
          
          if (productionType === type) {
            const productionStatus = {
              order_id: parseInt(item.order_id),
              line_item_id: parseInt(item.line_item_id),
              status: 'a_faire',
              production_type: productionType,
              assigned_to: null,
              created_at: new Date(),
              updated_at: new Date()
            }
            
            await statusCollection.insertOne(productionStatus)
            assignedItems.push(productionStatus)
          }
        }
      }
      
      console.log(`✅ Articles dispatchés pour ${type}:`, assignedItems.length)
    }
    
    // Récupérer les détails des commandes et articles
    const ordersWithDetails = await Promise.all(assignedItems.map(async (status) => {
      const order = await db.collection('orders_sync').findOne({ order_id: status.order_id })
      const item = await db.collection('order_items').findOne({
        order_id: status.order_id,
        line_item_id: status.line_item_id
      })
      
      // Retourner la structure attendue par le frontend
      return {
        ...order,
        items: [{
          ...item,
          production_status: status
        }]
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

// PUT /api/production/redispatch - Redispatch un article vers un autre type de production
app.put('/api/production/redispatch', async (req, res) => {
  try {
    const { order_id, line_item_id, new_production_type } = req.body
    
    if (!order_id || !line_item_id || !new_production_type) {
      return res.status(400).json({ error: 'Paramètres manquants' })
    }
    
    const statusCollection = db.collection('production_status')
    
    // Vérifier que l'article existe
    const existingStatus = await statusCollection.findOne({
      order_id: parseInt(order_id),
      line_item_id: parseInt(line_item_id)
    })
    
    if (!existingStatus) {
      return res.status(404).json({ error: 'Article non trouvé' })
    }
    
    // Mettre à jour le type de production
    const result = await statusCollection.updateOne(
      {
        order_id: parseInt(order_id),
        line_item_id: parseInt(line_item_id)
      },
      {
        $set: {
          production_type: new_production_type,
          updated_at: new Date()
        }
      }
    )
    
    res.json({ 
      success: true, 
      message: `Article redispatché vers ${new_production_type}`,
      result 
    })
  } catch (error) {
    console.error('Erreur PUT /production/redispatch:', error)
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

// Fonction pour synchroniser toutes les commandes vers la base de données
async function syncOrdersToDatabase(woocommerceOrders) {
  const syncResults = {
    ordersCreated: 0,
    ordersUpdated: 0,
    itemsCreated: 0,
    itemsUpdated: 0,
    errors: []
  }
  
  // Récupérer les IDs des commandes déjà existantes
  const ordersCollection = db.collection('orders_sync')
  const existingOrderIds = await ordersCollection.distinct('order_id')
  
  addSyncLog(`📊 ${existingOrderIds.length} commandes déjà existantes en BDD`, 'info')
  
  // Filtrer pour ne traiter que les nouvelles commandes
  const newOrders = woocommerceOrders.filter(order => !existingOrderIds.includes(order.id))
  const existingOrders = woocommerceOrders.filter(order => existingOrderIds.includes(order.id))
  
  if (newOrders.length === 0) {
    addSyncLog('ℹ️ Aucune nouvelle commande à traiter', 'info')
    return syncResults
  }
  
  addSyncLog(`🔄 Traitement de ${newOrders.length} nouvelles commandes...`, 'info')
  
  // Traiter seulement les nouvelles commandes
  for (const order of newOrders) {
    try {
      addSyncLog(`✨ Création de la nouvelle commande #${order.number}`, 'success')
      const orderResult = await syncOrderToDatabase(order)
      if (orderResult.created) {
        syncResults.ordersCreated++
      }
      
      // Nouveaux articles - création complète
      for (const item of order.line_items || []) {
        const itemResult = await syncOrderItem(order.id, item)
        if (itemResult.created) {
          syncResults.itemsCreated++
          
          // Dispatcher automatiquement l'article vers la production
          await dispatchItemToProduction(order.id, item.id, item.name)
        }
      }
    } catch (error) {
      addSyncLog(`❌ Erreur sur la commande #${order.number}: ${error.message}`, 'error')
      syncResults.errors.push({
        orderId: order.id,
        error: error.message
      })
    }
  }
  
  addSyncLog(`📊 Résultats: ${syncResults.ordersCreated} créées, ${syncResults.itemsCreated} articles créés`, 'info')
  
  // Dispatcher automatiquement les articles existants qui n'ont pas de statut de production
  if (syncResults.itemsCreated > 0) {
    addSyncLog('🔄 Dispatch automatique des articles vers la production...', 'info')
    await dispatchExistingItemsToProduction()
  }
  
  return syncResults
}

// Fonction pour dispatcher automatiquement un article vers la production
async function dispatchItemToProduction(orderId, lineItemId, productName) {
  try {
    const statusCollection = db.collection('production_status')
    
    // Déterminer le type de production basé sur le nom du produit
    const productionType = determineProductionType(productName)
    
    // Créer le statut de production avec "a_faire"
    const productionStatus = {
      order_id: parseInt(orderId),
      line_item_id: parseInt(lineItemId),
      status: 'a_faire',
      production_type: productionType,
      assigned_to: null,
      created_at: new Date(),
      updated_at: new Date()
    }
    
    await statusCollection.insertOne(productionStatus)
    
    addSyncLog(`📋 Article dispatché vers ${productionType}`, 'info')
  } catch (error) {
    console.warn(`Erreur lors du dispatch automatique vers la production: ${error.message}`)
  }
}

// Fonction pour déterminer le type de production d'un produit
function determineProductionType(productName) {
  const name = productName.toLowerCase()
  
  // Seulement les mots spécifiquement liés au tricot/maille
  const mailleKeywords = [
    'tricotée', 'tricoté', 'knitted'
  ]
  
  // Si le produit contient un de ces mots → maille, sinon → couture
  if (mailleKeywords.some(keyword => name.includes(keyword))) {
    return 'maille'
  }
  
  return 'couture'
}

// Fonction pour dispatcher automatiquement les articles existants vers la production
async function dispatchExistingItemsToProduction() {
  try {
    const itemsCollection = db.collection('order_items')
    const statusCollection = db.collection('production_status')
    
    // Récupérer tous les articles qui n'ont pas encore de statut de production
    const itemsWithoutStatus = await itemsCollection.aggregate([
      {
        $lookup: {
          from: 'production_status',
          localField: 'line_item_id',
          foreignField: 'line_item_id',
          as: 'status'
        }
      },
      {
        $match: {
          status: { $size: 0 }
        }
      }
    ]).toArray()
    
    if (itemsWithoutStatus.length > 0) {
      addSyncLog(`📋 Dispatch de ${itemsWithoutStatus.length} articles existants...`, 'info')
      
      for (const item of itemsWithoutStatus) {
        const productionType = determineProductionType(item.product_name)
        
        const productionStatus = {
          order_id: parseInt(item.order_id),
          line_item_id: parseInt(item.line_item_id),
          status: 'a_faire',
          production_type: productionType,
          assigned_to: null,
          created_at: new Date(),
          updated_at: new Date()
        }
        
        await statusCollection.insertOne(productionStatus)
      }
      
      addSyncLog(`✅ ${itemsWithoutStatus.length} articles dispatchés avec succès`, 'success')
    }
  } catch (error) {
    console.warn(`Erreur lors du dispatch des articles existants: ${error.message}`)
  }
}

// Fonction pour synchroniser une commande vers la base de données
async function syncOrderToDatabase(order) {
  const ordersCollection = db.collection('orders_sync')
  
  // Créer la nouvelle commande
  const orderData = {
    order_id: order.id,
    order_number: order.number,
    order_date: new Date(order.date_created),
    customer_name: order.billing?.first_name + ' ' + order.billing?.last_name,
    customer_email: order.billing?.email,
    customer_phone: order.billing?.phone,
    customer_address: `${order.billing?.address_1}, ${order.billing?.postcode} ${order.billing?.city}`,
    customer_note: order.customer_note || '',
    status: order.status,
    total: parseFloat(order.total) || 0,
    created_at: new Date(),
    updated_at: new Date()
  }
  
  const result = await ordersCollection.insertOne(orderData)
  
  return {
    created: result.insertedCount > 0,
    updated: false
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
  
  // Créer le nouvel article
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
    created_at: new Date(),
    updated_at: new Date()
  }
  
  const result = await itemsCollection.insertOne(itemData)
  
  return {
    created: result.insertedCount > 0,
    updated: false
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

// Variable globale pour stocker le dernier log de synchronisation
let lastSyncLog = null

// Fonction pour ajouter un log (remplace le précédent)
function addSyncLog(message, type = 'info') {
  const log = {
    timestamp: new Date().toISOString(),
    message: message,
    type: type
  }
  
  // Remplacer le log précédent au lieu d'accumuler
  lastSyncLog = log
  
  console.log(`[${type.toUpperCase()}] ${message}`)
}

// GET /api/sync/logs - Récupérer le dernier log de synchronisation
app.get('/api/sync/logs', (req, res) => {
  res.json({
    success: true,
    log: lastSyncLog,
    hasLog: lastSyncLog !== null
  })
})

// POST /api/sync/logs/clear - Vider le log
app.post('/api/sync/logs/clear', (req, res) => {
  lastSyncLog = null
  res.json({
    success: true,
    message: 'Log vidé avec succès'
  })
})

// GET /api/debug/status - Route de debug pour vérifier l'état de la base
app.get('/api/debug/status', async (req, res) => {
  try {
    const ordersCollection = db.collection('orders_sync')
    const itemsCollection = db.collection('order_items')
    const statusCollection = db.collection('production_status')
    
    const totalOrders = await ordersCollection.countDocuments()
    const totalItems = await itemsCollection.countDocuments()
    const totalStatuses = await statusCollection.countDocuments()
    
    const statusesByType = await statusCollection.aggregate([
      {
        $group: {
          _id: '$production_type',
          count: { $sum: 1 }
        }
      }
    ]).toArray()
    
    const itemsWithoutStatus = await itemsCollection.aggregate([
      {
        $lookup: {
          from: 'production_status',
          localField: 'line_item_id',
          foreignField: 'line_item_id',
          as: 'status'
        }
      },
      {
        $match: {
          status: { $size: 0 }
        }
      }
    ]).toArray()
    
    res.json({
      success: true,
      debug: {
        totalOrders,
        totalItems,
        totalStatuses,
        statusesByType,
        itemsWithoutStatus: itemsWithoutStatus.length,
        sampleItems: itemsWithoutStatus.slice(0, 3).map(item => ({
          id: item.line_item_id,
          name: item.product_name,
          order_id: item.order_id
        }))
      }
    })
  } catch (error) {
    console.error('Erreur debug:', error)
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
    console.log(`   PUT  /api/production/redispatch - Redispatch vers un autre type`)
    console.log(`   PUT  /api/production/status - Mettre à jour le statut`)
    console.log(`   GET  /api/production-status - Statuts de production`)
    console.log(`   POST /api/production-status - Mettre à jour statut`)
    console.log(`   GET  /api/woocommerce/products/:productId/permalink - Permalink d'un produit`)
    console.log(`   POST /api/woocommerce/products/permalink/batch - Permalinks en lot`)
    console.log(`   GET  /api/sync/logs - Logs de synchronisation`)
    console.log(`   POST /api/sync/logs/clear - Vider les logs`)
    console.log(`   GET  /api/debug/status - Debug de l'état de la base`)
  })
}

startServer().catch(console.error)
