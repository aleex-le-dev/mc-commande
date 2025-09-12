const { MongoClient } = require('mongodb')
require('dotenv').config()

// Fonction pour créer ou mettre à jour un délai d'expédition
async function createOrUpdateDelaiExpedition(db, config) {
  const collection = db.collection('delais_expedition')
  
  // Créer un filtre basé sur joursDelai et joursOuvrables
  const filter = {
    joursDelai: config.joursDelai,
    joursOuvrables: config.joursOuvrables
  }
  
  // Préparer le document à insérer/mettre à jour
  const now = new Date()
  const document = {
    ...config,
    dateCreation: now,
    derniereModification: now
  }
  
  // Utiliser upsert pour créer ou mettre à jour
  const result = await collection.replaceOne(
    filter,
    document,
    { upsert: true }
  )
  
  return {
    success: true,
    operation: result.upsertedId ? 'created' : 'updated',
    id: result.upsertedId || result.matchedCount > 0 ? 'updated' : null
  }
}

// Fonction pour créer les configurations par défaut
async function createDefaultConfigurations() {
  const client = new MongoClient(process.env.MONGO_URI)
  
  try {
    await client.connect()
    const db = client.db('maisoncleo')
    
    console.log('🔧 Création des configurations par défaut des délais...')
    
    // Configurations par défaut
    const defaultConfigs = [
      {
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
      },
      {
        joursDelai: 21,
        joursOuvrables: {
          lundi: true,
          mardi: true,
          mercredi: true,
          jeudi: true,
          vendredi: false,
          samedi: false,
          dimanche: false
        }
      },
      {
        joursDelai: 27,
        joursOuvrables: {
          lundi: true,
          mardi: true,
          mercredi: true,
          jeudi: true,
          vendredi: true,
          samedi: false,
          dimanche: false
        }
      },
      {
        joursDelai: 17,
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
    ]
    
    // Créer ou mettre à jour chaque configuration
    for (const config of defaultConfigs) {
      const result = await createOrUpdateDelaiExpedition(db, config)
      console.log(`✅ Configuration ${config.joursDelai} jours (${Object.keys(config.joursOuvrables).filter(day => config.joursOuvrables[day]).join(', ')}): ${result.operation}`)
    }
    
    // Vérifier le résultat final
    const collection = db.collection('delais_expedition')
    const count = await collection.countDocuments()
    const configs = await collection.find({}).sort({ joursDelai: 1 }).toArray()
    
    console.log(`\n📊 Résultat final:`)
    console.log(`📊 Total configurations: ${count}`)
    console.log(`📊 Configurations disponibles:`)
    configs.forEach(config => {
      const joursOuvrables = Object.entries(config.joursOuvrables)
        .filter(([_, value]) => value)
        .map(([day, _]) => day)
        .join(', ')
      console.log(`  - ${config.joursDelai} jours: ${joursOuvrables}`)
    })
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des configurations:', error)
  } finally {
    await client.close()
  }
}

// Exécuter le script
if (require.main === module) {
  createDefaultConfigurations()
    .then(() => {
      console.log('🎉 Script terminé')
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Erreur fatale:', error)
      process.exit(1)
    })
}

module.exports = { createOrUpdateDelaiExpedition, createDefaultConfigurations }
