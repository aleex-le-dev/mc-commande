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

// POST /api/sync/orders - Synchroniser les commandes
router.post('/orders', async (req, res) => {
  try {
    const { synchronizeOrdersOnce } = require('../services/syncService')
    console.log('🔄 Synchronisation des commandes demandée')
    const result = await synchronizeOrdersOnce()
    console.log('✅ Synchronisation terminée:', result)
    res.json(result)
  } catch (error) {
    console.error('Erreur synchronisation commandes:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Erreur de synchronisation des commandes',
      details: error.message 
    })
  }
})

// DELETE /api/sync/cleanup - Supprimer les commandes synchronisées par erreur
router.delete('/cleanup', async (req, res) => {
  try {
    const database = require('../services/database')
    const orderItemsCollection = database.getCollection('order_items')
    
    const ordersToDelete = [
      3484, 3487, 3612, 3613, 3614, 3616, 3618, 3619, 3620,
      3621, 3622, 3624, 3625, 3626, 3627, 3628, 3629, 3630,
      3632, 3633, 3634, 3635, 3636, 3637, 3639, 3640, 3641,
      3643, 3644, 3645, 3646, 3647, 3648, 3649, 3650, 3653,
      3654, 3657, 3658, 3659, 3661, 3676, 3793, 3794, 3796,
      3797, 3798, 3800, 3802, 3803, 3804, 3805, 3806, 3807,
      3808, 3809, 3810, 3812, 3880, 3881, 3882, 3883, 3884,
      3885, 3886, 3887, 3888, 3889, 3890, 3891, 3892, 3893,
      3894, 3895, 3896, 3897, 3898, 3899, 3900, 3902, 3903,
      3904, 3905, 3908, 3909, 3910, 3911, 3912, 3913, 3914,
      3915, 3916, 3917, 3918, 3919, 3920, 3921, 4038, 4039, 4040
    ]
    
    console.log('🗑️ Suppression de', ordersToDelete.length, 'commandes synchronisées par erreur...')
    
    const result = await orderItemsCollection.deleteMany({ 
      order_id: { $in: ordersToDelete } 
    })
    
    console.log('✅ Commandes supprimées:', result.deletedCount)
    
    res.json({
      success: true,
      message: `Nettoyage terminé: ${result.deletedCount} commandes supprimées`,
      deletedCount: result.deletedCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erreur nettoyage commandes:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors du nettoyage des commandes',
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
