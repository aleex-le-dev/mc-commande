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

// GET /api/delais/jours-feries/:annee - Récupérer les jours fériés pour une année
router.get('/jours-feries/:annee', async (req, res) => {
  try {
    const { annee } = req.params
    const anneeNum = parseInt(annee)
    
    if (isNaN(anneeNum) || anneeNum < 2020 || anneeNum > 2030) {
      return res.status(400).json({ 
        success: false, 
        error: 'Année invalide. Doit être entre 2020 et 2030' 
      })
    }

    // Appel à l'API gouvernementale des jours fériés
    const response = await fetch('https://etalab.github.io/jours-feries-france-data/json/metropole.json')
    
    if (!response.ok) {
      throw new Error(`Erreur API jours fériés: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Filtrer les jours fériés pour l'année demandée
    const joursFeriesAnnee = Object.entries(data)
      .filter(([date]) => date.startsWith(annee))
      .map(([date, nom]) => ({ date, nom }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    res.json({
      success: true,
      data: {
        annee: anneeNum,
        joursFeries: joursFeriesAnnee,
        total: joursFeriesAnnee.length
      }
    })
  } catch (error) {
    console.error('Erreur récupération jours fériés:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la récupération des jours fériés',
      details: error.message 
    })
  }
})

module.exports = router
