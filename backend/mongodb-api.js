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
const collectionName = 'production_status'

console.log('🔍 URL MongoDB configurée:', mongoUrl)
console.log('🔍 Variables d\'environnement:', {
  MONGO_URI: process.env.MONGO_URI ? '✅ Définie' : '❌ Manquante',
  PORT: process.env.PORT || '3001 (défaut)'
})

let db

// Connexion à MongoDB
async function connectToMongo() {
  try {
    const client = new MongoClient(mongoUrl)
    await client.connect()
    db = client.db(dbName)
    console.log('✅ Connecté à MongoDB Atlas')
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error)
  }
}

// Routes API

// GET /api/production-status - Récupérer tous les statuts
app.get('/api/production-status', async (req, res) => {
  try {
    const collection = db.collection(collectionName)
    const statuses = await collection.find({}).toArray()
    res.json({ statuses })
  } catch (error) {
    console.error('Erreur GET /production-status:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/production-status/:orderId/:lineItemId - Récupérer le statut d'un article
app.get('/api/production-status/:orderId/:lineItemId', async (req, res) => {
  try {
    const { orderId, lineItemId } = req.params
    const collection = db.collection(collectionName)
    
    const status = await collection.findOne({
      order_id: parseInt(orderId),
      line_item_id: parseInt(lineItemId)
    })
    
    res.json({ status })
  } catch (error) {
    console.error('Erreur GET /production-status/:orderId/:lineItemId:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/production-status - Créer ou mettre à jour un statut
app.post('/api/production-status', async (req, res) => {
  try {
    const { order_id, line_item_id, status, assigned_to } = req.body
    const collection = db.collection(collectionName)
    
    // Upsert: créer si n'existe pas, sinon mettre à jour
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

// GET /api/production-status/type/:type - Récupérer les statuts par type de production
app.get('/api/production-status/type/:type', async (req, res) => {
  try {
    const { type } = req.params
    const collection = db.collection(collectionName)
    
    // Pour l'instant, retourner tous les statuts
    // Plus tard, on pourra filtrer par type de production
    const statuses = await collection.find({}).toArray()
    
    res.json({ statuses })
  } catch (error) {
    console.error('Erreur GET /production-status/type/:type:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/production-status/stats - Statistiques de production
app.get('/api/production-status/stats', async (req, res) => {
  try {
    const collection = db.collection(collectionName)
    
    const stats = await collection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray()
    
    const statsObj = {}
    stats.forEach(stat => {
      statsObj[stat._id] = stat.count
    })
    
    res.json({ stats: statsObj })
  } catch (error) {
    console.error('Erreur GET /production-status/stats:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Démarrage du serveur
async function startServer() {
  await connectToMongo()
  
  app.listen(PORT, () => {
    console.log(`🚀 Serveur MongoDB API démarré sur le port ${PORT}`)
    console.log(`📊 Endpoints disponibles:`)
    console.log(`   GET  /api/production-status`)
    console.log(`   GET  /api/production-status/:orderId/:lineItemId`)
    console.log(`   POST /api/production-status`)
    console.log(`   GET  /api/production-status/type/:type`)
    console.log(`   GET  /api/production-status/stats`)
  })
}

startServer().catch(console.error)
