require('dotenv').config();
const database = require('../services/database');

async function clearAssignments() {
  try {
    await database.connect();
    console.log('✅ Connexion à la base de données');
    
    const assignmentsCollection = database.getCollection('article_assignments');
    
    // Compter les assignations avant suppression
    const assignmentsCount = await assignmentsCollection.countDocuments();
    console.log(`📊 Assignations présentes: ${assignmentsCount}`);
    
    if (assignmentsCount > 0) {
      // Supprimer toutes les assignations
      const result = await assignmentsCollection.deleteMany({});
      console.log(`🗑️ Suppression terminée: ${result.deletedCount} assignations supprimées`);
    } else {
      console.log('✅ Aucune assignation à supprimer');
    }
    
    console.log('✅ Projet propre - toutes les assignations ont été supprimées');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await database.disconnect();
    console.log('🔌 Connexion fermée');
  }
}

clearAssignments();
