const express = require('express')
const db = require('../services/database')
const router = express.Router()

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
