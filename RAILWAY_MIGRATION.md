# Migration vers Railway - Guide complet

## 🚀 Étapes de migration

### 1. Créer un compte Railway
1. Aller sur [railway.app](https://railway.app)
2. Se connecter avec GitHub
3. Créer un nouveau projet

### 2. Déployer le backend
1. Dans Railway Dashboard, cliquer "New Project"
2. Choisir "Deploy from GitHub repo"
3. Sélectionner le repo `maisoncleo`
4. Choisir le dossier `backend/`
5. Railway détectera automatiquement Node.js

### 3. Configurer les variables d'environnement
Dans Railway Dashboard > Variables, ajouter :

```bash
# Base de données (copier depuis Render)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/maisoncleo?retryWrites=true&w=majority

# Configuration serveur
PORT=3001
NODE_ENV=production

# CORS (important !)
CORS_ORIGIN=https://fermeeutbouque.maisoncleo.fr
VITE_ALLOWED_ORIGINS=https://fermeeutbouque.maisoncleo.fr,http://localhost:5173

# WordPress API (copier depuis Render)
WORDPRESS_API_URL=https://fermeeutbouque.maisoncleo.fr/wp-json/wc/v3
WORDPRESS_CONSUMER_KEY=your_consumer_key
WORDPRESS_CONSUMER_SECRET=your_consumer_secret

# Sécurité (copier depuis Render)
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
```

### 4. Obtenir l'URL Railway
1. Une fois déployé, Railway donnera une URL comme : `https://maisoncleo-backend-production.up.railway.app`
2. Noter cette URL

### 5. Configuration du frontend (déjà fait !)
Le frontend est configuré pour utiliser Railway par défaut avec Render en fallback :

#### Configuration automatique
- **Railway** : Backend principal (rapide)
- **Render** : Backend de secours (stable)
- **Fallback automatique** : Si Railway est indisponible, utilise Render

#### Variables d'environnement
- `VITE_API_URL` : URL du backend (Railway par défaut)
- Si non définie, utilise Railway automatiquement
- Fallback vers Render en cas de problème

#### Test des backends
```javascript
import { testBothBackends } from './src/config/api.js'

// Tester les deux backends
const result = await testBothBackends()
console.log('Backend utilisé:', result.backend)
```

### 6. Tester la migration
1. Déployer le frontend avec les nouvelles URLs
2. Tester toutes les fonctionnalités
3. Vérifier les performances (devraient être bien meilleures !)

## ✅ Avantages de Railway

- **Démarrage instantané** : Pas de cold start comme Render
- **Performance** : Serveurs plus rapides
- **Fiabilité** : Moins de timeouts
- **Prix** : Gratuit jusqu'à 5$/mois
- **Monitoring** : Logs en temps réel

## 🔧 Configuration avancée

### Healthcheck
Railway utilisera automatiquement `/api/health` pour vérifier la santé de l'app.

### Domaine personnalisé (optionnel)
Dans Railway Dashboard > Settings > Domains, ajouter :
- `api.maisoncleo.fr` → `maisoncleo-backend-production.up.railway.app`

## 🔄 Gestion des backends

### Basculement manuel
Pour forcer l'utilisation de Render :
```javascript
// Dans la console du navigateur
localStorage.setItem('force_render_backend', 'true')
// Recharger la page
```

### Retour à Railway
```javascript
// Dans la console du navigateur
localStorage.removeItem('force_render_backend')
// Recharger la page
```

### Configuration des variables d'environnement
- **Railway par défaut** : `VITE_API_URL` non définie ou URL Railway
- **Render forcé** : `VITE_API_URL=https://maisoncleo-commande.onrender.com`

## 🚨 Rollback si problème
Si Railway ne fonctionne pas :
1. Le système basculera automatiquement vers Render
2. Ou définir `VITE_API_URL=https://maisoncleo-commande.onrender.com`
3. Railway peut être supprimé sans impact

## 📊 Monitoring
Railway Dashboard fournit :
- Logs en temps réel
- Métriques de performance
- Usage des ressources
- Status de santé
