const { MongoClient, ObjectId } = require('mongodb')

class DatabaseService {
  constructor() {
    this.client = null
    this.db = null
    this.isConnected = false
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGO_URI
      if (!mongoUri) {
        throw new Error('MONGO_URI non définie dans les variables d\'environnement')
      }

      this.client = new MongoClient(mongoUri)

      await this.client.connect()
      this.db = this.client.db('maisoncleo')
      this.isConnected = true

      // Créer les collections et index
      await this.createCollectionsAndIndexes()
      
      console.log('✅ Connecté à MongoDB Atlas')
      return this.db
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error)
      throw error
    }
  }

  async createCollectionsAndIndexes() {
    try {
      // Collection des commandes
      await this.createIndexIfNotExists('orders', { order_id: 1 }, { unique: true })
      await this.createIndexIfNotExists('orders', { order_date: -1 })
      await this.createIndexIfNotExists('orders', { status: 1 })
      await this.createIndexIfNotExists('orders', { customer: 1 })

      // Collection des statuts de production
      await this.createIndexIfNotExists('production_status', { order_id: 1, line_item_id: 1 }, { unique: true })
      await this.createIndexIfNotExists('production_status', { status: 1 })
      await this.createIndexIfNotExists('production_status', { updated_at: -1 })

      // Collection des assignations
      await this.createIndexIfNotExists('article_assignments', { article_id: 1 }, { unique: true })
      await this.createIndexIfNotExists('article_assignments', { tricoteuse_id: 1 })
      await this.createIndexIfNotExists('article_assignments', { assigned_at: -1 })

      // Collection des tricoteuses
      await this.createIndexIfNotExists('tricoteuses', { email: 1 }, { unique: true, sparse: true })
      await this.createIndexIfNotExists('tricoteuses', { firstName: 1 })

      // Collection des délais
      await this.createIndexIfNotExists('delais', { type: 1 }, { unique: true })

      // Collection des utilisateurs
      await this.createIndexIfNotExists('users', { email: 1 }, { unique: true })

      console.log('✅ Collections et index créés')
    } catch (error) {
      console.error('❌ Erreur création collections/index:', error)
      throw error
    }
  }

  async createIndexIfNotExists(collectionName, indexSpec, options = {}) {
    try {
      await this.db.collection(collectionName).createIndex(indexSpec, options)
    } catch (error) {
      // Ignorer les erreurs d'index existant
      if (error.code === 86 || error.codeName === 'IndexKeySpecsConflict') {
        console.log(`ℹ️ Index déjà existant pour ${collectionName}:`, indexSpec)
      } else {
        throw error
      }
    }
  }

  getDb() {
    if (!this.isConnected || !this.db) {
      throw new Error('Base de données non connectée')
    }
    return this.db
  }

  getCollection(name) {
    return this.getDb().collection(name)
  }

  isValidObjectId(id) {
    return ObjectId.isValid(id)
  }

  createObjectId(id) {
    return new ObjectId(id)
  }

  async disconnect() {
    if (this.client) {
      await this.client.close()
      this.isConnected = false
      console.log('✅ Déconnecté de MongoDB')
    }
  }
}

module.exports = new DatabaseService()
