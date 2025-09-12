const { MongoClient } = require('mongodb')
require('dotenv').config()

async function cleanupToSingleDelais() {
  const client = new MongoClient(process.env.MONGO_URI)
  
  try {
    await client.connect()
    const db = client.db('maisoncleo')
    const collection = db.collection('delais_expedition')
    
    console.log('🧹 Nettoyage pour une seule configuration de délai...')
    
    // 1. Compter les documents actuels
    const countBefore = await collection.countDocuments()
    console.log(`📊 Documents avant: ${countBefore}`)
    
    if (countBefore === 0) {
      console.log('✅ Aucun document à nettoyer')
      return
    }
    
    // 2. Récupérer la configuration la plus récente
    const latestConfig = await collection.findOne({}, { sort: { derniereModification: -1 } })
    
    if (!latestConfig) {
      console.log('❌ Aucune configuration trouvée')
      return
    }
    
    console.log(`📋 Configuration à conserver: ${latestConfig.joursDelai} jours`)
    console.log(`📅 Dernière modification: ${latestConfig.derniereModification}`)
    
    // 3. Supprimer tous les documents
    const deleteResult = await collection.deleteMany({})
    console.log(`🗑️ Documents supprimés: ${deleteResult.deletedCount}`)
    
    // 4. Insérer la configuration unique
    const now = new Date()
    const singleConfig = {
      ...latestConfig,
      dateCreation: now,
      derniereModification: now
    }
    
    // Supprimer l'_id pour en créer un nouveau
    delete singleConfig._id
    
    const insertResult = await collection.insertOne(singleConfig)
    console.log(`✅ Configuration unique créée: ${insertResult.insertedId}`)
    
    // 5. Vérifier le résultat
    const countAfter = await collection.countDocuments()
    const finalConfig = await collection.findOne({})
    
    console.log(`\n📊 Résultat final:`)
    console.log(`📊 Documents après: ${countAfter}`)
    console.log(`📊 Configuration unique:`)
    console.log(`  - Jours de délai: ${finalConfig.joursDelai}`)
    console.log(`  - Jours ouvrables: ${JSON.stringify(finalConfig.joursOuvrables)}`)
    console.log(`  - Date création: ${finalConfig.dateCreation}`)
    console.log(`  - Dernière modification: ${finalConfig.derniereModification}`)
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error)
  } finally {
    await client.close()
  }
}

// Exécuter le script
if (require.main === module) {
  cleanupToSingleDelais()
    .then(() => {
      console.log('🎉 Script terminé')
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Erreur fatale:', error)
      process.exit(1)
    })
}

module.exports = { cleanupToSingleDelais }
