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

      this.client = new MongoClient(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })

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
      await this.db.collection('orders').createIndex({ order_id: 1 }, { unique: true })
      await this.db.collection('orders').createIndex({ order_date: -1 })
      await this.db.collection('orders').createIndex({ status: 1 })
      await this.db.collection('orders').createIndex({ customer: 1 })

      // Collection des statuts de production
      await this.db.collection('production_status').createIndex({ order_id: 1, line_item_id: 1 }, { unique: true })
      await this.db.collection('production_status').createIndex({ status: 1 })
      await this.db.collection('production_status').createIndex({ updated_at: -1 })

      // Collection des assignations
      await this.db.collection('article_assignments').createIndex({ article_id: 1 }, { unique: true })
      await this.db.collection('article_assignments').createIndex({ tricoteuse_id: 1 })
      await this.db.collection('article_assignments').createIndex({ assigned_at: -1 })

      // Collection des tricoteuses
      await this.db.collection('tricoteuses').createIndex({ email: 1 }, { unique: true })
      await this.db.collection('tricoteuses').createIndex({ firstName: 1 })

      // Collection des délais
      await this.db.collection('delais').createIndex({ type: 1 }, { unique: true })

      // Collection des utilisateurs
      await this.db.collection('users').createIndex({ email: 1 }, { unique: true })

      console.log('✅ Collections et index créés')
    } catch (error) {
      console.error('❌ Erreur création collections/index:', error)
      throw error
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
