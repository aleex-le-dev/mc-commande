require('dotenv').config();
const database = require('../services/database');

async function testOrdersQuery() {
  try {
    process.env.MONGO_URI = "mongodb+srv://alexandrejanacek:fq29afdkYYXxEOjo@maisoncleo.ts2zl9t.mongodb.net/";
    await database.connect();
    console.log('✅ Connexion à la base de données');
    
    const ordersService = require('../services/ordersService');
    
    console.log('🔍 Test de la requête getOrders...');
    const result = await ordersService.getOrders({
      page: 1,
      limit: 10,
      status: 'all',
      search: '',
      sortBy: 'order_date',
      sortOrder: 'asc'
    });
    
    console.log('✅ Requête réussie:');
    console.log(`   - Commandes: ${result.orders.length}`);
    console.log(`   - Total: ${result.pagination?.total || 'N/A'}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    console.error('Stack:', error.stack);
  } finally {
    await database.disconnect();
    console.log('🔌 Connexion fermée');
  }
}

testOrdersQuery();
