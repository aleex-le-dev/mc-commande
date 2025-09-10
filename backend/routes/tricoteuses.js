const express = require('express')
const tricoteusesService = require('../services/tricoteusesService')
const router = express.Router()

// GET /api/tricoteuses - Récupérer toutes les tricoteuses
router.get('/', async (req, res) => {
  try {
    const tricoteuses = await tricoteusesService.getTricoteuses()
    res.json({
      success: true,
      data: tricoteuses
    })
  } catch (error) {
    console.error('Erreur récupération tricoteuses:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// GET /api/tricoteuses/:id - Récupérer une tricoteuse par ID
router.get('/:id', async (req, res) => {
  try {
    const tricoteuse = await tricoteusesService.getTricoteuseById(req.params.id)
    if (!tricoteuse) {
      return res.status(404).json({ error: 'Tricoteuse non trouvée' })
    }
    res.json({ success: true, data: tricoteuse })
  } catch (error) {
    console.error('Erreur récupération tricoteuse:', error)
    if (error.message.includes('invalide')) {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/tricoteuses - Créer une nouvelle tricoteuse
router.post('/', async (req, res) => {
  try {
    const tricoteuse = await tricoteusesService.createTricoteuse(req.body)
    res.status(201).json({
      success: true,
      message: 'Tricoteuse créée avec succès',
      data: tricoteuse
    })
  } catch (error) {
    console.error('Erreur création tricoteuse:', error)
    if (error.message.includes('existe déjà')) {
      return res.status(409).json({ error: error.message })
    }
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// PUT /api/tricoteuses/:id - Mettre à jour une tricoteuse
router.put('/:id', async (req, res) => {
  try {
    await tricoteusesService.updateTricoteuse(req.params.id, req.body)
    res.json({
      success: true,
      message: 'Tricoteuse mise à jour avec succès'
    })
  } catch (error) {
    console.error('Erreur mise à jour tricoteuse:', error)
    if (error.message.includes('non trouvée') || error.message.includes('invalide')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// DELETE /api/tricoteuses/:id - Supprimer une tricoteuse
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await tricoteusesService.deleteTricoteuse(req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Tricoteuse non trouvée' })
    }
    res.json({
      success: true,
      message: 'Tricoteuse supprimée avec succès'
    })
  } catch (error) {
    console.error('Erreur suppression tricoteuse:', error)
    if (error.message.includes('invalide')) {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/tricoteuses/authenticate - Authentifier une tricoteuse
router.post('/authenticate', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' })
    }

    const tricoteuse = await tricoteusesService.authenticateTricoteuse(email, password)
    if (!tricoteuse) {
      return res.status(401).json({ error: 'Identifiants invalides' })
    }

    res.json({
      success: true,
      message: 'Authentification réussie',
      data: tricoteuse
    })
  } catch (error) {
    console.error('Erreur authentification tricoteuse:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

module.exports = router
