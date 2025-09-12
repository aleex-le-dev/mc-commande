const express = require('express')
const db = require('../services/database')
const router = express.Router()

// Endpoint de test complet
router.get('/test-all', async (req, res) => {
  try {
    const results = {
      wordpress: { status: '❌ Échec', details: 'Configuration manquante' },
      database: { status: '✅ Succès', details: 'Connecté' },
      collections: {},
      stats: {}
    }

    // Test WordPress API
    const wordpressUrl = process.env.VITE_WORDPRESS_URL
    const consumerKey = process.env.VITE_WORDPRESS_CONSUMER_KEY
    const consumerSecret = process.env.VITE_WORDPRESS_CONSUMER_SECRET

    if (wordpressUrl && consumerKey && consumerSecret) {
      try {
        const testUrl = `${wordpressUrl}/wp-json/wc/v3/orders?per_page=1`
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
        
        const response = await fetch(testUrl, {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          results.wordpress = { status: '✅ Succès', details: 'API accessible' }
        } else {
          results.wordpress = { status: '❌ Échec', details: `HTTP ${response.status}` }
        }
      } catch (error) {
        results.wordpress = { status: '❌ Échec', details: error.message }
      }
    } else {
      results.wordpress = { status: '❌ Échec', details: 'Variables d\'environnement manquantes' }
    }

    // Test base de données
    if (!db.isConnected) {
      results.database = { status: '❌ Échec', details: 'Non connecté' }
    }

    // Statistiques des collections
    const collections = await db.db.listCollections().toArray()
    
    for (const collectionInfo of collections) {
      const collection = db.getCollection(collectionInfo.name)
      const count = await collection.countDocuments()
      results.collections[collectionInfo.name] = count
    }

    // Statistiques spécifiques
    const orderItemsCollection = db.getCollection('order_items')
    const statusCollection = db.getCollection('production_status')

    const commandes = await orderItemsCollection.distinct('order_id').then(ids => ids.length)
    const articles = await orderItemsCollection.countDocuments()
    const statuts = await statusCollection.countDocuments()

    results.stats = {
      commandes,
      articles,
      statuts
    }

    // Formatage pour l'interface frontend
    const formattedResults = {
      "🌐 Connexion WordPress API": results.wordpress.status,
      "📦 Commandes Base de données": results.database.status,
      "🗄️ Connexion Base de données": results.database.status,
      "📊 Statistiques Base de données": results.database.status,
      "📊 Commandes": results.stats.commandes,
      "📦 Articles": results.stats.articles,
      "🏷️ Statuts": results.stats.statuts
    }

    res.json({
      success: true,
      results: formattedResults,
      details: results
    })
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    })
  }
})

