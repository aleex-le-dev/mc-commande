const express = require('express')
const router = express.Router()

// POST /api/import/order - Importer une commande spécifique
router.post('/order', async (req, res) => {
  try {
    const { orderId } = req.body
    
    if (!orderId || isNaN(parseInt(orderId))) {
      return res.status(400).json({ 
        success: false, 
        error: 'Numéro de commande invalide' 
      })
    }

    console.log(`🔄 Import commande ${orderId} demandé`)
    
    // Utiliser le script d'import existant
    const SingleOrderImporter = require('../scripts/import_single_order')
    const importer = new SingleOrderImporter()
    importer.orderId = parseInt(orderId)
    
    // Exécuter l'import en mode silencieux
    const originalConsoleLog = console.log
    const originalConsoleError = console.error
    console.log = () => {} // Supprimer les logs
    console.error = () => {}
    
    try {
      await importer.run()
    } finally {
      // Restaurer les logs
      console.log = originalConsoleLog
      console.error = originalConsoleError
    }
    
    if (importer.errorCount > 0) {
      return res.status(500).json({
        success: false,
        error: `Erreur lors de l'import: ${importer.errorCount} erreur(s)`
      })
    }
    
    res.json({
      success: true,
      orderId: orderId,
      articlesCount: importer.syncedCount,
      message: `Commande ${orderId} importée avec succès`
    })
    
  } catch (error) {
    console.error('Erreur import commande:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Erreur serveur lors de l\'import',
      details: error.message 
    })
  }
})

module.exports = router
