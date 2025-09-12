require('dotenv').config();
const database = require('../services/database');

async function clearProductionAssignments() {
  try {
    await database.connect();
    const assignmentsCollection = database.getCollection('assignments');
    
    console.log('🗑️ Suppression des assignations de production...');
    
    // Compter avant suppression
    const assignmentsCount = await assignmentsCollection.countDocuments();
    console.log(`📊 Avant suppression: ${assignmentsCount} assignations`);
    
    if (assignmentsCount > 0) {
      // Supprimer toutes les assignations
      const deleteResult = await assignmentsCollection.deleteMany({});
      console.log(`   ✅ ${deleteResult.deletedCount} assignations supprimées`);
      
      // Vérification finale
      const finalAssignmentsCount = await assignmentsCollection.countDocuments();
      console.log(`📊 Après suppression: ${finalAssignmentsCount} assignations`);
    } else {
      console.log('   ℹ️ Aucune assignation à supprimer');
    }
    
    console.log('✅ Opération terminée');
    
    await database.disconnect();
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

clearProductionAssignments();
