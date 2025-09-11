const express = require('express')
const ordersService = require('../services/ordersService')
const router = express.Router()

// GET /api/orders - Récupérer toutes les commandes avec pagination et filtres
router.get('/', async (req, res) => {
  try {
    const result = await ordersService.getOrders(req.query)
    res.json({ success: true, orders: result.orders, pagination: result.pagination, stats: result.stats })
  } catch (error) {
    console.error('Erreur récupération commandes:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// GET /api/orders/archived - Récupérer les commandes archivées
router.get('/archived', async (req, res) => {
  try {
    const result = await ordersService.getArchivedOrders(req.query)
    res.json({ success: true, orders: result.orders, pagination: result.pagination })
  } catch (error) {
    console.error('Erreur récupération commandes archivées:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// GET /api/orders/:id - Récupérer une commande par ID
router.get('/:id', async (req, res) => {
  try {
    const order = await ordersService.getOrderById(req.params.id)
    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' })
    }
    res.json({ success: true, order })
  } catch (error) {
    console.error('Erreur récupération commande:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/orders - Créer une nouvelle commande
router.post('/', async (req, res) => {
  try {
    const orderId = await ordersService.createOrder(req.body)
    res.status(201).json({ success: true, message: 'Commande créée avec succès', orderId })
  } catch (error) {
    console.error('Erreur création commande:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// PUT /api/orders/:id - Mettre à jour une commande
router.put('/:id', async (req, res) => {
  try {
    const updated = await ordersService.updateOrder(req.params.id, req.body)
    if (!updated) {
      return res.status(404).json({ error: 'Commande non trouvée' })
    }
    res.json({ success: true, message: 'Commande mise à jour avec succès' })
  } catch (error) {
    console.error('Erreur mise à jour commande:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// DELETE /api/orders/:id - Supprimer une commande
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await ordersService.deleteOrder(req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Commande non trouvée' })
    }
    res.json({ success: true, message: 'Commande supprimée avec succès' })
  } catch (error) {
    console.error('Erreur suppression commande:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// GET /api/orders/stats - Statistiques des commandes
router.get('/stats', async (req, res) => {
  try {
    const stats = await ordersService.getOrdersStats()
    res.json({ success: true, data: stats })
  } catch (error) {
    console.error('Erreur récupération stats commandes:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// GET /api/orders/production/couture - Commandes pour la production couture
router.get('/production/couture', async (req, res) => {
  try {
    const result = await ordersService.getOrders({ ...req.query, productionType: 'couture' })
    res.json({ success: true, orders: result.orders, pagination: result.pagination, stats: result.stats })
  } catch (error) {
    console.error('Erreur récupération commandes couture:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// GET /api/orders/production/maille - Commandes pour la production maille
router.get('/production/maille', async (req, res) => {
  try {
    const result = await ordersService.getOrders({ ...req.query, productionType: 'maille' })
    res.json({ success: true, orders: result.orders, pagination: result.pagination, stats: result.stats })
  } catch (error) {
    console.error('Erreur récupération commandes maille:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// PUT /api/orders/:id/note - Mettre à jour la note d'une commande
router.put('/:id/note', async (req, res) => {
  try {
    const { note } = req.body
    const orderId = parseInt(req.params.id)
    
    // Accepter les notes vides (pour supprimer une note)
    if (note === undefined || note === null) {
      return res.status(400).json({ error: 'Note manquante' })
    }
    
    if (typeof note !== 'string') {
      return res.status(400).json({ error: 'Note doit être une chaîne de caractères' })
    }
    
    const success = await ordersService.updateOrderNote(orderId, note.trim())
    if (!success) {
      return res.status(404).json({ error: 'Commande non trouvée' })
    }
    
    res.json({ success: true, message: 'Note mise à jour avec succès' })
  } catch (error) {
    console.error('Erreur mise à jour note commande:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/orders/:id/archive - Archiver une commande
router.post('/:id/archive', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id)
    const success = await ordersService.archiveOrder(orderId)
    
    if (!success) {
      return res.status(404).json({ error: 'Commande non trouvée' })
    }
    
    res.json({ success: true, message: 'Commande archivée avec succès' })
  } catch (error) {
    console.error('Erreur archivage commande:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

module.exports = router
