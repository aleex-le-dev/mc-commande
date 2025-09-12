require('dotenv').config();
const database = require('../services/database');
const ordersService = require('../services/ordersService');

class OrdersImporter {
  constructor() {
    this.orderIds = [391125, 391137, 391138];
    
    this.importedCount = 0;
    this.errorCount = 0;
  }

  async run() {
    try {
      console.log('🚀 Démarrage import commandes...');
      
      // Connexion à la base de données
      await database.connect();
      console.log('✅ Base de données connectée');
      
      const orderItemsCollection = database.getCollection('order_items');
      const productionStatusCollection = database.getCollection('production_status');
      
      console.log(`🔄 Import de ${this.orderIds.length} commandes...`);
      
      for (const orderId of this.orderIds) {
        await this.processOrder(orderId, orderItemsCollection, productionStatusCollection);
      }
      
      console.log('\n📊 Résumé de l\'import:');
      console.log(`✅ Commandes importées: ${this.importedCount}`);
      console.log(`❌ Erreurs: ${this.errorCount}`);
      console.log(`📦 Total articles: ${await orderItemsCollection.countDocuments()}`);
      
    } catch (error) {
      console.error('❌ Erreur générale:', error);
    } finally {
      await database.disconnect();
      console.log('🔌 Connexion fermée');
    }
  }

  async getOrderFromWooCommerce(orderId) {
    try {
      const baseUrl = process.env.VITE_WORDPRESS_URL;
      const consumerKey = process.env.VITE_WORDPRESS_CONSUMER_KEY;
      const consumerSecret = process.env.VITE_WORDPRESS_CONSUMER_SECRET;
      const apiVersion = process.env.VITE_WORDPRESS_API_VERSION || 'wc/v3';
      
      const url = `${baseUrl}/wp-json/${apiVersion}/orders/${orderId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64'),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Commande non trouvée
        }
        throw new Error(`Erreur API WooCommerce: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Erreur récupération commande ${orderId}:`, error);
      throw error;
    }
  }

  async processOrder(orderId, orderItemsCollection, productionStatusCollection) {
    try {
      console.log(`📦 Import commande ${orderId}...`);
      
      // Vérifier si la commande existe déjà
      const existingOrder = await orderItemsCollection.findOne({ order_id: orderId });
      if (existingOrder) {
        console.log(`   ⚠️ Commande ${orderId} déjà présente, ignorée`);
        return;
      }
      
      // Récupérer la commande depuis WooCommerce
      const wooOrder = await this.getOrderFromWooCommerce(orderId);
      if (!wooOrder) {
        console.log(`   ❌ Commande ${orderId} non trouvée sur WooCommerce`);
        this.errorCount++;
        return;
      }
      
      // Transformer la commande
      const transformedOrder = await ordersService.transformWooCommerceOrder(wooOrder);
      
        // Insérer les items avec classification couture/maille (même logique que le bouton sync)
        for (const item of transformedOrder.items) {
          // Déterminer le type de production selon le nom du produit (logique du bouton sync)
          const productName = item.product_name.toLowerCase();
          let productionType = 'couture'; // Par défaut
          
          // Mots-clés spécifiques pour identifier la maille (tricoté/tricotée/knitted/wool)
          const mailleKeywords = [
            'tricoté', 'tricotée', 'knitted', 'wool'
          ];
          
          // Vérifier si le produit contient des mots-clés de maille
          const isMaille = mailleKeywords.some(keyword => productName.includes(keyword));
          
          if (isMaille) {
            productionType = 'maille';
          }
          
          const orderItem = {
            order_id: transformedOrder.order_id,
            order_number: transformedOrder.order_number,
            order_date: transformedOrder.order_date,
            status: transformedOrder.status,
            customer: transformedOrder.customer,
            customer_email: transformedOrder.customer_email,
            customer_phone: transformedOrder.customer_phone,
            customer_address: transformedOrder.customer_address,
            customer_note: transformedOrder.customer_note,
            shipping_method: transformedOrder.shipping_method,
            shipping_carrier: transformedOrder.shipping_carrier,
            total: transformedOrder.total,
            created_at: transformedOrder.created_at,
            updated_at: transformedOrder.updated_at,
            line_item_id: item.line_item_id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
            meta_data: item.meta_data,
            image_url: item.image_url,
            permalink: item.permalink,
            variation_id: item.variation_id,
            production_status: {
              status: 'a_faire',
              production_type: productionType,
              urgent: false,
              notes: null,
              updated_at: new Date()
            }
          };
          
          await orderItemsCollection.insertOne(orderItem);
          
          // Créer ou mettre à jour le statut dans production_status
          await productionStatusCollection.updateOne(
            { order_id: transformedOrder.order_id, line_item_id: item.line_item_id },
            { 
              $set: { 
                status: 'a_faire',
                production_type: productionType,
                urgent: false,
                notes: null,
                updated_at: new Date()
              }
            },
            { upsert: true }
          );
        }
      
      this.importedCount++;
      console.log(`   ✅ Commande ${orderId} importée (${transformedOrder.items.length} articles) - Classification automatique couture/maille`);
      
    } catch (error) {
      console.error(`   ❌ Erreur commande ${orderId}:`, error.message);
      this.errorCount++;
    }
  }
}

// Exécuter l'import si le script est appelé directement
if (require.main === module) {
  const importer = new OrdersImporter();
  importer.run();
}

module.exports = OrdersImporter;