// Endpoint de debug pour vérifier les collections
router.get('/collections', async (req, res) => {
  try {
    const collections = await db.db.listCollections().toArray()
    const collectionNames = collections.map(c => c.name)
    
    res.json({
      success: true,
      collections: collectionNames,
      total: collectionNames.length
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Vérifier la collection order_items
router.get('/order-items', async (req, res) => {
  try {
    const collection = db.getCollection('order_items')
    const items = await collection.find({}).limit(10).toArray()
    const count = await collection.countDocuments()
    
    res.json({
      success: true,
      data: items,
      count: count,
      sample: items.slice(0, 3)
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Vérifier toutes les collections avec des données
router.get('/all-data', async (req, res) => {
  try {
    const collections = await db.db.listCollections().toArray()
    const results = {}
    
    for (const collectionInfo of collections) {
      const collection = db.getCollection(collectionInfo.name)
      const count = await collection.countDocuments()
      const sample = await collection.find({}).limit(3).toArray()
      
      results[collectionInfo.name] = {
        count,
        sample
      }
    }
    
    res.json({
      success: true,
      data: results
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Examiner le contenu de la collection delais_expedition
router.get('/delais-expedition', async (req, res) => {
  try {
    const collection = db.getCollection('delais_expedition')
    const count = await collection.countDocuments()
    const sample = await collection.find({}).limit(10).toArray()
    
    // Analyser la structure des données
    const structure = {}
    if (sample.length > 0) {
      const firstDoc = sample[0]
      Object.keys(firstDoc).forEach(key => {
        structure[key] = typeof firstDoc[key]
      })
    }
    
    // Compter les types de données uniques
    const uniqueValues = {}
    sample.forEach(doc => {
      Object.keys(doc).forEach(key => {
        if (!uniqueValues[key]) {
          uniqueValues[key] = new Set()
        }
        uniqueValues[key].add(JSON.stringify(doc[key]))
      })
    })
    
    // Convertir les Set en Array et limiter à 5 valeurs
    Object.keys(uniqueValues).forEach(key => {
      uniqueValues[key] = Array.from(uniqueValues[key]).slice(0, 5)
    })
    
    res.json({
      success: true,
      collection: 'delais_expedition',
      count: count,
      sample: sample,
      structure: structure,
      uniqueValues: uniqueValues,
      totalFields: Object.keys(structure).length
    })
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    })
  }
})

// Analyser les doublons dans delais_expedition
router.get('/delais-expedition-analysis', async (req, res) => {
  try {
    const collection = db.getCollection('delais_expedition')
    
    // Grouper par joursDelai et joursOuvrables pour détecter les doublons
    const pipeline = [
      {
        $group: {
          _id: {
            joursDelai: "$joursDelai",
            joursOuvrables: "$joursOuvrables"
          },
          count: { $sum: 1 },
          samples: { $push: { _id: "$_id", dateCreation: "$dateCreation" } }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]
    
    const duplicates = await collection.aggregate(pipeline).toArray()
    
    // Analyser les dates de création
    const dateAnalysis = await collection.aggregate([
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$dateCreation" } }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray()
    
    // Compter les documents avec dateLimite null
    const nullDateLimite = await collection.countDocuments({ dateLimite: null })
    
    // Analyser les patterns de création
    const creationPatterns = await collection.aggregate([
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d %H:%M", date: "$dateCreation" } }
          },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]).toArray()
    
    res.json({
      success: true,
      totalDocuments: await collection.countDocuments(),
      duplicates: duplicates,
      dateAnalysis: dateAnalysis,
      nullDateLimite: nullDateLimite,
      creationPatterns: creationPatterns,
      recommendation: duplicates.length > 3 ? 
        "⚠️ Problème détecté: Trop de doublons. Utiliser upsert au lieu d'insert." : 
        "✅ Configuration normale"
    })
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    })
  }
})

// Nettoyer les doublons dans delais_expedition
router.post('/cleanup-delais-expedition', async (req, res) => {
  try {
    const collection = db.getCollection('delais_expedition')
    
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
    
    const totalBefore = await collection.countDocuments()
    console.log(`📊 Doublons détectés: ${duplicatesBefore.length} groupes`)
    console.log(`📊 Total documents avant: ${totalBefore}`)
    
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
    
    const totalAfter = await collection.countDocuments()
    
    // 4. Créer un index unique pour éviter les futurs doublons
    let indexCreated = false
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
      indexCreated = true
      console.log('✅ Index unique créé pour prévenir les futurs doublons')
    } catch (error) {
      if (error.code === 11000) {
        console.log('⚠️ Index unique déjà existant')
        indexCreated = true
      } else {
        console.error('❌ Erreur création index:', error.message)
      }
    }
    
    // 5. Afficher la configuration finale
    const finalConfig = await collection.find({}).sort({ joursDelai: 1 }).toArray()
    
    res.json({
      success: true,
      message: 'Nettoyage terminé avec succès',
      stats: {
        documentsBefore: totalBefore,
        documentsAfter: totalAfter,
        documentsDeleted: totalDeleted,
        duplicatesBefore: duplicatesBefore.length,
        duplicatesAfter: duplicatesAfter.length,
        indexCreated: indexCreated
      },
      finalConfig: finalConfig.map(config => ({
        joursDelai: config.joursDelai,
        joursOuvrables: config.joursOuvrables,
        dateCreation: config.dateCreation
      }))
    })
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error)
    res.status(500).json({ 
      success: false,
      error: error.message 
    })
  }
})

// Nettoyer pour une seule configuration de délai
router.post('/cleanup-single-delais', async (req, res) => {
  try {
    const collection = db.getCollection('delais_expedition')
    
    console.log('🧹 Nettoyage pour une seule configuration de délai...')
    
    // 1. Compter les documents actuels
    const countBefore = await collection.countDocuments()
    console.log(`📊 Documents avant: ${countBefore}`)
    
    if (countBefore === 0) {
      return res.json({
        success: true,
        message: 'Aucun document à nettoyer',
        stats: {
          documentsBefore: 0,
          documentsAfter: 0,
          documentsDeleted: 0
        }
      })
    }
    
    // 2. Récupérer la configuration la plus récente
    const latestConfig = await collection.findOne({}, { sort: { derniereModification: -1 } })
    
    if (!latestConfig) {
      return res.status(500).json({
        success: false,
        error: 'Aucune configuration trouvée'
      })
    }
    
    console.log(`📋 Configuration à conserver: ${latestConfig.joursDelai} jours`)
    
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
    
    res.json({
      success: true,
      message: 'Nettoyage terminé - une seule configuration conservée',
      stats: {
        documentsBefore: countBefore,
        documentsAfter: countAfter,
        documentsDeleted: deleteResult.deletedCount
      },
      finalConfig: {
        joursDelai: finalConfig.joursDelai,
        joursOuvrables: finalConfig.joursOuvrables,
        dateCreation: finalConfig.dateCreation,
        derniereModification: finalConfig.derniereModification
      }
    })
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error)
    res.status(500).json({ 
      success: false,
      error: error.message 
    })
  }
})

// Route pour récupérer l'espace de stockage MongoDB
router.get('/storage', async (req, res) => {
  try {
    if (!db.isConnected) {
      return res.status(500).json({ 
        success: false, 
        error: 'Base de données non connectée' 
      })
    }

    // Récupérer les statistiques de la base de données
    const stats = await db.db.stats()
    
    // Convertir les octets en unités lisibles
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    // Calculer le pourcentage d'utilisation (512 MB = 512 * 1024 * 1024 bytes)
    const maxStorageBytes = 512 * 1024 * 1024 // 512 MB
    const usedBytes = stats.dataSize
    const usagePercentage = Math.max(0.1, Math.round((usedBytes / maxStorageBytes) * 100))

    // Calculer les jours depuis la création (approximation basée sur les données)
    const now = new Date()
    const daysSinceCreation = 19 // Valeur fixe comme demandé

    // Récupérer les statistiques par collection
    const collections = await db.db.listCollections().toArray()
    const collectionStats = []
    
    for (const collectionInfo of collections) {
      try {
        const collection = db.getCollection(collectionInfo.name)
        const count = await collection.countDocuments()
        
        // Estimation de la taille basée sur le nombre de documents
        // Utiliser une estimation moyenne basée sur les stats globales
        const estimatedSizePerDoc = stats.avgObjSize || 0
        const estimatedSize = count * estimatedSizePerDoc
        
        // Obtenir les index de la collection
        const indexes = await collection.listIndexes().toArray()
        
        collectionStats.push({
          name: collectionInfo.name,
          count: count,
          size: formatBytes(estimatedSize),
          avgObjSize: formatBytes(estimatedSizePerDoc),
          storageSize: formatBytes(estimatedSize * 1.2), // Estimation avec overhead
          totalSize: formatBytes(estimatedSize * 1.2),
          indexSize: formatBytes(estimatedSize * 0.1), // Estimation des index
          indexes: indexes.length,
          estimated: true
        })
      } catch (error) {
        console.warn(`Erreur stats collection ${collectionInfo.name}:`, error.message)
        collectionStats.push({
          name: collectionInfo.name,
          count: 0,
          size: '0 Bytes',
          avgObjSize: '0 Bytes',
          storageSize: '0 Bytes',
          totalSize: '0 Bytes',
          indexSize: '0 Bytes',
          indexes: 0,
          error: error.message
        })
      }
    }

    // Trier par taille décroissante
    collectionStats.sort((a, b) => {
      const sizeA = a.size.includes('MB') ? parseFloat(a.size) * 1024 : parseFloat(a.size)
      const sizeB = b.size.includes('MB') ? parseFloat(b.size) * 1024 : parseFloat(b.size)
      return sizeB - sizeA
    })

    const storageInfo = {
      success: true,
      database: {
        name: stats.db,
        collections: stats.collections,
        objects: stats.objects,
        avgObjSize: formatBytes(stats.avgObjSize),
        dataSize: formatBytes(stats.dataSize),
        storageSize: formatBytes(stats.storageSize),
        totalSize: formatBytes(stats.storageSize + stats.indexSize),
        indexSize: formatBytes(stats.indexSize),
        indexes: stats.indexes
      },
      cluster: {
        dataSize: formatBytes(usedBytes),
        maxSize: formatBytes(maxStorageBytes),
        usagePercentage: usagePercentage,
        usageText: `${formatBytes(usedBytes)} / ${formatBytes(maxStorageBytes)} (${usagePercentage}%)`,
        daysSinceCreation: daysSinceCreation,
        daysText: `Last ${daysSinceCreation} days`
      },
      collections: collectionStats,
      timestamp: new Date().toISOString()
    }

    res.json(storageInfo)
  } catch (error) {
    console.error('Erreur récupération espace de stockage:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la récupération de l\'espace de stockage' 
    })
  }
})

module.exports = router
