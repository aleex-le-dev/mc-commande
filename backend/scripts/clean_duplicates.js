require('dotenv').config();
const database = require('../services/database');

async function cleanDuplicatesAndSync() {
  try {
    process.env.MONGO_URI = 'mongodb+srv://alexandrejanacek:fq29afdkYYXxEOjo@maisoncleo.ts2zl9t.mongodb.net/';
    await database.connect();
    console.log('✅ Connexion à la base de données');
    
    const assignmentsCollection = database.getCollection('article_assignments');
    const productionStatusCollection = database.getCollection('production_status');
    
    console.log('🧹 Nettoyage des doublons et synchronisation...');
    
    // 1. Nettoyer les assignations en gardant la plus récente
    console.log('\n1️⃣ Nettoyage des assignations:');
    const allAssignments = await assignmentsCollection.find({}).toArray();
    
    // Grouper par article_id et garder la plus récente
    const assignmentsByArticle = {};
    allAssignments.forEach(assignment => {
      if (!assignmentsByArticle[assignment.article_id] || 
          new Date(assignment.assigned_at) > new Date(assignmentsByArticle[assignment.article_id].assigned_at)) {
        assignmentsByArticle[assignment.article_id] = assignment;
      }
    });
    
    // Supprimer toutes les assignations
    await assignmentsCollection.deleteMany({});
    console.log('   🗑️ Anciennes assignations supprimées');
    
    // Recréer les assignations uniques
    const uniqueAssignments = Object.values(assignmentsByArticle);
    for (const assignment of uniqueAssignments) {
      await assignmentsCollection.insertOne(assignment);
    }
    console.log(`   ✅ ${uniqueAssignments.length} assignations uniques recréées`);
    
    // 2. Synchroniser production_status avec les assignations
    console.log('\n2️⃣ Synchronisation des statuts de production:');
    let syncedCount = 0;
    
    for (const assignment of uniqueAssignments) {
      const [orderId, lineItemId] = assignment.article_id.split('-');
      
      await productionStatusCollection.updateOne(
        { order_id: parseInt(orderId), line_item_id: parseInt(lineItemId) },
        { 
          $set: { 
            assigned_to: assignment.tricoteuse_id.toLowerCase(),
            assigned_name: assignment.tricoteuse_name,
            assigned_at: assignment.assigned_at,
            status: assignment.status,
            updated_at: new Date()
          }
        },
        { upsert: true }
      );
      
      syncedCount++;
      console.log(`   ✅ ${assignment.article_id} → ${assignment.tricoteuse_name} (${assignment.status})`);
    }
    
    console.log(`\n📊 Résumé de la synchronisation:`);
    console.log(`   ✅ Assignations uniques: ${uniqueAssignments.length}`);
    console.log(`   ✅ Statuts synchronisés: ${syncedCount}`);
    
    // 3. Vérification finale
    console.log('\n3️⃣ Vérification finale:');
    const finalAssignments = await assignmentsCollection.find({}).toArray();
    const finalStatuses = await productionStatusCollection.find({ assigned_to: { $ne: null } }).toArray();
    
    console.log(`   📊 Assignations: ${finalAssignments.length}`);
    console.log(`   📊 Statuts avec assignation: ${finalStatuses.length}`);
    
    // Afficher le détail des assignations finales
    console.log('\n📋 Assignations finales:');
    finalAssignments.forEach(assignment => {
      console.log(`   - ${assignment.article_id}: ${assignment.tricoteuse_name} (${assignment.status})`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await database.disconnect();
    console.log('🔌 Connexion fermée');
  }
}

cleanDuplicatesAndSync();
