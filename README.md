# Maisoncléo - Gestion de Production

## 📋 Description

Application web de gestion de production pour Maisoncléo, permettant de gérer les commandes, les délais d'expédition et l'assignation des articles aux tricoteuses. L'application synchronise automatiquement les données depuis WooCommerce et gère intelligemment les jours fériés français.

## 🚀 Architecture

**Frontend React** → **Backend MongoDB** → **WooCommerce API**

- ✅ **Synchronisation automatique** des commandes WooCommerce
- ✅ **Gestion des délais** avec exclusion automatique des jours fériés
- ✅ **Assignation des articles** aux tricoteuses
- ✅ **Gestion des statuts** de production (en cours, en pause, terminé)
- ✅ **Cache intelligent** pour les images et données

## 🎯 Fonctionnalités Principales

### 📦 Gestion des Commandes
- **Synchronisation automatique** depuis WooCommerce
- **Affichage des articles** avec images et détails
- **Recherche et filtrage** des commandes
- **Gestion des métadonnées** (taille, couleur, quantité)

### ⏰ Gestion des Délais
- **Configuration des délais** d'expédition (jours ouvrables)
- **Exclusion automatique** des jours fériés français
- **Calcul intelligent** des dates limites
- **API gouvernementale** pour les jours fériés officiels
- **Indicateurs visuels** pour les articles en retard

### 🧶 Gestion des Tricoteuses
- **Profils des tricoteuses** avec photos et couleurs
- **Assignation des articles** aux artisans
- **Gestion des statuts** de production
- **Suivi des assignations** en temps réel

### 📊 Tableau de Bord
- **Vue d'ensemble** de la production
- **Statistiques** des commandes et statuts
- **Tests de connectivité** des APIs
- **Gestion des erreurs** et monitoring

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

### 3. Variables d'environnement
```bash
# Backend (.env)
MONGO_URI=mongodb://localhost:27017
VITE_WORDPRESS_URL=https://maisoncleo.com
VITE_WORDPRESS_CONSUMER_KEY=your_key
VITE_WORDPRESS_CONSUMER_SECRET=your_secret
```

## 📊 Fonctionnement

1. **Synchronisation** → Récupération automatique des commandes WooCommerce
2. **Stockage** → Sauvegarde en base MongoDB avec cache
3. **Gestion** → Interface de gestion des délais et assignations
4. **Production** → Suivi des statuts et assignations aux tricoteuses

## 🧪 Tests et Monitoring

### Test de connectivité
```bash
cd backend
node test-connection.js
```

### Test des jours fériés
- Interface de test dans l'onglet "Statut"
- Vérification de l'API gouvernementale
- Test de la logique d'exclusion

## 🎯 Résultats Attendus

- **Gestion centralisée** de la production
- **Délais précis** avec exclusion des jours fériés
- **Assignation efficace** des articles aux tricoteuses
- **Suivi en temps réel** de la production
- **Interface intuitive** pour les équipes

## 🚨 Dépannage

### Erreurs CORS
- Vérifier que le backend tourne sur le port 3001
- Vérifier la configuration CORS dans `mongodb-api.js`

### Jours fériés manquants
- Tester l'API gouvernementale dans l'onglet "Statut"
- Vérifier la connectivité internet
- Utiliser les jours fériés par défaut en cas d'erreur

### Synchronisation WooCommerce
- Vérifier les clés API dans `.env`
- Tester la connectivité avec `test-connection.js`
- Vérifier les logs du backend

## 🔄 Mise à Jour

L'application se met à jour automatiquement :
- **Jours fériés** : Mise à jour quotidienne depuis l'API gouvernementale
- **Commandes** : Synchronisation automatique au chargement
- **Cache** : Expiration automatique des données temporaires
