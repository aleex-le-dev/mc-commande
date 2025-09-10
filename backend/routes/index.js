const express = require('express')
const router = express.Router()

// Import des routes
const ordersRoutes = require('./orders')
const assignmentsRoutes = require('./assignments')
const tricoteusesRoutes = require('./tricoteuses')
const productionRoutes = require('./production')

// Configuration des routes
router.use('/orders', ordersRoutes)
router.use('/assignments', assignmentsRoutes)
router.use('/tricoteuses', tricoteusesRoutes)
router.use('/production', productionRoutes)

// Route de santé
router.get('/health', (req, res) => {
  const database = require('../services/database')
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: database.isConnected ? 'Connected' : 'Disconnected'
  })
})

// Route racine
router.get('/', (req, res) => {
  res.json({ 
    message: 'API Maison Cléo - Backend',
    version: '2.0.0',
    status: 'Running'
  })
})

module.exports = router
