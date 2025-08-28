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

    // Collection des images produits pour éviter les problèmes CORS
    const imagesCollection = db.collection('product_images')
    await imagesCollection.createIndex({ product_id: 1 }, { unique: true })
    
    // Collection des tricoteuses
    const tricoteusesCollection = db.collection('tricoteuses')
    await tricoteusesCollection.createIndex({ firstName: 1 })
    await tricoteusesCollection.createIndex({ createdAt: -1 })
    
    // Collection des assignations d'articles aux tricoteuses
    const assignmentsCollection = db.collection('article_assignments')
    await assignmentsCollection.createIndex({ article_id: 1 }, { unique: true })
    await assignmentsCollection.createIndex({ tricoteuse_id: 1 })
    await assignmentsCollection.createIndex({ status: 1 })
    await assignmentsCollection.createIndex({ assigned_at: -1 })
    
    // Collection des délais d'expédition
    const delaisCollection = db.collection('delais_expedition')
    await delaisCollection.createIndex({ dateCreation: -1 })
    await delaisCollection.createIndex({ derniereModification: -1 })
    
    console.log('✅ Collections et index créés')
  } catch (error) {
    console.error('❌ Erreur création collections:', error)
  }
}

// Routes API

// GET /api/health - Vérifier la santé du serveur
app.get('/api/health', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ 
        status: 'error', 
        message: 'Base de données non connectée' 
      })
    }
    
    // Test simple de connexion
    await db.admin().ping()
    
    res.json({ 
      status: 'ok', 
      message: 'Serveur opérationnel',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      message: 'Erreur de connexion à la base de données',
      error: error.message
    })
  }
})

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
    const sinceRaw = (req.query && req.query.since) || (req.body && req.body.since) || null
    let afterIso = null
    if (sinceRaw) {
      const sinceDate = new Date(sinceRaw)
      if (!isNaN(sinceDate)) {
        // WooCommerce attend un ISO8601 complet
        sinceDate.setHours(0,0,0,0)
        afterIso = sinceDate.toISOString()
        addSyncLog(`📅 Filtre date activé: depuis ${afterIso}`, 'info')
      } else {
        addSyncLog(`⚠️ Paramètre since invalide: ${sinceRaw}`, 'warning')
      }
    } else {
      // Mode incrémental par défaut: récupérer uniquement après la dernière commande connue
      try {
        const latest = await db.collection('orders_sync').find({}).sort({ order_date: -1 }).limit(1).toArray()
        if (latest && latest.length > 0 && latest[0].order_date) {
          const lastDate = new Date(latest[0].order_date)
          if (!isNaN(lastDate)) {
            afterIso = lastDate.toISOString()
            addSyncLog(`📅 Incrémental: récupération après ${afterIso}`, 'info')
          }
        } else {
          // Si aucune commande en base, ne pas forcer d'historique: partir de maintenant
          const now = new Date()
          afterIso = now.toISOString()
          addSyncLog(`📅 Aucun historique: récupération à partir de maintenant (${afterIso})`, 'info')
        }
      } catch (e) {
        addSyncLog(`⚠️ Impossible de déterminer la dernière commande: ${e.message}`, 'warning')
      }
    }
    
    if (WOOCOMMERCE_CONSUMER_KEY && WOOCOMMERCE_CONSUMER_SECRET) {
      try {
        const authParams = `consumer_key=${WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${WOOCOMMERCE_CONSUMER_SECRET}`
        // 1) Vérification rapide: y a-t-il des commandes nouvelles après la dernière date ?
        if (afterIso) {
          const quickUrlBase = `${WOOCOMMERCE_URL}/wp-json/wc/v3/orders?${authParams}&per_page=1&page=1&status=processing,completed&orderby=date&order=desc&_fields=id,date`
          const quickUrl = `${quickUrlBase}&after=${encodeURIComponent(afterIso)}`
          const quickRes = await fetch(quickUrl, { method: 'GET', headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) })
          if (quickRes.ok) {
            const quickData = await quickRes.json()
            if (Array.isArray(quickData) && quickData.length === 0) {
              addSyncLog('ℹ️ Aucune commande à synchroniser (vérification rapide)', 'info')
              return res.json({
                success: true,
                message: 'Aucune nouvelle commande',
                results: { ordersCreated: 0, ordersUpdated: 0, itemsCreated: 0, itemsUpdated: 0 }
              })
            }
          }
        }

        // 2) Récupération paginée seulement si nécessaire
        const perPage = 100
        let page = 1
        let fetched = []
        currentSyncAbortController = new AbortController()
        while (true) {
          const base = `${WOOCOMMERCE_URL}/wp-json/wc/v3/orders?${authParams}&per_page=${perPage}&page=${page}&status=processing,completed&orderby=date&order=desc`
          const url = afterIso ? `${base}&after=${encodeURIComponent(afterIso)}` : base
        const response = await fetch(url, {
          method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: currentSyncAbortController.signal
          })
          if (!response.ok) {
            addSyncLog(`⚠️ Erreur HTTP ${response.status} lors de la récupération des commandes (page ${page})`, 'warning')
            break
          }
          const data = await response.json()
          fetched = fetched.concat(data)
          addSyncLog(`📥 Page ${page} récupérée: ${data.length} commandes`, 'info')
          if (data.length < perPage) break
          page += 1
        }
        woocommerceOrders = fetched
      } catch (error) {
        addSyncLog(`⚠️ Erreur lors de la récupération des commandes WooCommerce: ${error.message}`, 'error')
      } finally {
        currentSyncAbortController = null
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
      console.log('🔄 Backend - Aucune commande à synchroniser, envoi de la réponse')
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
    console.log('🔄 Backend - Résultats de la synchronisation:', syncResults)
    
    // Afficher le message approprié selon le résultat
    if (syncResults.ordersCreated === 0 && syncResults.itemsCreated === 0) {
      addSyncLog('ℹ️ Aucune nouvelle commande à traiter', 'info')
      console.log('🔄 Backend - Aucune nouvelle commande à traiter')
    } else {
      addSyncLog('✅ Synchronisation terminée avec succès', 'success')
      console.log('🔄 Backend - Synchronisation terminée avec succès')
    }
    
    console.log('🔄 Backend - Envoi de la réponse finale avec les résultats:', syncResults)
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

// GET /api/orders/search/:orderNumber - Rechercher une commande par numéro
app.get('/api/orders/search/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params
    
    // Rechercher la commande par numéro
    const order = await db.collection('orders_sync').findOne({ 
      order_number: orderNumber 
    })
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Commande non trouvée' 
      })
    }
    
    // Récupérer les articles de la commande
    const itemsCollection = db.collection('order_items')
    const items = await itemsCollection.find({ 
      order_id: order.order_id 
    }).toArray()
    
    if (items.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aucun article trouvé pour cette commande' 
      })
    }
    
    // Récupérer les statuts de production pour chaque article
    const statusCollection = db.collection('production_status')
    const itemsWithStatus = await Promise.all(items.map(async (item) => {
      const status = await statusCollection.findOne({
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
    
    // Déterminer le type de production principal (le plus fréquent ou le premier trouvé)
    let mainProductionType = null
    const productionStatuses = itemsWithStatus
      .map(item => item.production_status)
      .filter(status => status && status.production_type)
    
    if (productionStatuses.length > 0) {
      // Compter les types de production
      const typeCounts = {}
      productionStatuses.forEach(status => {
        if (status.production_type) {
          typeCounts[status.production_type] = (typeCounts[status.production_type] || 0) + 1
        }
      })
      
      // Prendre le type le plus fréquent, sinon le premier
      if (Object.keys(typeCounts).length > 0) {
        mainProductionType = Object.entries(typeCounts).reduce((a, b) => 
          typeCounts[a[0]] > typeCounts[b[0]] ? a : b
        )[0]
      } else {
        mainProductionType = productionStatuses[0]?.production_type || null
      }
    }
    
    // Construire la réponse avec les informations de production
    const orderWithProduction = {
      ...order,
      production_type: mainProductionType,
      line_item_id: items[0].line_item_id,
      items: itemsWithStatus,
      all_production_statuses: productionStatuses // Pour debug
    }
    
    // Log pour debug
    console.log(`🔍 Recherche commande ${orderNumber}:`, {
      order_id: order.order_id,
      total_items: itemsWithStatus.length,
      production_type: mainProductionType,
      items_with_status: itemsWithStatus.map(item => ({
        line_item_id: item.line_item_id,
        product_name: item.product_name,
        has_production_status: !!item.production_status,
        production_type: item.production_status?.production_type,
        status: item.production_status?.status
      }))
    })
    
    res.json({ 
      success: true, 
      order: orderWithProduction 
    })
  } catch (error) {
    console.error('Erreur GET /orders/search/:orderNumber:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/orders/:orderId/status - Mettre à jour le statut d'une commande
app.put('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params
    const { status: newStatus } = req.body
    
    if (!newStatus) {
      return res.status(400).json({ 
        success: false, 
        error: 'Statut requis' 
      })
    }
    
    // Mettre à jour le statut dans la collection production_status
    const statusCollection = db.collection('production_status')
    const result = await statusCollection.updateMany(
      { order_id: parseInt(orderId) },
      { 
        $set: { 
          status: newStatus,
          updated_at: new Date()
        } 
      }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Aucune commande trouvée avec cet ID' 
      })
    }
    
    console.log(`✅ Statut mis à jour pour la commande ${orderId}: ${newStatus}`)
    
    res.json({ 
      success: true, 
      message: `Statut mis à jour pour ${result.modifiedCount} article(s)`,
      orderId: parseInt(orderId),
      newStatus,
      modifiedCount: result.modifiedCount
    })
    
  } catch (error) {
    console.error('Erreur PUT /orders/:orderId/status:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/orders - Récupérer toutes les commandes avec articles et statuts
app.get('/api/orders', async (req, res) => {
  try {
    const ordersCollection = db.collection('orders_sync')
    const itemsCollection = db.collection('order_items')
    const statusCollection = db.collection('production_status')
    
    // Récupérer toutes les commandes avec un timeout plus long
    const orders = await ordersCollection.find({})
      .sort({ order_date: 1 })
      .maxTimeMS(30000) // 30 secondes max
      .toArray()
    
    if (orders.length === 0) {
      return res.json({ orders: [] })
    }
    
    // Traiter les commandes par lots pour éviter les timeouts
    const BATCH_SIZE = 50
    const ordersWithDetails = []
    
    for (let i = 0; i < orders.length; i += BATCH_SIZE) {
      const batch = orders.slice(i, i + BATCH_SIZE)
      
      const batchResults = await Promise.all(batch.map(async (order) => {
        try {
          const items = await itemsCollection.find({ order_id: order.order_id })
            .maxTimeMS(10000) // 10 secondes max par commande
            .toArray()
          
          // Ajouter les statuts de production à chaque article
          const itemsWithStatus = await Promise.all(items.map(async (item) => {
            try {
              const status = await statusCollection.findOne({
                order_id: order.order_id,
                line_item_id: item.line_item_id
              }, { maxTimeMS: 5000 })
              
              return {
                ...item,
                production_status: status || {
                  status: 'a_faire',
                  production_type: null,
                  assigned_to: null
                }
              }
            } catch (itemError) {
              console.error(`❌ Erreur statut article ${item.line_item_id}:`, itemError.message)
              return {
                ...item,
                production_status: {
                  status: 'a_faire',
                  production_type: null,
                  assigned_to: null
                }
              }
            }
          }))
          
          return {
            ...order,
            items: itemsWithStatus
          }
        } catch (orderError) {
          console.error(`❌ Erreur commande ${order.order_number}:`, orderError.message)
          return {
            ...order,
            items: []
          }
        }
      }))
      
      ordersWithDetails.push(...batchResults)
      
      // Petite pause entre les lots pour éviter de surcharger MongoDB
      if (i + BATCH_SIZE < orders.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    res.json({ orders: ordersWithDetails })
  } catch (error) {
    console.error('❌ Erreur GET /orders:', error)
    res.status(500).json({ 
      error: 'Erreur serveur', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// DELETE /api/orders/:orderId - Supprimer une commande et ses éléments associés
app.delete('/api/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params
    const numericOrderId = parseInt(orderId)
    if (Number.isNaN(numericOrderId)) {
      return res.status(400).json({ success: false, error: 'orderId invalide' })
    }

    const ordersCollection = db.collection('orders_sync')
    const itemsCollection = db.collection('order_items')
    const statusCollection = db.collection('production_status')

    const orderDelete = await ordersCollection.deleteOne({ order_id: numericOrderId })
    const itemsDelete = await itemsCollection.deleteMany({ order_id: numericOrderId })
    const statusDelete = await statusCollection.deleteMany({ order_id: numericOrderId })

    if (orderDelete.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Commande introuvable' })
    }

    console.log(`🗑️ Commande ${numericOrderId} supprimée (${itemsDelete.deletedCount} articles, ${statusDelete.deletedCount} statuts)`)
    res.json({
      success: true,
      orderId: numericOrderId,
      deleted: {
        order: orderDelete.deletedCount,
        items: itemsDelete.deletedCount,
        statuses: statusDelete.deletedCount
      }
    })
  } catch (error) {
    console.error('Erreur DELETE /orders/:orderId:', error)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// DELETE /api/orders/:orderId/items/:lineItemId - Supprimer un article d'une commande
app.delete('/api/orders/:orderId/items/:lineItemId', async (req, res) => {
  try {
    const { orderId, lineItemId } = req.params
    const numericOrderId = parseInt(orderId)
    const numericLineItemId = parseInt(lineItemId)
    if (Number.isNaN(numericOrderId) || Number.isNaN(numericLineItemId)) {
      return res.status(400).json({ success: false, error: 'Paramètres invalides' })
    }

    const itemsCollection = db.collection('order_items')
    const statusCollection = db.collection('production_status')

    const itemDelete = await itemsCollection.deleteOne({ order_id: numericOrderId, line_item_id: numericLineItemId })
    const statusDelete = await statusCollection.deleteOne({ order_id: numericOrderId, line_item_id: numericLineItemId })

    if (itemDelete.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Article introuvable' })
    }

    console.log(`🗑️ Article ${numericLineItemId} supprimé de la commande ${numericOrderId} (statut supprimé: ${statusDelete.deletedCount})`)
    res.json({
      success: true,
      orderId: numericOrderId,
      lineItemId: numericLineItemId,
      deleted: {
        item: itemDelete.deletedCount,
        status: statusDelete.deletedCount
      }
    })
  } catch (error) {
    console.error('Erreur DELETE /orders/:orderId/items/:lineItemId:', error)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
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
    
    // Trier les commandes par date (anciennes vers récentes)
    ordersWithDetails.sort((a, b) => new Date(a.order_date) - new Date(b.order_date))
    
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
  
  addSyncLog(`🔄 Traitement de ${woocommerceOrders.length} commandes (création/mise à jour)...`, 'info')
  
  // Traiter toutes les commandes en upsert
  for (const order of woocommerceOrders) {
    try {
      const orderResult = await syncOrderToDatabase(order)
      if (orderResult.created) {
        syncResults.ordersCreated++
      } else if (orderResult.updated) {
        syncResults.ordersUpdated++
      }

      for (const item of order.line_items || []) {
        const itemResult = await syncOrderItem(order.id, item)
        if (itemResult.created) {
          syncResults.itemsCreated++
          // Dispatcher automatiquement uniquement les nouveaux articles
          await dispatchItemToProduction(order.id, item.id, item.name)
        } else if (itemResult.updated) {
          syncResults.itemsUpdated++
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
  
  addSyncLog(`📊 Résultats: ${syncResults.ordersCreated} commandes créées, ${syncResults.ordersUpdated} mises à jour, ${syncResults.itemsCreated} articles créés, ${syncResults.itemsUpdated} mis à jour`, 'info')
  
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
  
  // Insert-only: ne pas modifier une commande existante
  const now = new Date()
  // Extraire les infos transporteur depuis WooCommerce
  const firstShippingLine = Array.isArray(order.shipping_lines) && order.shipping_lines.length > 0 
    ? order.shipping_lines[0] 
    : null
  const shippingMethodId = firstShippingLine?.method_id || null
  const shippingMethodTitle = firstShippingLine?.method_title || null
  // Déterminer le transporteur (DHL/UPS/Colissimo, etc.) en inspectant id, title et meta
  let shippingCarrier = null
  const lowerTitle = (shippingMethodTitle || '').toLowerCase()
  const lowerId = (shippingMethodId || '').toLowerCase()
  const metaValues = (firstShippingLine?.meta_data || [])
    .map(m => `${m?.key || ''} ${m?.value || ''}`.toLowerCase())
    .join(' ')
  if (/(dhl)/.test(lowerTitle) || /(dhl)/.test(lowerId) || /(dhl)/.test(metaValues)) {
    shippingCarrier = 'DHL'
  } else if (/(ups)/.test(lowerTitle) || /(ups)/.test(lowerId) || /(ups)/.test(metaValues)) {
    shippingCarrier = 'UPS'
  } else if (/(colissimo|la poste)/.test(lowerTitle) || /(colissimo|laposte)/.test(lowerId) || /(colissimo|la poste)/.test(metaValues)) {
    shippingCarrier = 'Colissimo'
  }
  // Si livraison gratuite, déduire UPS en France sinon DHL
  const isFreeShipping = /(free|gratuit)/.test(lowerTitle) || /(free|gratuit)/.test(lowerId)
  if (!shippingCarrier && isFreeShipping) {
    const country = (order.shipping?.country || order.billing?.country || '').toUpperCase()
    shippingCarrier = country === 'FR' ? 'UPS' : 'DHL'
  }
  const resolvedShippingTitle = shippingMethodTitle || shippingMethodId || null
  // Vérifier si la commande existe déjà
  const existing = await ordersCollection.findOne({ order_id: order.id })
  if (existing) {
    return { created: false, updated: false }
  }
  await ordersCollection.insertOne({
    order_id: order.id,
    order_number: order.number,
    order_date: new Date(order.date_created),
    customer_name: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim(),
    customer_email: order.billing?.email || null,
    customer_phone: order.billing?.phone || null,
    customer_address: `${order.billing?.address_1 || ''}, ${order.billing?.postcode || ''} ${order.billing?.city || ''}`.trim(),
    customer_country: (order.shipping?.country || order.billing?.country || null),
    customer_note: order.customer_note || '',
    status: order.status,
    total: parseFloat(order.total) || 0,
    // Champs transporteur pour l'affichage frontend
    shipping_method: shippingMethodId,
    shipping_title: resolvedShippingTitle,
    shipping_method_title: shippingMethodTitle,
    shipping_carrier: shippingCarrier,
    created_at: now,
    updated_at: now
  })
  return { created: true, updated: false }
}

async function syncOrderItem(orderId, item) {
  const itemsCollection = db.collection('order_items')
  const imagesCollection = db.collection('product_images')
  
  // Insert-only: ne pas modifier un article existant
  const existing = await itemsCollection.findOne({ order_id: orderId, line_item_id: item.id })
  if (existing) {
    return { created: false, updated: false }
  }

  // Récupérer le permalink et l'image depuis WooCommerce via notre API
  let permalink = null
  let imageUrl = null
  try {
    if (WOOCOMMERCE_CONSUMER_KEY && WOOCOMMERCE_CONSUMER_SECRET) {
      const authParams = `consumer_key=${WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${WOOCOMMERCE_CONSUMER_SECRET}`
      const url = `${WOOCOMMERCE_URL}/wp-json/wc/v3/products/${item.product_id}?${authParams}&_fields=id,permalink,images`
      
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
        // Récupérer l'URL de la première image si disponible
        if (product?.images && product.images.length > 0) {
          imageUrl = product.images[0].src || null
        }
      }
    }
  } catch (error) {
    console.warn(`Erreur lors de la récupération des données pour le produit ${item.product_id}:`, error.message)
  }

  // Télécharger et stocker l'image en base pour un accès sans CORS
  if (imageUrl && item.product_id) {
    try {
      const imgResp = await fetch(imageUrl)
      if (imgResp.ok) {
        const contentType = imgResp.headers.get('content-type') || 'image/jpeg'
        const arrayBuffer = await imgResp.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        await imagesCollection.updateOne(
          { product_id: parseInt(item.product_id) },
          {
            $set: {
              product_id: parseInt(item.product_id),
              content_type: contentType,
              data: buffer,
              updated_at: new Date()
            },
            $setOnInsert: { created_at: new Date() }
          },
          { upsert: true }
        )
      }
    } catch (e) {
      console.warn(`Impossible de stocker l'image du produit ${item.product_id}: ${e.message}`)
    }
  }
  
  // Upsert article
  const now = new Date()
  const update = {
    $set: {
      product_name: item.name,
      product_id: item.product_id,
      variation_id: item.variation_id,
      quantity: item.quantity,
      price: parseFloat(item.price) || 0,
      permalink: permalink,
      image_url: imageUrl,
      meta_data: item.meta_data || [],
      updated_at: now
    },
    $setOnInsert: {
      order_id: orderId,
      line_item_id: item.id,
      created_at: now
    }
  }
  const result = await itemsCollection.updateOne({ order_id: orderId, line_item_id: item.id }, update, { upsert: true })
  const created = result.upsertedCount === 1
  const updated = !created && result.matchedCount === 1 && result.modifiedCount > 0
  return { created, updated }
}

// Endpoint pour servir les images stockées (évite les CORS)
app.get('/api/images/:productId', async (req, res) => {
  try {
    const { productId } = req.params
    const imagesCollection = db.collection('product_images')
    const doc = await imagesCollection.findOne({ product_id: parseInt(productId) })

    if (!doc || !doc.data) {
      return res.status(404).json({ error: 'Image non trouvée' })
    }

    res.setHeader('Content-Type', doc.content_type || 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
    return res.end(doc.data.buffer)
  } catch (error) {
    console.error('Erreur GET /api/images/:productId:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

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

// GET /api/production-status/stats - Statistiques de production
app.get('/api/production-status/stats', async (req, res) => {
  try {
    const statusCollection = db.collection('production_status')
    const ordersCollection = db.collection('orders_sync')
    const itemsCollection = db.collection('order_items')
    
    // Compter les documents dans chaque collection
    const totalStatuses = await statusCollection.countDocuments()
    const totalOrders = await ordersCollection.countDocuments()
    const totalItems = await itemsCollection.countDocuments()
    
    // Statistiques par type de production
    const statusesByType = await statusCollection.aggregate([
      {
        $group: {
          _id: '$production_type',
          count: { $sum: 1 }
        }
      }
    ]).toArray()
    
    // Statistiques par statut
    const statusesByStatus = await statusCollection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray()
    
    // Articles sans statut de production
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
      stats: {
        totalOrders,
        totalItems,
        totalStatuses,
        statusesByType,
        statusesByStatus,
        itemsWithoutStatus: itemsWithoutStatus.length,
        sampleItems: itemsWithoutStatus.slice(0, 3).map(item => ({
          id: item.line_item_id,
          name: item.product_name,
          order_id: item.order_id
        }))
      }
    })
  } catch (error) {
    console.error('Erreur GET /production-status/stats:', error)
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

// PUT /api/production-status/:lineItemId/type - Mettre à jour le type de production d'un article
app.put('/api/production-status/:lineItemId/type', async (req, res) => {
  try {
    const { lineItemId } = req.params
    const { production_type } = req.body
    
    if (!production_type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Type de production requis' 
      })
    }
    
    if (!['couture', 'maille'].includes(production_type)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Type de production invalide. Doit être "couture" ou "maille"' 
      })
    }
    
    // Mettre à jour le type de production pour cet article spécifique
    const statusCollection = db.collection('production_status')
    const result = await statusCollection.updateOne(
      { line_item_id: parseInt(lineItemId) },
      { 
        $set: { 
          production_type: production_type,
          updated_at: new Date()
        } 
      }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Aucun article trouvé avec cet ID' 
      })
    }
    
    console.log(`✅ Type de production mis à jour pour l'article ${lineItemId}: ${production_type}`)
    
    res.json({ 
      success: true, 
      message: `Type de production mis à jour pour l'article ${lineItemId}`,
      lineItemId: parseInt(lineItemId),
      production_type,
      modifiedCount: result.modifiedCount
    })
    
  } catch (error) {
    console.error('Erreur PUT /production-status/:lineItemId/type:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Routes API pour les tricoteuses

// GET /api/tricoteuses - Récupérer toutes les tricoteuses
app.get('/api/tricoteuses', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const tricoteusesCollection = db.collection('tricoteuses')
    const tricoteuses = await tricoteusesCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray()
    
    res.json({
      success: true,
      data: tricoteuses
    })
  } catch (error) {
    console.error('Erreur récupération tricoteuses:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/tricoteuses - Créer une nouvelle tricoteuse
app.post('/api/tricoteuses', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { firstName, color, photoUrl, gender } = req.body
    
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ error: 'Le prénom est requis' })
    }
    
    if (!color) {
      return res.status(400).json({ error: 'La couleur est requise' })
    }
    
    const tricoteusesCollection = db.collection('tricoteuses')
    
    const newTricoteuse = {
      firstName: firstName.trim(),
      color,
      photoUrl: photoUrl || '',
      gender: gender || 'feminin', // Par défaut féminin
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const result = await tricoteusesCollection.insertOne(newTricoteuse)
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...newTricoteuse
      }
    })
  } catch (error) {
    console.error('Erreur création tricoteuse:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// PUT /api/tricoteuses/:id - Modifier une tricoteuse
app.put('/api/tricoteuses/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { id } = req.params
    const { firstName, color, photoUrl, gender } = req.body
    
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ error: 'Le prénom est requis' })
    }
    
    if (!color) {
      return res.status(400).json({ error: 'La couleur est requise' })
    }
    
    const tricoteusesCollection = db.collection('tricoteuses')
    
    const updateData = {
      firstName: firstName.trim(),
      color,
      photoUrl: photoUrl || '',
      gender: gender || 'feminin', // Par défaut féminin
      updatedAt: new Date()
    }
    
    const result = await tricoteusesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Tricoteuse non trouvée' })
    }
    
    res.json({
      success: true,
      data: {
        id,
        ...updateData
      }
    })
  } catch (error) {
    console.error('Erreur modification tricoteuse:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// DELETE /api/tricoteuses/:id - Supprimer une tricoteuse
app.delete('/api/tricoteuses/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { id } = req.params
    const tricoteusesCollection = db.collection('tricoteuses')
    
    const result = await tricoteusesCollection.deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Tricoteuse non trouvée' })
    }
    
    res.json({
      success: true,
      message: 'Tricoteuse supprimée avec succès'
    })
  } catch (error) {
    console.error('Erreur suppression tricoteuse:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// Routes pour les assignations d'articles aux tricoteuses

// GET /api/assignments - Récupérer toutes les assignations
app.get('/api/assignments', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const assignmentsCollection = db.collection('article_assignments')
    const assignments = await assignmentsCollection.find({}).sort({ assigned_at: -1 }).toArray()
    
    res.json({
      success: true,
      data: assignments
    })
  } catch (error) {
    console.error('Erreur récupération assignations:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// GET /api/assignments/:articleId - Récupérer l'assignation d'un article
app.get('/api/assignments/:articleId', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { articleId } = req.params
    const assignmentsCollection = db.collection('article_assignments')
    
    const assignment = await assignmentsCollection.findOne({ article_id: articleId })
    
    if (!assignment) {
      return res.status(404).json({ error: 'Aucune assignation trouvée pour cet article' })
    }
    
    res.json({
      success: true,
      data: assignment
    })
  } catch (error) {
    console.error('Erreur récupération assignation:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/assignments - Créer ou mettre à jour une assignation
app.post('/api/assignments', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { article_id, tricoteuse_id, tricoteuse_name, status } = req.body
    
    if (!article_id || !tricoteuse_id || !tricoteuse_name) {
      return res.status(400).json({ error: 'article_id, tricoteuse_id et tricoteuse_name sont requis' })
    }
    
    const assignmentsCollection = db.collection('article_assignments')
    
    // Utiliser upsert pour créer ou mettre à jour
    const result = await assignmentsCollection.updateOne(
      { article_id: article_id },
      {
        $set: {
          tricoteuse_id: tricoteuse_id,
          tricoteuse_name: tricoteuse_name,
          status: status || 'en_cours',
          assigned_at: new Date(),
          updated_at: new Date()
        }
      },
      { upsert: true }
    )
    
    res.json({
      success: true,
      data: {
        article_id,
        tricoteuse_id,
        tricoteuse_name,
        status: status || 'en_cours',
        assigned_at: new Date()
      }
    })
  } catch (error) {
    console.error('Erreur création/mise à jour assignation:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// DELETE /api/assignments/:assignmentId - Supprimer une assignation
app.delete('/api/assignments/:assignmentId', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { assignmentId } = req.params
    const assignmentsCollection = db.collection('article_assignments')
    
    // Vérifier que l'ID est un ObjectId valide
    if (!ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ error: 'ID d\'assignation invalide' })
    }
    
    const result = await assignmentsCollection.deleteOne({ _id: new ObjectId(assignmentId) })
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Aucune assignation trouvée avec cet ID' })
    }
    
    res.json({
      success: true,
      message: 'Assignation supprimée avec succès'
    })
  } catch (error) {
    console.error('Erreur suppression assignation:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// Routes pour les délais d'expédition

// GET /api/delais - Récupérer tous les délais d'expédition
app.get('/api/delais', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const delaisCollection = db.collection('delais_expedition')
    const delais = await delaisCollection.find({}).sort({ dateCreation: -1 }).toArray()
    
    res.json({
      success: true,
      data: delais
    })
  } catch (error) {
    console.error('Erreur récupération délais:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/delais - Créer un nouveau délai d'expédition
app.post('/api/delais', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { dateCreation, derniereModification, description } = req.body
    
    if (!dateCreation) {
      return res.status(400).json({ error: 'La date de création est requise' })
    }
    
    const delaisCollection = db.collection('delais_expedition')
    
    const newDelai = {
      dateCreation: new Date(dateCreation),
      derniereModification: derniereModification ? new Date(derniereModification) : new Date(),
      description: description || null
    }
    
    const result = await delaisCollection.insertOne(newDelai)
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...newDelai
      }
    })
  } catch (error) {
    console.error('Erreur création délai:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// PUT /api/delais/:id - Modifier un délai d'expédition
app.put('/api/delais/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { id } = req.params
    const { dateCreation, derniereModification, description } = req.body
    
    if (!dateCreation) {
      return res.status(400).json({ error: 'La date de création est requise' })
    }
    
    const delaisCollection = db.collection('delais_expedition')
    
    const updateData = {
      dateCreation: new Date(dateCreation),
      derniereModification: derniereModification ? new Date(derniereModification) : new Date(),
      description: description || null
    }
    
    const result = await delaisCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Délai non trouvé' })
    }
    
    res.json({
      success: true,
      data: {
        id,
        ...updateData
      }
    })
  } catch (error) {
    console.error('Erreur modification délai:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// DELETE /api/delais/:id - Supprimer un délai d'expédition
app.delete('/api/delais/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { id } = req.params
    const delaisCollection = db.collection('delais_expedition')
    
    const result = await delaisCollection.deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Délai non trouvé' })
    }
    
    res.json({
      success: true,
      message: 'Délai supprimé avec succès'
    })
  } catch (error) {
    console.error('Erreur suppression délai:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// Routes pour les délais d'expédition

// GET /api/delais/configuration - Récupérer la configuration actuelle des délais
app.get('/api/delais/configuration', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const delaisCollection = db.collection('delais_expedition')
    const configuration = await delaisCollection.findOne({}, { sort: { derniereModification: -1 } })
    
    if (configuration) {
      res.json({
        success: true,
        data: configuration
      })
    } else {
      // Retourner une configuration par défaut si aucune n'existe
      res.json({
        success: true,
        data: {
          joursDelai: 21,
          joursOuvrables: {
            lundi: true,
            mardi: true,
            mercredi: true,
            jeudi: true,
            vendredi: true,
            samedi: false,
            dimanche: false
          },
          dateLimite: null,
          dateCreation: new Date(),
          derniereModification: new Date()
        }
      })
    }
  } catch (error) {
    console.error('Erreur récupération configuration délais:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/delais/configuration - Sauvegarder la configuration des délais
app.post('/api/delais/configuration', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { joursDelai, joursOuvrables, dateLimite, dateCreation, derniereModification } = req.body
    
    if (!joursDelai || !joursOuvrables) {
      return res.status(400).json({ error: 'Les jours de délai et la configuration des jours ouvrables sont requis' })
    }
    
    const delaisCollection = db.collection('delais_expedition')
    
    // Créer la nouvelle configuration
    const nouvelleConfiguration = {
      joursDelai: parseInt(joursDelai),
      joursOuvrables: joursOuvrables,
      dateLimite: dateLimite ? new Date(dateLimite) : null,
      dateCreation: dateCreation ? new Date(dateCreation) : new Date(),
      derniereModification: new Date()
    }
    
    const result = await delaisCollection.insertOne(nouvelleConfiguration)
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...nouvelleConfiguration
      }
    })
  } catch (error) {
    console.error('Erreur sauvegarde configuration délais:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/delais/calculer - Calculer la date limite pour une commande
app.post('/api/delais/calculer', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { dateCommande, joursOuvrables, configurationJours } = req.body
    
    if (!dateCommande || !joursOuvrables || !configurationJours) {
      return res.status(400).json({ error: 'Tous les paramètres sont requis' })
    }
    
    // Fonction pour calculer la date limite
    const calculerDateLimiteOuvrable = async (dateCommande, joursOuvrablesCount, joursOuvrablesConfig) => {
      const dateCommandeObj = new Date(dateCommande)
      let dateLimite = new Date(dateCommandeObj)
      let joursAjoutes = 0
      
      while (joursAjoutes < joursOuvrablesCount) {
        dateLimite.setDate(dateLimite.getDate() + 1)
        
        // Vérifier si c'est un jour ouvrable selon la configuration
        const jourSemaine = dateLimite.getDay()
        const nomJour = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][jourSemaine]
        
        // Vérifier si c'est un jour ouvrable ET pas un jour férié
        if (joursOuvrablesConfig[nomJour]) {
          // Vérifier si c'est un jour férié français
          const annee = dateLimite.getFullYear()
          const jour = dateLimite.getDate().toString().padStart(2, '0')
          const mois = (dateLimite.getMonth() + 1).toString().padStart(2, '0')
          const dateStr = `${annee}-${mois}-${jour}`
          
          // Vérifier si c'est un jour férié français en utilisant la logique locale
          const estJourFerie = await estJourFerieLocal(dateLimite)
          // Si ce n'est pas un jour férié, compter le jour
          if (!estJourFerie) {
          joursAjoutes++
          }
        }
      }
      
      return dateLimite
    }
    
    const dateLimite = await calculerDateLimiteOuvrable(dateCommande, joursOuvrables, configurationJours)
    
    res.json({
      success: true,
      data: {
        dateCommande: new Date(dateCommande),
        joursOuvrables: parseInt(joursOuvrables),
        dateLimite: dateLimite,
        joursCalcules: Math.ceil((dateLimite - new Date(dateCommande)) / (1000 * 60 * 60 * 24))
      }
    })
  } catch (error) {
    console.error('Erreur calcul date limite:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// GET /api/delais/historique - Récupérer l'historique des configurations
app.get('/api/delais/historique', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const delaisCollection = db.collection('delais_expedition')
    const historique = await delaisCollection.find({}).sort({ derniereModification: -1 }).limit(50).toArray()
    
    res.json({
      success: true,
      data: historique
    })
  } catch (error) {
    console.error('Erreur récupération historique délais:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// GET /api/delais/jours-feries - Récupérer les jours fériés français
app.get('/api/delais/jours-feries/:annee', async (req, res) => {
  try {
    const { annee } = req.params
    
    if (!annee || isNaN(parseInt(annee))) {
      return res.status(400).json({ error: 'Année invalide' })
    }
    
    // Utiliser l'API officielle du gouvernement français via data.gouv.fr
    try {
      const response = await fetch('https://etalab.github.io/jours-feries-france-data/json/metropole.json')
      
      if (!response.ok) {
        throw new Error(`Erreur API gouvernementale: ${response.status}`)
      }
      
      const tousJoursFeries = await response.json()
      
      // Filtrer les jours fériés pour l'année demandée
      const joursFeries = {}
      Object.entries(tousJoursFeries).forEach(([date, nom]) => {
        if (date.startsWith(annee)) {
          joursFeries[date] = nom
        }
      })
      
      return joursFeries
    } catch (error) {
      console.error(`Erreur lors de la récupération des jours fériés pour ${annee}:`, error)
      // En cas d'erreur, retourner une liste vide
      return {}
    }
    
    const joursFeries = getJoursFeries(parseInt(annee))
    
    res.json({
      success: true,
      data: joursFeries
    })
  } catch (error) {
    console.error('Erreur récupération jours fériés:', error)
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des jours fériés',
      details: error.message 
    })
  }
})

// Cache pour les jours fériés
let joursFeriesCache = {}
let cacheExpiration = 0

// Fonction pour vérifier si une date est un jour férié français
async function estJourFerieLocal(date) {
  const annee = date.getFullYear()
  const dateStr = date.toISOString().split('T')[0]
  
  // Vérifier le cache d'abord
  if (joursFeriesCache[annee] && cacheExpiration > Date.now()) {
    return joursFeriesCache[annee][dateStr] !== undefined
  }
  
  try {
    // Charger les jours fériés depuis l'API gouvernementale
    const response = await fetch('https://etalab.github.io/jours-feries-france-data/json/metropole.json')
    
    if (response.ok) {
      const tousJoursFeries = await response.json()
      
      // Mettre en cache avec expiration (24h)
      joursFeriesCache = {}
      Object.entries(tousJoursFeries).forEach(([date, nom]) => {
        const anneeJour = date.split('-')[0]
        if (!joursFeriesCache[anneeJour]) {
          joursFeriesCache[anneeJour] = {}
        }
        joursFeriesCache[anneeJour][date] = nom
      })
      
      cacheExpiration = Date.now() + (24 * 60 * 60 * 1000)
      
      // Retourner le résultat pour la date demandée
      return joursFeriesCache[annee] && joursFeriesCache[annee][dateStr] !== undefined
    }
  } catch (error) {
    console.warn('Erreur lors de la vérification des jours fériés:', error)
  }
  
  // En cas d'erreur, retourner false
  return false
}

// Variable globale pour stocker le dernier log de synchronisation
let lastSyncLog = null
// Contrôleur d'annulation pour interrompre une synchro en cours
let currentSyncAbortController = null

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

// POST /api/sync/cancel - Annuler la synchronisation en cours
app.post('/api/sync/cancel', (req, res) => {
  try {
    if (currentSyncAbortController) {
      currentSyncAbortController.abort()
      addSyncLog('⛔ Synchronisation annulée par l\'utilisateur', 'warning')
      currentSyncAbortController = null
      return res.json({ success: true, cancelled: true })
    }
    return res.json({ success: true, cancelled: false })
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/test/connection - Test de connexion WordPress
app.get('/api/test/connection', async (req, res) => {
  try {
    if (!WOOCOMMERCE_CONSUMER_KEY || !WOOCOMMERCE_CONSUMER_SECRET) {
      return res.status(500).json({ 
        success: false, 
        error: 'Configuration WooCommerce manquante' 
      })
    }
    
    const authParams = `consumer_key=${WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${WOOCOMMERCE_CONSUMER_SECRET}`
    const url = `${WOOCOMMERCE_URL}/wp-json/wc/v3/products?${authParams}&per_page=1&_fields=id`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000) // Timeout 5 secondes
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    res.json({ 
      success: true, 
      data: { message: 'Connexion WordPress établie' } 
    })
  } catch (error) {
    console.error('Erreur test WordPress:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// GET /api/test/sync - Test de connexion base de données
app.get('/api/test/sync', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        error: 'Base de données non connectée' 
      })
    }
    
    // Test simple de connexion en comptant les documents
    const ordersCollection = db.collection('orders_sync')
    const count = await ordersCollection.countDocuments()
    
    res.json({ 
      success: true, 
      data: { 
        message: 'Connexion base de données établie',
        ordersCount: count 
      } 
    })
  } catch (error) {
    console.error('Erreur test base de données:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
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

// GET /api/debug/articles-couture - Debug spécifique pour les articles couture
app.get('/api/debug/articles-couture', async (req, res) => {
  try {
    const statusCollection = db.collection('production_status')
    const itemsCollection = db.collection('order_items')
    
    // 1. Compter tous les articles en base
    const totalArticlesInBase = await itemsCollection.countDocuments({})
    
    // 2. Compter les articles par type de production
    const allStatuses = await statusCollection.find({}).toArray()
    const articlesByType = {}
    allStatuses.forEach(status => {
      const type = status.production_type || 'non_dispatché'
      articlesByType[type] = (articlesByType[type] || 0) + 1
    })
    
    // 3. Compter les articles non dispatchés
    const nonDispatchedCount = totalArticlesInBase - allStatuses.length
    
    // 4. Analyser les articles non dispatchés
    const nonDispatchedItems = await itemsCollection.aggregate([
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
    
    // 5. Analyser les articles de type couture
    const coutureStatuses = allStatuses.filter(s => s.production_type === 'couture')
    const coutureItems = await Promise.all(coutureStatuses.map(async (status) => {
      const item = await itemsCollection.findOne({
        order_id: status.order_id,
        line_item_id: status.line_item_id
      })
      return item
    }))
    
    res.json({
      success: true,
      debug: {
        totalArticlesInBase,
        articlesByType,
        nonDispatchedCount,
        nonDispatchedItems: nonDispatchedItems.length,
        coutureArticles: {
          count: coutureStatuses.length,
          items: coutureItems.map(item => ({
            line_item_id: item.line_item_id,
            product_name: item.product_name,
            order_id: item.order_id
          }))
        },
        sampleNonDispatched: nonDispatchedItems.slice(0, 5).map(item => ({
          line_item_id: item.line_item_id,
          product_name: item.product_name,
          order_id: item.order_id
        }))
      }
    })
  } catch (error) {
    console.error('Erreur debug articles couture:', error)
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
    console.log(`   GET  /api/orders/search/:orderNumber - Rechercher une commande par numéro`)
    console.log(`   GET  /api/orders/production/:type - Commandes par type de production`)
    console.log(`   POST /api/production/dispatch - Dispatcher vers production`)
    console.log(`   PUT  /api/production/redispatch - Redispatch vers un autre type`)
    console.log(`   PUT  /api/production/status - Mettre à jour le statut`)
    console.log(`   GET  /api/production-status - Statuts de production`)
    console.log(`   GET  /api/production-status/stats - Statistiques de production`)
    console.log(`   POST /api/production-status - Mettre à jour statut`)
    console.log(`   GET  /api/debug/articles-couture - Debug articles couture`)
    console.log(`   GET  /api/woocommerce/products/:productId/permalink - Permalink d'un produit`)
    console.log(`   POST /api/woocommerce/products/permalink/batch - Permalinks en lot`)
    console.log(`   GET  /api/sync/logs - Logs de synchronisation`)
    console.log(`   POST /api/sync/logs/clear - Vider les logs`)
    console.log(`   GET  /api/test/connection - Test connexion WordPress`)
    console.log(`   GET  /api/test/sync - Test connexion base de données`)
    console.log(`   GET  /api/debug/status - Debug de l'état de la base`)
    console.log(`   GET  /api/tricoteuses - Récupérer toutes les tricoteuses`)
    console.log(`   POST /api/tricoteuses - Créer une nouvelle tricoteuse`)
    console.log(`   PUT  /api/tricoteuses/:id - Modifier une tricoteuse`)
    console.log(`   DELETE /api/tricoteuses/:id - Supprimer une tricoteuse`)
    console.log(`   GET  /api/assignments - Récupérer toutes les assignations`)
    console.log(`   GET  /api/assignments/:articleId - Récupérer une assignation`)
    console.log(`   POST /api/assignments - Créer/mettre à jour une assignation`)
    console.log(`   DELETE /api/assignments/:assignmentId - Supprimer une assignation`)
    console.log(`   GET  /api/delais - Récupérer tous les délais d'expédition`)
    console.log(`   POST /api/delais - Créer un nouveau délai d'expédition`)
    console.log(`   PUT  /api/delais/:id - Modifier un délai d'expédition`)
    console.log(`   DELETE /api/delais/:id - Supprimer un délai d'expédition`)
    console.log(`   GET  /api/delais/configuration - Configuration actuelle`)
    console.log(`   POST /api/delais/configuration - Sauvegarder configuration`)
    console.log(`   POST /api/delais/calculer - Calculer date limite`)
    console.log(`   GET  /api/delais/historique - Historique des configurations`)
    console.log(`   GET  /api/delais/jours-feries/:annee - Jours fériés français`)
  })
}

startServer().catch(console.error)
