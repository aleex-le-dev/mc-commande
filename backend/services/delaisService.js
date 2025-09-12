const db = require('./database')

class DelaisService {
  constructor() {
    this.collectionName = 'delais_expedition'
  }

  // Récupérer la configuration unique
  async getAllConfigurations() {
    try {
      const collection = db.getCollection(this.collectionName)
      const config = await collection.findOne({})
      
      return {
        success: true,
        data: config ? [config] : []
      }
    } catch (error) {
      console.error('Erreur récupération configuration délai:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Récupérer une configuration spécifique
  async getConfiguration(joursDelai, joursOuvrables) {
    try {
      const collection = db.getCollection(this.collectionName)
      const config = await collection.findOne({
        joursDelai: joursDelai,
        joursOuvrables: joursOuvrables
      })
      
      return {
        success: true,
        data: config
      }
    } catch (error) {
      console.error('Erreur récupération configuration délai:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Créer ou mettre à jour la configuration unique (remplace toujours)
  async createOrUpdateConfiguration(config) {
    try {
      const collection = db.getCollection(this.collectionName)
      
      // Supprimer toutes les configurations existantes pour n'en garder qu'une
      await collection.deleteMany({})
      
      // Préparer le document avec timestamps
      const now = new Date()
      const document = {
        ...config,
        dateCreation: now,
        derniereModification: now
      }
      
      // Insérer la nouvelle configuration unique
      const result = await collection.insertOne(document)
      
      return {
        success: true,
        operation: 'replaced',
        data: document
      }
    } catch (error) {
      console.error('Erreur création/mise à jour configuration délai:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Supprimer une configuration
  async deleteConfiguration(joursDelai, joursOuvrables) {
    try {
      const collection = db.getCollection(this.collectionName)
      const result = await collection.deleteOne({
        joursDelai: joursDelai,
        joursOuvrables: joursOuvrables
      })
      
      return {
        success: true,
        deletedCount: result.deletedCount
      }
    } catch (error) {
      console.error('Erreur suppression configuration délai:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Calculer la date limite pour une commande
  calculerDateLimite(dateCommande, joursOuvrables, joursDelai) {
    const aujourdhui = new Date(dateCommande)
    let dateLimite = new Date(aujourdhui)
    let joursRetires = 0
    
    // Remonter en arrière jusqu'à avoir retiré le bon nombre de jours ouvrables
    while (joursRetires < joursDelai) {
      dateLimite.setDate(dateLimite.getDate() - 1)
      
      const jourSemaine = dateLimite.getDay()
      const nomJour = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][jourSemaine]
      
      // Vérifier si c'est un jour ouvrable configuré
      if (joursOuvrables[nomJour]) {
        joursRetires++
      }
    }
    
    return dateLimite.toISOString().split('T')[0]
  }

  // Récupérer la configuration unique
  async getDefaultConfiguration() {
    try {
      const collection = db.getCollection(this.collectionName)
      
      // Récupérer la configuration unique
      const config = await collection.findOne({})
      
      if (config) {
        // Calculer la date limite actuelle
        const aujourdhui = new Date()
        const dateLimite = this.calculerDateLimite(aujourdhui, config.joursOuvrables, config.joursDelai)
        
        return {
          success: true,
          data: {
            ...config,
            dateLimite: dateLimite
          }
        }
      } else {
        // Retourner une configuration par défaut si aucune n'est trouvée
        const fallbackConfig = {
          joursDelai: 21,
          joursOuvrables: {
            lundi: true,
            mardi: true,
            mercredi: true,
            jeudi: true,
            vendredi: true,
            samedi: false,
            dimanche: false
          }
        }
        
        const aujourdhui = new Date()
        const dateLimite = this.calculerDateLimite(aujourdhui, fallbackConfig.joursOuvrables, fallbackConfig.joursDelai)
        
        return {
          success: true,
          data: {
            ...fallbackConfig,
            dateLimite: dateLimite
          }
        }
      }
    } catch (error) {
      console.error('Erreur récupération configuration par défaut:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

module.exports = new DelaisService()
