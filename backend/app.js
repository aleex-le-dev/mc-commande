require('dotenv').config()
const express = require('express')
const cookieParser = require('cookie-parser')
const database = require('./services/database')
const { cors, corsMiddleware } = require('./middleware/cors')

// Import des routes
const ordersRoutes = require('./routes/orders')
const assignmentsRoutes = require('./routes/assignments')
const tricoteusesRoutes = require('./routes/tricoteuses')
const productionRoutes = require('./routes/production')

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

// CORS
app.use(cors)
app.use(corsMiddleware)

// Routes
app.use('/api/orders', ordersRoutes)
app.use('/api/assignments', assignmentsRoutes)
app.use('/api/tricoteuses', tricoteusesRoutes)
app.use('/api/production', productionRoutes)

// Route de santé
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: database.isConnected ? 'Connected' : 'Disconnected'
  })
})

// Route racine
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Maison Cléo - Backend',
    version: '2.0.0',
    status: 'Running'
  })
})

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route non trouvée',
    path: req.originalUrl,
    method: req.method
  })
})

// Gestion globale des erreurs
app.use((error, req, res, next) => {
  console.error('Erreur globale:', error)
  res.status(500).json({ 
    error: 'Erreur serveur interne',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Une erreur est survenue'
  })
})

// Fonction de démarrage
async function startServer() {
  try {
    // Connexion à la base de données
    await database.connect()
    
    // Démarrage du serveur
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`)
      console.log(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`)
      console.log(`🌐 URL: http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('❌ Erreur démarrage serveur:', error)
    process.exit(1)
  }
}

// Gestion de l'arrêt propre
process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt du serveur...')
  await database.disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Arrêt du serveur...')
  await database.disconnect()
  process.exit(0)
})

// Démarrer le serveur
startServer()

module.exports = app
