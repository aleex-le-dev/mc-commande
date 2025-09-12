require('dotenv').config();
const database = require('../services/database');

async function assignOrdersToChristine() {
  try {
    // Forcer l'URI MongoDB
    process.env.MONGO_URI = "mongodb+srv://alexandrejanacek:fq29afdkYYXxEOjo@maisoncleo.ts2zl9t.mongodb.net/";
    await database.connect();
    console.log('✅ Connexion à la base de données');
    
    const orderItemsCollection = database.getCollection('order_items');
    const productionStatusCollection = database.getCollection('production_status');
    const assignmentsCollection = database.getCollection('article_assignments');
    
    const orderIds = [380723, 385236, 386272, 388747, 389860, 389866];
    
    console.log(`📦 Mise en pause et assignation à Christine pour ${orderIds.length} commandes...`);
    
    let assignedCount = 0;
    
    for (const orderId of orderIds) {
      // Récupérer tous les articles de cette commande
      const articles = await orderItemsCollection.find({ order_id: orderId }).toArray();
      
      console.log(`\n📋 Commande ${orderId} (${articles.length} articles):`);
      
      for (const article of articles) {
        // Mettre à jour le statut de production en pause
        await productionStatusCollection.updateOne(
          { order_id: article.order_id, line_item_id: article.line_item_id },
          { 
            $set: { 
              status: 'en_pause',
              production_type: article.production_status.production_type,
              urgent: false,
              notes: 'Assigné à Christine',
              updated_at: new Date()
            }
          },
          { upsert: true }
        );
        
        // Créer l'assignation à Christine
        await assignmentsCollection.updateOne(
          { article_id: `${article.order_id}-${article.line_item_id}` },
          { 
            $set: { 
              article_id: `${article.order_id}-${article.line_item_id}`,
              tricoteuse_id: 'christine',
              tricoteuse_name: 'Christine',
              assigned_at: new Date(),
              status: 'en_pause'
            }
          },
          { upsert: true }
        );
        
        assignedCount++;
        console.log(`   ✅ ${article.order_id}-${article.line_item_id}: ${article.product_name} → En pause (Christine)`);
      }
    }
    
    console.log(`\n📊 Résumé de l'assignation:`);
    console.log(`   ✅ Articles assignés: ${assignedCount}`);
    console.log(`   👤 Assignés à: Christine`);
    console.log(`   ⏸️ Statut: En pause`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await database.disconnect();
    console.log('🔌 Connexion fermée');
  }
}

assignOrdersToChristine();
