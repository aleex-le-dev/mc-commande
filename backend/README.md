# API MongoDB - Gestion de Production Maison Cléo

## 🚀 Installation

1. **Installer les dépendances :**
   ```bash
   cd server
   npm install
   ```

2. **Configurer les variables d'environnement :**
   - Créer un fichier `.env` dans le dossier `server/`
   - Ajouter : `VITE_MONGODB_URL=mongodb://localhost:27017` (ou votre URL MongoDB)

3. **Démarrer le serveur :**
   ```bash
   npm start
   # ou en mode développement :
   npm run dev
   ```

## 📊 Endpoints disponibles

### GET `/api/production-status`
Récupère tous les statuts de production

### GET `/api/production-status/:orderId/:lineItemId`
Récupère le statut d'un article spécifique

### POST `/api/production-status`
Met à jour ou crée un statut de production
```json
{
  "order_id": 123,
  "line_item_id": 456,
  "status": "en_cours",
  "assigned_to": "tricoteuse1"
}
```

### GET `/api/production-status/type/:type`
Récupère les statuts par type de production (maille/couture)

### GET `/api/production-status/stats`
Récupère les statistiques de production

## 🗄️ Structure de la base de données

**Collection :** `production_status`

**Document :**
```json
{
  "_id": "ObjectId",
  "order_id": 123,
  "line_item_id": 456,
  "status": "a_faire|en_cours|termine",
  "assigned_to": "utilisateur",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

## 🔄 Statuts disponibles

- **`a_faire`** : Article en attente de production
- **`en_cours`** : Article en cours de production
- **`termine`** : Article terminé

## 🌐 Configuration CORS

Le serveur accepte les requêtes depuis n'importe quelle origine (développement). Pour la production, configurer CORS selon vos besoins.

## 📝 Notes

- Le serveur démarre sur le port 3001 par défaut
- Les statuts sont automatiquement créés lors de la première mise à jour
- Toutes les dates sont stockées en UTC
