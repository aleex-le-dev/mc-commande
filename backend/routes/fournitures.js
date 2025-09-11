const express = require('express')
const router = express.Router()
const db = require('../services/database')

// GET /api/fournitures
router.get('/', async (req, res) => {
  try {
    const list = await db.getCollection('fournitures').find({}).sort({ created_at: -1 }).toArray()
    res.json({ success: true, data: list })
  } catch (error) {
    console.error('Erreur liste fournitures:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/fournitures
router.post('/', async (req, res) => {
  try {
    const { label, qty, ordered = false } = req.body || {}
    const parsedQty = parseInt(qty, 10)
    if (!label || !String(label).trim()) {
      return res.status(400).json({ error: 'Label requis' })
    }
    if (!Number.isFinite(parsedQty) || parsedQty < 1) {
      return res.status(400).json({ error: 'Quantité invalide' })
    }
    const doc = { label: String(label).trim(), qty: parsedQty, ordered: Boolean(ordered), created_at: new Date() }
    const result = await db.getCollection('fournitures').insertOne(doc)
    res.status(201).json({ success: true, data: { ...doc, _id: result.insertedId } })
  } catch (error) {
    console.error('Erreur création fourniture:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// PUT /api/fournitures/:id
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id
    if (!db.isValidObjectId(id)) return res.status(400).json({ error: 'ID invalide' })
    const { label, qty, ordered } = req.body || {}
    const update = {}
    if (typeof label === 'string') update.label = label.trim()
    if (typeof qty !== 'undefined') {
      const parsedQty = parseInt(qty, 10)
      if (!Number.isFinite(parsedQty) || parsedQty < 1) {
        return res.status(400).json({ error: 'Quantité invalide' })
      }
      update.qty = parsedQty
    }
    if (typeof ordered === 'boolean') {
      update.ordered = ordered
    }
    update.updated_at = new Date()

    const result = await db.getCollection('fournitures').updateOne(
      { _id: db.createObjectId(id) },
      { $set: update }
    )
    if (!result.matchedCount) return res.status(404).json({ error: 'Fourniture introuvable' })
    const doc = await db.getCollection('fournitures').findOne({ _id: db.createObjectId(id) })
    res.json({ success: true, data: doc })
  } catch (error) {
    console.error('Erreur mise à jour fourniture:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// DELETE /api/fournitures/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id
    if (!db.isValidObjectId(id)) return res.status(400).json({ error: 'ID invalide' })
    const result = await db.getCollection('fournitures').deleteOne({ _id: db.createObjectId(id) })
    if (!result.deletedCount) return res.status(404).json({ error: 'Fourniture introuvable' })
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression fourniture:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

module.exports = router


