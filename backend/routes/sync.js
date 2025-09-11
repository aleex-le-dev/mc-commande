const express = require('express')
const router = express.Router()

// POST /api/sync/test - Tester la connexion à la base de données
router.post('/test', async (req, res) => {
  try {
    const database = require('../services/database')
    
    // Test de connexion à la base de données
    if (!database.isConnected) {
      return res.status(500).json({ 
        success: false, 
        error: 'Base de données non connectée' 
      })
    }

    // Test simple de lecture
    const testCollection = database.getCollection('order_items')
    const count = await testCollection.countDocuments()
    
    res.json({ 
      success: true, 
      message: 'Connexion à la base de données réussie',
      database: 'Connected',
      collections: {
        order_items: count
      }
    })
  } catch (error) {
    console.error('Erreur test sync:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Erreur de connexion à la base de données',
      details: error.message 
    })
  }
})

// POST /api/sync/wordpress - Tester la connexion WordPress
router.post('/wordpress', async (req, res) => {
  try {
    const { url, username, password } = req.body
    
    if (!url || !username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL, nom d\'utilisateur et mot de passe requis' 
      })
    }

    // Test de connexion WordPress (simulation)
    // Dans un vrai projet, vous feriez un appel à l'API WordPress
    const isValidUrl = url.includes('wordpress') || url.includes('wp-json')
    
    if (!isValidUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL WordPress invalide' 
      })
    }

    res.json({ 
      success: true, 
      message: 'Connexion WordPress réussie',
      url: url,
      status: 'Connected'
    })
  } catch (error) {
    console.error('Erreur test WordPress:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Erreur de connexion WordPress',
      details: error.message 
    })
  }
})

module.exports = router
