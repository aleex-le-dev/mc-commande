const express = require('express')
const productionService = require('../services/productionService')
const router = express.Router()

// GET /api/production/status/:orderId/:lineItemId - Récupérer le statut de production
router.get('/status/:orderId/:lineItemId', async (req, res) => {
  try {
    const status = await productionService.getProductionStatus(req.params.orderId, req.params.lineItemId)
    if (!status) {
      return res.status(404).json({ error: 'Statut de production non trouvé' })
    }
    res.json({ success: true, data: status })
  } catch (error) {
    console.error('Erreur récupération statut production:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// PUT /api/production/status/:orderId/:lineItemId - Mettre à jour le statut de production
router.put('/status/:orderId/:lineItemId', async (req, res) => {
  try {
    const { status, ...additionalData } = req.body
    if (!status) {
      return res.status(400).json({ error: 'Statut requis' })
    }

    const updated = await productionService.updateProductionStatus(
      req.params.orderId, 
      req.params.lineItemId, 
      status, 
      additionalData
    )

    res.json({
      success: true,
      message: 'Statut de production mis à jour avec succès',
      data: { updated }
    })
  } catch (error) {
    console.error('Erreur mise à jour statut production:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// GET /api/production/stats - Statistiques de production
router.get('/stats', async (req, res) => {
  try {
    const stats = await productionService.getProductionStats()
    res.json({ success: true, data: stats })
  } catch (error) {
    console.error('Erreur récupération stats production:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// GET /api/production/by-status/:status - Récupérer les articles par statut
router.get('/by-status/:status', async (req, res) => {
  try {
    const articles = await productionService.getProductionByStatus(req.params.status)
    res.json({ success: true, data: articles })
  } catch (error) {
    console.error('Erreur récupération articles par statut:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/production/bulk-update - Mise à jour en lot des statuts
router.post('/bulk-update', async (req, res) => {
  try {
    const { updates } = req.body
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Liste de mises à jour requise' })
    }

    const result = await productionService.bulkUpdateStatus(updates)
    res.json({
      success: true,
      message: `${result.modifiedCount} statuts mis à jour`,
      data: result
    })
  } catch (error) {
    console.error('Erreur mise à jour en lot:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

module.exports = router
