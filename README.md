# Maison Cléo - Système de Gestion de Production

Système complet de gestion de production pour Maison Cléo avec interface React et API MongoDB.

## 🏗️ Structure du Projet

```
maisoncleo/
├── frontend/          # Application React (Vite + Tailwind)
├── backend/           # API MongoDB (Express)
├── package.json       # Configuration principale
└── README.md         # Ce fichier
```

## 🚀 Installation et Démarrage

### 1. Installation complète
```bash
npm run install:all
```

### 2. Démarrage en développement

#### **Option A : Lancer séparément (recommandé)**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

#### **Option B : Lancer ensemble**
```bash
npm run dev:all
```

### 3. Production
```bash
# Build du frontend
cd frontend
npm run build

# Démarrer le backend
cd backend
npm start
```

## 📱 Frontend (React)

**Port :** 5173 (Vite)

**Technologies :**
- React 19 + Vite
- Tailwind CSS
- React Query
- React Icons

**Fonctionnalités :**
- Gestion des commandes WooCommerce
- Traduction automatique des titres (Google Translate)
- Séparation maille/couture
- Gestion des statuts de production
- Interface responsive

## 🔧 Backend (MongoDB API)

**Port :** 3001

**Technologies :**
- Node.js + Express
- MongoDB
- CORS

**Endpoints :**
- `GET /api/production-status` - Liste des statuts
- `POST /api/production-status` - Mise à jour des statuts
- `GET /api/production-status/stats` - Statistiques

## 🗄️ Base de Données

**MongoDB :** Collection `production_status`

**Structure :**
```json
{
  "order_id": 123,
  "line_item_id": 456,
  "status": "a_faire|en_cours|termine",
  "assigned_to": "utilisateur",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

## 🌐 Variables d'Environnement

### Frontend (.env)
```
VITE_WORDPRESS_URL=https://votre-site.com
VITE_WORDPRESS_CONSUMER_KEY=votre_cle
VITE_WORDPRESS_CONSUMER_SECRET=votre_secret
VITE_MONGODB_URL=http://localhost:3001
```

### Backend (.env)
```
VITE_MONGODB_URL=mongodb://localhost:27017
PORT=3001
```

## 📊 Fonctionnalités

- **Gestion des commandes** WooCommerce
- **Traduction automatique** EN → FR
- **Séparation par type** : Tricoteuses (maille) / Couturières (couture)
- **Statuts de production** : À faire → En cours → Terminé
- **Interface temps réel** avec React Query
- **Filtres** par type et statut
- **Responsive design** avec Tailwind CSS

## 🔄 Workflow de Production

1. **Import automatique** des commandes WooCommerce
2. **Classification** maille/couture selon les mots-clés
3. **Attribution** aux équipes respectives
4. **Suivi des statuts** en temps réel
5. **Statistiques** de production

## 🛠️ Développement

### Ajouter une dépendance
```bash
# Frontend
cd frontend && npm install package-name

# Backend
cd backend && npm install package-name
```

### Scripts disponibles
- `npm run dev:all` - Démarrage complet (frontend + backend)
- `npm run install:all` - Installation complète

## 📝 Notes

- Le frontend se connecte au backend sur `http://localhost:3001`
- MongoDB doit être accessible sur l'URL configurée
- WooCommerce API doit être configurée avec les bonnes clés
- CORS est configuré pour le développement
- **Chaque dossier peut fonctionner indépendamment avec `npm run dev`**
