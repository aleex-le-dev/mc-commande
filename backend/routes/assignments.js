const express = require('express')
const assignmentsService = require('../services/assignmentsService')
const productionService = require('../services/productionService')
const router = express.Router()

// GET /api/assignments - Récupérer toutes les assignations
router.get('/', async (req, res) => {
  try {
    const assignments = await assignmentsService.getAssignments()
    res.json({ success: true, assignments })
  } catch (error) {
    console.error('Erreur récupération assignations:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// GET /api/assignments/:articleId - Récupérer l'assignation d'un article
router.get('/:articleId', async (req, res) => {
  try {
    const assignment = await assignmentsService.getAssignmentByArticleId(req.params.articleId)
    if (!assignment) {
      return res.status(404).json({ error: 'Aucune assignation trouvée pour cet article' })
    }
    res.json({ success: true, assignment })
  } catch (error) {
    console.error('Erreur récupération assignation:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/assignments - Créer une nouvelle assignation
router.post('/', async (req, res) => {
  try {
    const { article_id, tricoteuse_id, status } = req.body || {}
    if (!article_id || !tricoteuse_id) {
      return res.status(400).json({ error: 'article_id et tricoteuse_id requis' })
    }
    const assignment = await assignmentsService.createAssignment({ article_id, tricoteuse_id, status: status || 'a_faire' })
    
    // Mettre à jour le statut de production
    const orderId = assignment.order_id
    const lineItemId = assignment.line_item_id
    if (orderId && lineItemId) {
      await productionService.updateProductionStatus(orderId, lineItemId, assignment.status)
    }

    res.status(201).json({ success: true, assignment })
  } catch (error) {
    console.error('Erreur création assignation:', error)
    res.status(500).json({ error: error?.message || 'Erreur serveur interne' })
  }
})

// PUT /api/assignments/:assignmentId - Mettre à jour une assignation
router.put('/:assignmentId', async (req, res) => {
  try {
    // Récupérer l'assignation existante pour obtenir l'article_id
    const existingAssignment = await assignmentsService.getAssignmentById(req.params.assignmentId)
    if (!existingAssignment) {
      return res.status(404).json({ error: 'Assignation non trouvée' })
    }

    await assignmentsService.updateAssignment(req.params.assignmentId, req.body)
    
    // Mettre à jour le statut de production si le statut a changé
    if (req.body.status) {
      const articleId = existingAssignment.article_id.toString()
      let orderId, lineItemId

      if (articleId.includes('_')) {
        const parts = articleId.split('_')
        orderId = parts[0]
        lineItemId = parts[1]
      } else {
        orderId = articleId
        lineItemId = '1'
      }

      await productionService.updateProductionStatus(orderId, lineItemId, req.body.status)
    }

    res.json({
      success: true,
      message: 'Assignation mise à jour avec succès'
    })
  } catch (error) {
    console.error('Erreur mise à jour assignation:', error)
    if (error.message.includes('non trouvée')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// DELETE /api/assignments/:assignmentId - Supprimer une assignation
router.delete('/:assignmentId', async (req, res) => {
  try {
    const result = await assignmentsService.deleteAssignment(req.params.assignmentId)
    
    // Mettre à jour le statut de production en "à faire"
    if (result.assignment) {
      const articleId = result.assignment.article_id.toString()
      let orderId, lineItemId

      if (articleId.includes('_')) {
        const parts = articleId.split('_')
        orderId = parts[0]
        lineItemId = parts[1]
      } else {
        orderId = articleId
        lineItemId = '1'
      }

      await productionService.updateProductionStatus(orderId, lineItemId, 'a_faire')
    }

    res.json({
      success: true,
      message: 'Assignation supprimée avec succès'
    })
  } catch (error) {
    console.error('Erreur suppression assignation:', error)
    if (error.message.includes('non trouvée')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// DELETE /api/assignments/by-article/:articleId - Supprimer l'assignation d'un article
router.delete('/by-article/:articleId', async (req, res) => {
  try {
    const deleted = await assignmentsService.deleteAssignmentByArticleId(req.params.articleId)
    if (!deleted) {
      return res.status(404).json({ error: 'Aucune assignation trouvée pour cet article' })
    }

    // Mettre à jour le statut de production en "à faire"
    const articleId = req.params.articleId
    let orderId, lineItemId

    if (articleId.includes('_')) {
      const parts = articleId.split('_')
      orderId = parts[0]
      lineItemId = parts[1]
    } else {
      orderId = articleId
      lineItemId = '1'
    }

    await productionService.updateProductionStatus(orderId, lineItemId, 'a_faire')

    res.json({
      success: true,
      message: 'Assignation supprimée avec succès'
    })
  } catch (error) {
    console.error('Erreur suppression assignation par article:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/sync-assignments-status - Synchroniser les statuts des assignations
router.post('/sync-assignments-status', async (req, res) => {
  try {
    const result = await assignmentsService.syncAssignmentsStatus()
    res.json({
      success: true,
      message: `Synchronisation terminée: ${result.synced}/${result.total} assignations synchronisées`,
      data: result
    })
  } catch (error) {
    console.error('Erreur synchronisation assignations:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

module.exports = router
