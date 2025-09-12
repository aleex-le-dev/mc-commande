const express = require('express')
const DelaisService = require('../services/delaisService')
const router = express.Router()

// GET /api/delais/configuration - Récupérer la configuration des délais
router.get('/configuration', async (req, res) => {
  try {
    const result = await DelaisService.getDefaultConfiguration()
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      })
    } else {
      res.status(500).json({ 
        success: false,
        error: result.error 
      })
    }
  } catch (error) {
    console.error('Erreur récupération configuration délais:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// Fonction pour calculer la date limite en remontant depuis aujourd'hui
function calculerDateLimite(dateCommande, joursOuvrables, joursDelai) {
  const aujourdhui = new Date(dateCommande)
  let dateLimite = new Date(aujourdhui)
  let joursRetires = 0
  
  // Remonter en arrière jusqu'à avoir retiré le bon nombre de jours ouvrables
  while (joursRetires < joursDelai) {
    dateLimite.setDate(dateLimite.getDate() - 1)
    
    const jourSemaine = dateLimite.getDay()
    const nomJour = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][jourSemaine]
    
    // Vérifier si c'est un jour ouvrable configuré
    if (joursOuvrables[nomJour]) {
      joursRetires++
    }
  }
  
  return dateLimite.toISOString().split('T')[0]
}

// PUT /api/delais/configuration - Mettre à jour la configuration des délais
router.put('/configuration', async (req, res) => {
  try {
    const { joursDelai, joursOuvrables } = req.body
    
    if (!joursDelai || !joursOuvrables) {
      return res.status(400).json({
        success: false,
        error: 'joursDelai et joursOuvrables sont requis'
      })
    }
    
    const result = await DelaisService.createOrUpdateConfiguration({
      joursDelai,
      joursOuvrables
    })
    
    if (result.success) {
      res.json({
        success: true,
        message: `Configuration ${result.operation} avec succès`,
        data: result.data
      })
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      })
    }
  } catch (error) {
    console.error('Erreur mise à jour configuration délais:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// GET /api/delais/configurations - Récupérer toutes les configurations
router.get('/configurations', async (req, res) => {
  try {
    const result = await DelaisService.getAllConfigurations()
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      })
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      })
    }
  } catch (error) {
    console.error('Erreur récupération configurations délais:', error)
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
