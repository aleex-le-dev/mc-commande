const db = require('./database')
const bcrypt = require('bcryptjs')

class TricoteusesService {
  async getTricoteuses() {
    const collection = db.getCollection('tricoteuses')
    return await collection.find({}).sort({ firstName: 1 }).toArray()
  }

  async getTricoteuseById(tricoteuseId) {
    const collection = db.getCollection('tricoteuses')
    
    if (!db.isValidObjectId(tricoteuseId)) {
      throw new Error('ID de tricoteuse invalide')
    }

    return await collection.findOne({ _id: db.createObjectId(tricoteuseId) })
  }

  async createTricoteuse(tricoteuseData) {
    const collection = db.getCollection('tricoteuses')
    
    // Vérifier si la tricoteuse existe déjà
    const existing = await collection.findOne({ email: tricoteuseData.email })
    if (existing) {
      throw new Error('Une tricoteuse avec cet email existe déjà')
    }

    // Hasher le mot de passe si fourni
    if (tricoteuseData.password) {
      tricoteuseData.password = await bcrypt.hash(tricoteuseData.password, 10)
    }

    const tricoteuse = {
      ...tricoteuseData,
      created_at: new Date(),
      updated_at: new Date()
    }

    const result = await collection.insertOne(tricoteuse)
    return { ...tricoteuse, _id: result.insertedId }
  }

  async updateTricoteuse(tricoteuseId, updateData) {
    const collection = db.getCollection('tricoteuses')
    
    if (!db.isValidObjectId(tricoteuseId)) {
      throw new Error('ID de tricoteuse invalide')
    }

    // Hasher le mot de passe si fourni
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10)
    }

    const result = await collection.updateOne(
      { _id: db.createObjectId(tricoteuseId) },
      { 
        $set: {
          ...updateData,
          updated_at: new Date()
        }
      }
    )

    if (result.matchedCount === 0) {
      throw new Error('Tricoteuse non trouvée')
    }

    return result.modifiedCount > 0
  }

  async deleteTricoteuse(tricoteuseId) {
    const collection = db.getCollection('tricoteuses')
    
    if (!db.isValidObjectId(tricoteuseId)) {
      throw new Error('ID de tricoteuse invalide')
    }

    const result = await collection.deleteOne({ _id: db.createObjectId(tricoteuseId) })
    return result.deletedCount > 0
  }

  async authenticateTricoteuse(email, password) {
    const collection = db.getCollection('tricoteuses')
    const tricoteuse = await collection.findOne({ email })
    
    if (!tricoteuse || !tricoteuse.password) {
      return null
    }

    const isValid = await bcrypt.compare(password, tricoteuse.password)
    if (!isValid) {
      return null
    }

    // Retourner la tricoteuse sans le mot de passe
    const { password: _, ...tricoteuseWithoutPassword } = tricoteuse
    return tricoteuseWithoutPassword
  }
}

module.exports = new TricoteusesService()
