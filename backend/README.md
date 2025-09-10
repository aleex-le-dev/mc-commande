# API Maison Cléo - Backend Refactorisé

## Structure du projet

```
backend/
├── app.js                 # Configuration principale de l'application
├── server.js              # Point d'entrée du serveur
├── services/              # Services métier
│   ├── database.js        # Service de base de données
│   ├── ordersService.js   # Gestion des commandes
│   ├── assignmentsService.js # Gestion des assignations
│   ├── tricoteusesService.js # Gestion des tricoteuses
│   └── productionService.js  # Gestion de la production
├── routes/                # Routes API
│   ├── orders.js          # Routes des commandes
│   ├── assignments.js     # Routes des assignations
│   ├── tricoteuses.js     # Routes des tricoteuses
│   └── production.js      # Routes de production
├── middleware/            # Middleware personnalisés
│   └── cors.js           # Configuration CORS
└── utils/                # Utilitaires (à créer si nécessaire)
```

## Services

### DatabaseService
- Gestion de la connexion MongoDB
- Création des collections et index
- Validation des ObjectId
- Méthodes utilitaires pour la base de données

### OrdersService
- CRUD des commandes
- Pagination et filtres
- Statistiques des commandes

### AssignmentsService
- CRUD des assignations
- Synchronisation des statuts
- Gestion des assignations par article

### TricoteusesService
- CRUD des tricoteuses
- Authentification
- Hachage des mots de passe

### ProductionService
- Gestion des statuts de production
- Mise à jour en lot
- Statistiques de production

## Routes API

### Commandes (`/api/orders`)
- `GET /` - Liste paginée des commandes
- `GET /:id` - Détails d'une commande
- `POST /` - Créer une commande
- `PUT /:id` - Mettre à jour une commande
- `DELETE /:id` - Supprimer une commande
- `GET /stats` - Statistiques des commandes

### Assignations (`/api/assignments`)
- `GET /` - Liste des assignations
- `GET /:articleId` - Assignation d'un article
- `POST /` - Créer une assignation
- `PUT /:assignmentId` - Mettre à jour une assignation
- `DELETE /:assignmentId` - Supprimer une assignation
- `DELETE /by-article/:articleId` - Supprimer par article
- `POST /sync-assignments-status` - Synchroniser les statuts

### Tricoteuses (`/api/tricoteuses`)
- `GET /` - Liste des tricoteuses
- `GET /:id` - Détails d'une tricoteuse
- `POST /` - Créer une tricoteuse
- `PUT /:id` - Mettre à jour une tricoteuse
- `DELETE /:id` - Supprimer une tricoteuse
- `POST /authenticate` - Authentifier une tricoteuse

### Production (`/api/production`)
- `GET /status/:orderId/:lineItemId` - Statut de production
- `PUT /status/:orderId/:lineItemId` - Mettre à jour le statut
- `GET /stats` - Statistiques de production
- `GET /by-status/:status` - Articles par statut
- `POST /bulk-update` - Mise à jour en lot

## Démarrage

```bash
# Installation des dépendances
npm install

# Démarrage en développement
node server.js

# Ou directement
node app.js
```

## Variables d'environnement

```env
MONGO_URI=mongodb://...
WOOCOMMERCE_URL=https://...
WOOCOMMERCE_CONSUMER_KEY=...
WOOCOMMERCE_CONSUMER_SECRET=...
PORT=3001
NODE_ENV=development
VITE_ALLOWED_ORIGINS=http://localhost:5173
```

## Avantages de la refactorisation

1. **Séparation des responsabilités** : Chaque service a une responsabilité unique
2. **Réutilisabilité** : Les services peuvent être réutilisés dans différents contextes
3. **Maintenabilité** : Code plus facile à maintenir et déboguer
4. **Testabilité** : Chaque service peut être testé indépendamment
5. **Évolutivité** : Facile d'ajouter de nouvelles fonctionnalités
6. **Lisibilité** : Code plus lisible et organisé
