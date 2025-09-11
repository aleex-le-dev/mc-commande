const db = require('./database')

class AssignmentsService {
  async getAssignments() {
    const collection = db.getCollection('article_assignments')
    const tricoteuses = db.getCollection('tricoteuses')
    const raw = await collection.find({}).sort({ assigned_at: -1 }).toArray()
    // Enrichir avec les infos tricoteuse
    const map = new Map()
    const ids = [...new Set(raw.map(a => a.tricoteuse_id).filter(Boolean))]
    if (ids.length) {
      const list = await tricoteuses.find({ _id: { $in: ids.map(id => ({ $oid: id })) } }).toArray().catch(() => [])
      // Fallback: essayer par champ custom id si usage de string
      if (!list || list.length === 0) {
        const byString = await tricoteuses.find({ _id: { $in: ids } }).toArray().catch(() => [])
        byString.forEach(t => map.set(String(t._id), t))
      } else {
        list.forEach(t => map.set(String(t._id), t))
      }
    }
    return raw.map(a => ({
      ...a,
      article_id: String(a.article_id),
      tricoteuse_id: a.tricoteuse_id != null ? String(a.tricoteuse_id) : a.tricoteuse_id,
      tricoteuse_name: a.tricoteuse_name || map.get(String(a.tricoteuse_id))?.firstName || (a.tricoteuse_id != null ? String(a.tricoteuse_id) : undefined)
    }))
  }

  async getAssignmentByArticleId(articleId) {
    const collection = db.getCollection('article_assignments')
    const tricoteuses = db.getCollection('tricoteuses')
    const keyStr = String(articleId)
    const keyNum = parseInt(keyStr)
    const a = await collection.findOne({ $or: [ { article_id: keyStr }, ...(isNaN(keyNum)? [] : [{ article_id: keyNum }]) ] })
    if (!a) return null
    try {
      const t = await tricoteuses.findOne({ _id: a.tricoteuse_id }) || await tricoteuses.findOne({ _id: String(a.tricoteuse_id) })
      return { ...a, article_id: String(a.article_id), tricoteuse_id: a.tricoteuse_id != null ? String(a.tricoteuse_id) : a.tricoteuse_id, tricoteuse_name: a.tricoteuse_name || t?.firstName || (a.tricoteuse_id != null ? String(a.tricoteuse_id) : undefined) }
    } catch {
      return { ...a, article_id: String(a.article_id), tricoteuse_id: a.tricoteuse_id != null ? String(a.tricoteuse_id) : a.tricoteuse_id }
    }
  }

  async getAssignmentById(assignmentId) {
    const collection = db.getCollection('article_assignments')
    
    if (!db.isValidObjectId(assignmentId)) {
      throw new Error('ID d\'assignation invalide')
    }

    return await collection.findOne({ _id: db.createObjectId(assignmentId) })
  }

  async createAssignment(assignmentData) {
    const collection = db.getCollection('article_assignments')
    const items = db.getCollection('order_items')
    const { article_id, tricoteuse_id, status } = assignmentData || {}
    if (!article_id || !tricoteuse_id) {
      throw new Error('article_id et tricoteuse_id sont requis')
    }
    // Déterminer order_id et line_item_id
    let orderId = null
    let lineItemId = null
    const rawId = String(article_id)
    if (rawId.includes('_')) {
      const [oid, lid] = rawId.split('_')
      orderId = parseInt(oid)
      lineItemId = parseInt(lid)
    } else {
      lineItemId = parseInt(rawId)
      const item = await items.findOne({ line_item_id: lineItemId })
      orderId = item ? parseInt(item.order_id) : null
    }

    const assignment = {
      article_id: String(article_id),
      order_id: orderId,
      line_item_id: lineItemId,
      tricoteuse_id: String(tricoteuse_id),
      status: status || 'a_faire',
      assigned_at: new Date(),
      updated_at: new Date()
    }
    
    // S'il existe déjà une assignation pour cet article, la mettre à jour (changement de tricoteuse)
    const keyStr = String(assignment.article_id)
    const keyNum = parseInt(keyStr)
    const existing = await collection.findOne({ $or: [ { article_id: keyStr }, ...(isNaN(keyNum)? [] : [{ article_id: keyNum }]) ] })
    if (existing) {
      await collection.updateOne(
        { _id: existing._id },
        { $set: { tricoteuse_id: assignment.tricoteuse_id, status: assignment.status, order_id: assignment.order_id, line_item_id: assignment.line_item_id, updated_at: new Date() } }
      )
      return { ...existing, tricoteuse_id: assignment.tricoteuse_id, status: assignment.status, order_id: assignment.order_id, line_item_id: assignment.line_item_id, updated_at: new Date() }
    }

    const result = await collection.insertOne(assignment)
    return { ...assignment, _id: result.insertedId }
  }

  async updateAssignment(assignmentId, updateData) {
    const collection = db.getCollection('article_assignments')
    
    if (!assignmentId) {
      throw new Error('ID d\'assignation manquant')
    }

    if (!db.isValidObjectId(assignmentId)) {
      throw new Error('ID d\'assignation invalide')
    }

    const result = await collection.updateOne(
      { _id: db.createObjectId(assignmentId) },
      { 
        $set: {
          ...updateData,
          updated_at: new Date()
        }
      }
    )

    if (result.matchedCount === 0) {
      throw new Error('Assignation non trouvée')
    }

    return result.modifiedCount > 0
  }

  async deleteAssignment(assignmentId) {
    const collection = db.getCollection('article_assignments')
    
    if (!db.isValidObjectId(assignmentId)) {
      throw new Error('ID d\'assignation invalide')
    }

    // Récupérer l'assignation avant de la supprimer
    const assignment = await collection.findOne({ _id: db.createObjectId(assignmentId) })
    if (!assignment) {
      throw new Error('Aucune assignation trouvée avec cet ID')
    }

    const result = await collection.deleteOne({ _id: db.createObjectId(assignmentId) })
    return { deleted: result.deletedCount > 0, assignment }
  }

  async deleteAssignmentByArticleId(articleId) {
    const collection = db.getCollection('article_assignments')
    const result = await collection.deleteOne({ article_id: articleId })
    return result.deletedCount > 0
  }

  async syncAssignmentsStatus() {
    const assignmentsCollection = db.getCollection('article_assignments')
    const productionCollection = db.getCollection('production_status')
    
    const assignments = await assignmentsCollection.find({}).toArray()
    let synced = 0

    for (const assignment of assignments) {
      const articleId = assignment.article_id.toString()
      let orderId, lineItemId

      if (articleId.includes('_')) {
        const parts = articleId.split('_')
        orderId = parts[0]
        lineItemId = parts[1]
      } else {
        orderId = articleId
        lineItemId = '1'
      }

      await productionCollection.updateOne(
        { order_id: parseInt(orderId), line_item_id: parseInt(lineItemId) },
        { 
          $set: { 
            status: assignment.status,
            updated_at: new Date()
          }
        },
        { upsert: true }
      )
      synced++
    }

    return { synced, total: assignments.length }
  }
}

module.exports = new AssignmentsService()
