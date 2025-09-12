const { MongoClient } = require('mongodb')
require('dotenv').config()

async function cleanupDelaisExpedition() {
  const client = new MongoClient(process.env.MONGO_URI)
  
  try {
    await client.connect()
    const db = client.db('maisoncleo')
    const collection = db.collection('delais_expedition')
    
    console.log('🧹 Début du nettoyage de la collection delais_expedition...')
    
    // 1. Analyser les doublons avant nettoyage
    const duplicatesBefore = await collection.aggregate([
      {
        $group: {
          _id: {
            joursDelai: "$joursDelai",
            joursOuvrables: "$joursOuvrables"
          },
          count: { $sum: 1 },
          docs: { $push: { _id: "$_id", dateCreation: "$dateCreation" } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]).toArray()
    
    console.log(`📊 Doublons détectés: ${duplicatesBefore.length} groupes`)
    console.log(`📊 Total documents avant: ${await collection.countDocuments()}`)
    
    // 2. Pour chaque groupe de doublons, garder seulement le plus récent
    let totalDeleted = 0
    
    for (const duplicate of duplicatesBefore) {
      // Trier par date de création décroissante
      const sortedDocs = duplicate.docs.sort((a, b) => 
        new Date(b.dateCreation) - new Date(a.dateCreation)
      )
      
      // Garder le premier (le plus récent), supprimer les autres
      const toKeep = sortedDocs[0]
      const toDelete = sortedDocs.slice(1)
      
      console.log(`🔧 Groupe ${duplicate._id.joursDelai} jours: garder 1, supprimer ${toDelete.length}`)
      
      // Supprimer les doublons
      const deleteResult = await collection.deleteMany({
        _id: { $in: toDelete.map(doc => doc._id) }
      })
      
      totalDeleted += deleteResult.deletedCount
    }
    
    // 3. Vérifier le résultat
    const duplicatesAfter = await collection.aggregate([
      {
        $group: {
          _id: {
            joursDelai: "$joursDelai",
            joursOuvrables: "$joursOuvrables"
          },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]).toArray()
    
    console.log(`✅ Nettoyage terminé!`)
    console.log(`📊 Documents supprimés: ${totalDeleted}`)
    console.log(`📊 Documents restants: ${await collection.countDocuments()}`)
    console.log(`📊 Doublons restants: ${duplicatesAfter.length}`)
    
    // 4. Créer un index unique pour éviter les futurs doublons
    try {
      await collection.createIndex(
        { 
          joursDelai: 1, 
          "joursOuvrables.lundi": 1,
          "joursOuvrables.mardi": 1,
          "joursOuvrables.mercredi": 1,
          "joursOuvrables.jeudi": 1,
          "joursOuvrables.vendredi": 1,
          "joursOuvrables.samedi": 1,
          "joursOuvrables.dimanche": 1
        },
        { unique: true, name: "unique_delai_config" }
      )
      console.log('✅ Index unique créé pour prévenir les futurs doublons')
    } catch (error) {
      if (error.code === 11000) {
        console.log('⚠️ Index unique déjà existant')
      } else {
        console.error('❌ Erreur création index:', error.message)
      }
    }
    
    // 5. Afficher la configuration finale
    const finalConfig = await collection.find({}).sort({ joursDelai: 1 }).toArray()
    console.log('\n📋 Configuration finale des délais:')
    finalConfig.forEach(config => {
      console.log(`  - ${config.joursDelai} jours: ${JSON.stringify(config.joursOuvrables)}`)
    })
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error)
  } finally {
    await client.close()
  }
}

// Exécuter le script
if (require.main === module) {
  cleanupDelaisExpedition()
    .then(() => {
      console.log('🎉 Script terminé')
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Erreur fatale:', error)
      process.exit(1)
    })
}

module.exports = { cleanupDelaisExpedition }
