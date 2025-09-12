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
    const tricoteuses = db.getCollection('tricoteuses')
    const production = db.getCollection('production_status')
    const { article_id, tricoteuse_id, status, tricoteuse_name } = assignmentData || {}
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

    // Récupérer le nom de la tricoteuse
    let finalTricoteuseName = tricoteuse_name
    if (!finalTricoteuseName) {
      const tricoteuse = await tricoteuses.findOne({ _id: tricoteuse_id })
      finalTricoteuseName = tricoteuse?.firstName || 'Tricoteuse inconnue'
    }

    const assignment = {
      article_id: String(article_id),
      order_id: orderId,
      line_item_id: lineItemId,
      tricoteuse_id: String(tricoteuse_id),
      tricoteuse_name: finalTricoteuseName,
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
        { $set: { 
          tricoteuse_id: assignment.tricoteuse_id, 
          tricoteuse_name: finalTricoteuseName,
          status: assignment.status, 
          order_id: assignment.order_id, 
          line_item_id: assignment.line_item_id, 
          updated_at: new Date() 
        } }
      )
      
      // Mettre à jour production_status avec les nouvelles infos
      if (orderId && lineItemId) {
        // Récupérer le statut existant pour préserver les notes
        const existingStatus = await production.findOne({ 
          order_id: orderId, 
          line_item_id: lineItemId 
        })
        
        await production.updateOne(
          { order_id: orderId, line_item_id: lineItemId },
          { 
            $set: { 
              status: assignment.status,
              assigned_to: finalTricoteuseName,
              tricoteuse: finalTricoteuseName,
              // NE JAMAIS TOUCHER AUX NOTES - elles restent intactes
              updated_at: new Date()
            }
          },
          { upsert: true }
        )
      }
      
      return { ...existing, tricoteuse_id: assignment.tricoteuse_id, tricoteuse_name: finalTricoteuseName, status: assignment.status, order_id: assignment.order_id, line_item_id: assignment.line_item_id, updated_at: new Date() }
    }

    const result = await collection.insertOne(assignment)
    
    // Mettre à jour production_status pour la nouvelle assignation
    if (orderId && lineItemId) {
      // Récupérer le statut existant pour préserver les notes
      const existingStatus = await production.findOne({ 
        order_id: orderId, 
        line_item_id: lineItemId 
      })
      
      await production.updateOne(
        { order_id: orderId, line_item_id: lineItemId },
        { 
          $set: { 
            status: assignment.status,
            assigned_to: finalTricoteuseName,
            tricoteuse: finalTricoteuseName,
            // NE JAMAIS TOUCHER AUX NOTES - elles restent intactes
            updated_at: new Date()
          }
        },
        { upsert: true }
      )
    }
    
    return { ...assignment, _id: result.insertedId }
  }

  async updateAssignment(assignmentId, updateData) {
    const collection = db.getCollection('article_assignments')
    const production = db.getCollection('production_status')
    const tricoteuses = db.getCollection('tricoteuses')
    
    if (!assignmentId) {
      throw new Error('ID d\'assignation manquant')
    }

    if (!db.isValidObjectId(assignmentId)) {
      throw new Error('ID d\'assignation invalide')
    }

    // Récupérer l'assignation existante pour avoir les infos
    const existingAssignment = await collection.findOne({ _id: db.createObjectId(assignmentId) })
    if (!existingAssignment) {
      throw new Error('Assignation non trouvée')
    }

    // Déterminer le nom de la tricoteuse
    let tricoteuseName = updateData.tricoteuse_name
    if (!tricoteuseName && updateData.tricoteuse_id) {
      const tricoteuse = await tricoteuses.findOne({ _id: updateData.tricoteuse_id })
      tricoteuseName = tricoteuse?.firstName || 'Tricoteuse inconnue'
    }

    const result = await collection.updateOne(
      { _id: db.createObjectId(assignmentId) },
      { 
        $set: {
          ...updateData,
          tricoteuse_name: tricoteuseName || existingAssignment.tricoteuse_name,
          updated_at: new Date()
        }
      }
    )

    if (result.matchedCount === 0) {
      throw new Error('Assignation non trouvée')
    }

     // Mettre à jour production_status si nécessaire
     if (result.modifiedCount > 0 && existingAssignment.order_id && existingAssignment.line_item_id) {
       const finalTricoteuseName = tricoteuseName || existingAssignment.tricoteuse_name
       
       // Récupérer le statut existant pour préserver les notes
       const existingStatus = await production.findOne({ 
         order_id: existingAssignment.order_id, 
         line_item_id: existingAssignment.line_item_id 
       })
       
        await production.updateOne(
          { order_id: existingAssignment.order_id, line_item_id: existingAssignment.line_item_id },
          { 
            $set: { 
              status: updateData.status || existingAssignment.status,
              assigned_to: finalTricoteuseName,
              tricoteuse: finalTricoteuseName,
              // NE JAMAIS TOUCHER AUX NOTES - elles restent intactes
              updated_at: new Date()
            }
          }
        )
     }

    return result.modifiedCount > 0
  }

  async deleteAssignment(assignmentId) {
    const collection = db.getCollection('article_assignments')
    const production = db.getCollection('production_status')
    
    if (!db.isValidObjectId(assignmentId)) {
      throw new Error('ID d\'assignation invalide')
    }

    // Récupérer l'assignation avant de la supprimer
    const assignment = await collection.findOne({ _id: db.createObjectId(assignmentId) })
    if (!assignment) {
      throw new Error('Aucune assignation trouvée avec cet ID')
    }

    // Nettoyer production_status quand on supprime l'assignation
    if (assignment.order_id && assignment.line_item_id) {
      await production.updateOne(
        { order_id: assignment.order_id, line_item_id: assignment.line_item_id },
        { 
          $set: { 
            status: 'a_faire',
            assigned_to: null,
            tricoteuse: null,
            // NE JAMAIS TOUCHER AUX NOTES - elles restent intactes
            updated_at: new Date()
          }
        }
      )
    }

    const result = await collection.deleteOne({ _id: db.createObjectId(assignmentId) })
    return { deleted: result.deletedCount > 0, assignment }
  }

  async deleteAssignmentByArticleId(articleId) {
    const collection = db.getCollection('article_assignments')
    const production = db.getCollection('production_status')
    
    // Récupérer l'assignation avant de la supprimer
    const assignment = await collection.findOne({ article_id: articleId })
    
    const result = await collection.deleteOne({ article_id: articleId })
    
    // Nettoyer production_status si l'assignation a été supprimée
    if (result.deletedCount > 0 && assignment && assignment.order_id && assignment.line_item_id) {
      await production.updateOne(
        { order_id: assignment.order_id, line_item_id: assignment.line_item_id },
        { 
          $set: { 
            status: 'a_faire',
            assigned_to: null,
            tricoteuse: null,
            // NE JAMAIS TOUCHER AUX NOTES - elles restent intactes
            updated_at: new Date()
          }
        }
      )
    }
    
    return result.deletedCount > 0
  }

  async syncAssignmentsStatus() {
    const assignmentsCollection = db.getCollection('article_assignments')
    const productionCollection = db.getCollection('production_status')
    const tricoteusesCollection = db.getCollection('tricoteuses')
    
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

      // Récupérer le nom de la tricoteuse
      let tricoteuseName = assignment.tricoteuse_name
      if (!tricoteuseName && assignment.tricoteuse_id) {
        const tricoteuse = await tricoteusesCollection.findOne({ _id: assignment.tricoteuse_id })
        tricoteuseName = tricoteuse?.firstName || 'Tricoteuse inconnue'
      }

      await productionCollection.updateOne(
        { order_id: parseInt(orderId), line_item_id: parseInt(lineItemId) },
        { 
          $set: { 
            status: assignment.status,
            assigned_to: tricoteuseName || null,
            tricoteuse: tricoteuseName || null,
            // NE JAMAIS TOUCHER AUX NOTES - elles restent intactes
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
