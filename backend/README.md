# Backend MongoDB API - Maisoncléo

## 🚀 Installation

1. **Installer les dépendances**
```bash
npm install
```

2. **Configuration des variables d'environnement**
Créer un fichier `.env` basé sur `.env.example` :

```env
# Configuration MongoDB
MONGO_URI=mongodb://localhost:27017

# Configuration WooCommerce
WOOCOMMERCE_URL=https://maisoncleo.com
WOOCOMMERCE_CONSUMER_KEY=ck_votre_cle_consommateur
WOOCOMMERCE_CONSUMER_SECRET=cs_votre_secret_consommateur

# Port du serveur
PORT=3001
```

3. **Démarrer le serveur**
```bash
npm start
```

## 📊 Endpoints disponibles

### Synchronisation
- `POST /api/sync/orders` - Synchroniser les commandes WooCommerce

### Commandes
- `GET /api/orders` - Récupérer toutes les commandes
- `GET /api/orders/production/:type` - Commandes par type de production

### Production
- `POST /api/production/dispatch` - Dispatcher vers production
- `PUT /api/production/status` - Mettre à jour le statut
- `GET /api/production-status` - Statuts de production
- `POST /api/production-status` - Mettre à jour statut

### WooCommerce (Proxy)
- `GET /api/woocommerce/products/:productId/permalink` - Permalink d'un produit
- `POST /api/woocommerce/products/permalink/batch` - Permalinks en lot

## 🔧 Configuration WooCommerce

1. **Récupérer les clés API** depuis votre site WordPress :
   - Aller dans WooCommerce > Réglages > Avancé > API REST
   - Créer une nouvelle clé avec les permissions "Lecture/Écriture"

2. **Ajouter les clés dans le fichier `.env`**

## 💡 Fonctionnalités

- **Synchronisation automatique** des commandes WooCommerce
- **Stockage en BDD** avec permalinks des produits
- **Proxy WooCommerce** pour éviter les erreurs CORS
- **Gestion de production** (maille/couture)
- **Cache des permalinks** pour optimiser les performances

## 🚨 Dépannage

### Erreurs CORS
- Les requêtes WooCommerce passent maintenant par le backend
- Plus d'erreurs CORS côté frontend

### Erreurs 500 WooCommerce
- Gestion d'erreurs robuste avec fallback
- Timeouts configurés pour éviter les blocages

### Permalinks manquants
- Vérifier la configuration WooCommerce
- Vérifier que les produits existent dans WooCommerce
