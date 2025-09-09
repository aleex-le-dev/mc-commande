# Architecture des Services Refactorisée

## Problème résolu

Le service `mongodbService.js` était monolithique avec 849 lignes et 29 fonctions exportées, mélangeant toutes les responsabilités.

## Solution : Architecture modulaire

### Services spécialisés créés :

#### 1. **Cache HTTP** (`cache/httpCacheService.js`)
- Gestion centralisée du cache mémoire et persistant
- Limitation des requêtes concurrentes
- Retry automatique avec backoff

#### 2. **Client HTTP** (`http/httpClientService.js`)
- Requêtes HTTP centralisées (GET, POST, PUT, DELETE)
- Gestion des erreurs et timeouts
- Test de connexion

#### 3. **Commandes** (`orders/ordersService.js`)
- Gestion des commandes et articles
- Pagination et recherche
- CRUD des commandes

#### 4. **Statuts de production** (`production/productionStatusService.js`)
- Gestion des statuts d'articles
- Mise à jour des statuts
- Gestion de l'urgence

#### 5. **Tricoteuses** (`tricoteuses/tricoteusesService.js`)
- CRUD des tricoteuses
- Cache des données
- Gestion des photos et couleurs

#### 6. **Assignations** (`assignments/assignmentsService.js`)
- Gestion des assignations d'articles
- Liaison tricoteuse-article
- Statuts d'assignation

#### 7. **Synchronisation** (`sync/syncService.js`)
- Synchronisation avec WooCommerce
- Logs de synchronisation
- Préchargement des données

#### 8. **Produits** (`products/productsService.js`)
- Gestion des permalinks
- Images de produits
- Informations produits

### Service principal : `apiService.js`

Orchestre tous les services spécialisés et fournit une interface unifiée pour la compatibilité.

## Avantages de la nouvelle architecture

✅ **Séparation claire des responsabilités**
✅ **Code plus maintenable et testable**
✅ **Réutilisabilité des services**
✅ **Performance améliorée** (cache centralisé)
✅ **Facilité de débogage**
✅ **Évolutivité** (ajout de nouveaux services facile)

## Migration

### Ancien code :
```javascript
import { updateArticleStatus, tricoteusesService } from './mongodbService'
```

### Nouveau code :
```javascript
import { ApiService } from './apiService'

// Utilisation
await ApiService.production.updateArticleStatus(orderId, lineItemId, status)
await ApiService.tricoteuses.getTricoteuses()
```

## Structure des dossiers

```
services/
├── cache/
│   └── httpCacheService.js
├── http/
│   └── httpClientService.js
├── orders/
│   └── ordersService.js
├── production/
│   └── productionStatusService.js
├── tricoteuses/
│   └── tricoteusesService.js
├── assignments/
│   └── assignmentsService.js
├── sync/
│   └── syncService.js
├── products/
│   └── productsService.js
└── apiService.js (service principal)
```

## Compatibilité

L'ancien `mongodbService.js` est maintenant un wrapper qui redirige vers `ApiService` pour maintenir la compatibilité pendant la transition.
