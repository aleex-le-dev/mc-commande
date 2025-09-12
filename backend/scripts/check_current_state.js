require('dotenv').config();
const database = require('../services/database');

async function checkCurrentState() {
  try {
    process.env.MONGO_URI = 'mongodb+srv://alexandrejanacek:fq29afdkYYXxEOjo@maisoncleo.ts2zl9t.mongodb.net/';
    await database.connect();
    console.log('✅ Connexion à la base de données');
    
    const assignmentsCollection = database.getCollection('article_assignments');
    const productionStatusCollection = database.getCollection('production_status');
    
    // Vérifier toutes les assignations actuelles
    console.log('📊 Toutes les assignations actuelles:');
    const allAssignments = await assignmentsCollection.find({}).toArray();
    allAssignments.forEach(assignment => {
      console.log(`   - ${assignment.article_id}: ${assignment.tricoteuse_name} (${assignment.status})`);
    });
    
    // Vérifier les statuts de production avec assigned_to
    console.log('\n📊 Statuts de production avec assigned_to:');
    const allStatuses = await productionStatusCollection.find({ assigned_to: { $ne: null } }).toArray();
    allStatuses.forEach(status => {
      console.log(`   - ${status.order_id}-${status.line_item_id}: ${status.assigned_to} (${status.status})`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await database.disconnect();
    console.log('🔌 Connexion fermée');
  }
}

checkCurrentState();
