# Maisoncléo - Gestion de Production

## 🚀 Architecture

**Frontend React** → **Backend MongoDB** → **WooCommerce API**

- ✅ **Plus d'erreurs CORS** : Tout passe par le backend
- ✅ **Vrais permalinks** : Stockés en BDD avec récupération côté serveur
- ✅ **Synchronisation automatique** : Au chargement de la page
- ✅ **Performance** : Cache et optimisations

## 🔧 Configuration

### 1. Backend MongoDB
```bash
cd backend
npm install
npm start
```

### 2. Frontend React
```bash
cd frontend
npm install
npm run dev
```

## 📊 Fonctionnement

1. **Chargement de la page** → Synchronisation automatique via `/api/sync/orders`
2. **Backend récupère** les commandes WooCommerce + permalinks
3. **Stockage en BDD** avec tous les détails
4. **Affichage** des articles avec liens cliquables

## 🧪 Test

```bash
cd backend
node test-connection.js
```

## 🎯 Résultat attendu

- **Titres cliquables** → Redirection vers fiches produit WooCommerce
- **Permalinks stockés** en BDD (plus de requêtes répétées)
- **Synchronisation** automatique et transparente
- **Performance** optimisée avec cache

## 🚨 Dépannage

### Erreurs CORS
- Vérifier que le backend tourne sur le port 3001
- Vérifier la configuration CORS dans `mongodb-api.js`

### Permalinks manquants
- Vérifier les clés WooCommerce dans `.env`
- Vérifier les logs du backend
- Tester avec `test-connection.js`
