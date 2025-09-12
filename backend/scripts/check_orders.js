require('dotenv').config();
const database = require('../services/database');

async function checkSpecificOrders() {
  try {
    await database.connect();
    console.log('✅ Connexion à la base de données');
    
    const orderItemsCollection = database.getCollection('order_items');
    
    const ordersToCheck = [391045, 391125, 391137, 391138];
    
    console.log('🔍 Vérification des commandes:');
    
    for (const orderId of ordersToCheck) {
      const exists = await orderItemsCollection.findOne({ order_id: orderId });
      if (exists) {
        console.log(`   ✅ ${orderId} - DÉJÀ EN BDD`);
      } else {
        console.log(`   ❌ ${orderId} - MANQUANTE`);
      }
    }
    
    console.log('\n📋 Résumé:');
    const missingOrders = [];
    for (const orderId of ordersToCheck) {
      const exists = await orderItemsCollection.findOne({ order_id: orderId });
      if (!exists) {
        missingOrders.push(orderId);
      }
    }
    
    if (missingOrders.length > 0) {
      console.log(`Commandes manquantes: ${missingOrders.join(', ')}`);
    } else {
      console.log('Toutes les commandes sont déjà en BDD');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await database.disconnect();
    console.log('🔌 Connexion fermée');
  }
}

checkSpecificOrders();
