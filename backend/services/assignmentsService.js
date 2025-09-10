const db = require('./database')

class AssignmentsService {
  async getAssignments() {
    const collection = db.getCollection('article_assignments')
    return await collection.find({}).sort({ assigned_at: -1 }).toArray()
  }

  async getAssignmentByArticleId(articleId) {
    const collection = db.getCollection('article_assignments')
    return await collection.findOne({ article_id: articleId })
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
    const assignment = {
      ...assignmentData,
      assigned_at: new Date(),
      updated_at: new Date()
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
