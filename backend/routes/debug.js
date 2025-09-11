const express = require('express')
const db = require('../services/database')
const router = express.Router()

// Endpoint de test complet
router.get('/test-all', async (req, res) => {
  try {
    const results = {
      wordpress: { status: '❌ Échec', details: 'Configuration manquante' },
      database: { status: '✅ Succès', details: 'Connecté' },
      collections: {},
      stats: {}
    }

    // Test WordPress API
    const wordpressUrl = process.env.VITE_WORDPRESS_URL
    const consumerKey = process.env.VITE_WORDPRESS_CONSUMER_KEY
    const consumerSecret = process.env.VITE_WORDPRESS_CONSUMER_SECRET

    if (wordpressUrl && consumerKey && consumerSecret) {
      try {
        const testUrl = `${wordpressUrl}/wp-json/wc/v3/orders?per_page=1`
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
        
        const response = await fetch(testUrl, {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          results.wordpress = { status: '✅ Succès', details: 'API accessible' }
        } else {
          results.wordpress = { status: '❌ Échec', details: `HTTP ${response.status}` }
        }
      } catch (error) {
        results.wordpress = { status: '❌ Échec', details: error.message }
      }
    } else {
      results.wordpress = { status: '❌ Échec', details: 'Variables d\'environnement manquantes' }
    }

    // Test base de données
    if (!db.isConnected) {
      results.database = { status: '❌ Échec', details: 'Non connecté' }
    }

    // Statistiques des collections
    const collections = await db.db.listCollections().toArray()
    
    for (const collectionInfo of collections) {
      const collection = db.getCollection(collectionInfo.name)
      const count = await collection.countDocuments()
      results.collections[collectionInfo.name] = count
    }

    // Statistiques spécifiques
    const orderItemsCollection = db.getCollection('order_items')
    const ordersCollection = db.getCollection('orders_sync') // Utiliser orders_sync au lieu de orders
    const statusCollection = db.getCollection('production_status')

    results.stats = {
      commandes: await ordersCollection.countDocuments(),
      articles: await orderItemsCollection.countDocuments(),
      statuts: await statusCollection.countDocuments()
    }

    // Formatage pour l'interface frontend
    const formattedResults = {
      "🌐 Connexion WordPress API": results.wordpress.status,
      "📦 Commandes Base de données": results.database.status,
      "🗄️ Connexion Base de données": results.database.status,
      "📊 Statistiques Base de données": results.database.status,
      "📊 Commandes": results.stats.commandes,
      "📦 Articles": results.stats.articles,
      "🏷️ Statuts": results.stats.statuts
    }

    res.json({
      success: true,
      results: formattedResults,
      details: results
    })
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    })
  }
})

// Endpoint de debug pour vérifier les collections
router.get('/collections', async (req, res) => {
  try {
    const collections = await db.db.listCollections().toArray()
    const collectionNames = collections.map(c => c.name)
    
    res.json({
      success: true,
      collections: collectionNames,
      total: collectionNames.length
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Vérifier la collection order_items
router.get('/order-items', async (req, res) => {
  try {
    const collection = db.getCollection('order_items')
    const items = await collection.find({}).limit(10).toArray()
    const count = await collection.countDocuments()
    
    res.json({
      success: true,
      data: items,
      count: count,
      sample: items.slice(0, 3)
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Vérifier toutes les collections avec des données
router.get('/all-data', async (req, res) => {
  try {
    const collections = await db.db.listCollections().toArray()
    const results = {}
    
    for (const collectionInfo of collections) {
      const collection = db.getCollection(collectionInfo.name)
      const count = await collection.countDocuments()
      const sample = await collection.find({}).limit(3).toArray()
      
      results[collectionInfo.name] = {
        count,
        sample
      }
    }
    
    res.json({
      success: true,
      data: results
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
