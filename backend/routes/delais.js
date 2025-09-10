const express = require('express')
const router = express.Router()

// GET /api/delais/configuration - Récupérer la configuration des délais
router.get('/configuration', async (req, res) => {
  try {
    // Configuration par défaut des délais
    const defaultConfig = {
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
      dateLimite: null
    }

    res.json({
      success: true,
      data: defaultConfig
    })
  } catch (error) {
    console.error('Erreur récupération configuration délais:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// PUT /api/delais/configuration - Mettre à jour la configuration des délais
router.put('/configuration', async (req, res) => {
  try {
    // TODO: Implémenter la sauvegarde en base de données
    res.json({
      success: true,
      message: 'Configuration des délais mise à jour'
    })
  } catch (error) {
    console.error('Erreur mise à jour configuration délais:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

module.exports = router
