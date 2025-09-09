# 🚀 Configuration Railway - Guide rapide

## 1. Créer le projet Railway

1. Aller sur [railway.app](https://railway.app)
2. Se connecter avec GitHub
3. Cliquer "New Project" → "Deploy from GitHub repo"
4. Sélectionner le repo `maisoncleo`
5. Choisir le dossier `backend/`

## 2. Configurer les variables d'environnement

Dans Railway Dashboard > Variables, ajouter :

### 🔐 Secrets de sécurité (OBLIGATOIRES)
```bash
JWT_SECRET=0f234502913aa50fcaa9638ab526776c149e10e05c7bcf965ecf99cac5a2794605773000eb0376f4e561919c30337cec97969e0e12ff436e510185bc8b763d07
SESSION_SECRET=033ccc371cea4d712bb170cbf76356139158e6e83e302b69c0e792e30bc7459638e15e6af928743e2ba40642193853a8ae969ad3db8608939ca08668eea099d7
```

### 🗄️ Base de données (copier depuis Render)
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/maisoncleo?retryWrites=true&w=majority
```

### ⚙️ Configuration serveur
```bash
PORT=3001
NODE_ENV=production
```

### 🌐 CORS (IMPORTANT !)
```bash
CORS_ORIGIN=https://fermeeutbouque.maisoncleo.fr
VITE_ALLOWED_ORIGINS=https://fermeeutbouque.maisoncleo.fr,http://localhost:5173
```

### 🔗 WordPress API (copier depuis Render)
```bash
WORDPRESS_API_URL=https://fermeeutbouque.maisoncleo.fr/wp-json/wc/v3
WORDPRESS_CONSUMER_KEY=ck_9bf30a4f573650e5fb0b1d8fb233be2439412e14
WORDPRESS_CONSUMER_SECRET=cs_fe01543ee16415f77e1957c74c8b7525fcc89f49
```

### 🖼️ Configuration images
```bash
MAX_IMAGE_SIZE=5242880
IMAGE_QUALITY=75
IMAGE_WIDTH=1024
```

## 3. Obtenir l'URL Railway

Une fois déployé, Railway donnera une URL comme :
`https://maisoncleo-backend-production.up.railway.app`

## 4. Tester le backend

```bash
# Tester la santé du backend
curl https://maisoncleo-backend-production.up.railway.app/api/health

# Ou utiliser le script de test
node test-railway.js
```

## 5. Mettre à jour le frontend

Dans Vercel/Render Dashboard > Environment Variables :
```bash
VITE_API_URL=https://maisoncleo-backend-production.up.railway.app
```

## ✅ Vérification

- ✅ Backend Railway déployé
- ✅ Variables d'environnement configurées
- ✅ URL Railway obtenue
- ✅ Frontend mis à jour
- ✅ Test de connectivité réussi

## 🚨 En cas de problème

1. **Backend ne démarre pas** : Vérifier les variables d'environnement
2. **Erreur CORS** : Vérifier `CORS_ORIGIN` et `VITE_ALLOWED_ORIGINS`
3. **Erreur MongoDB** : Vérifier `MONGODB_URI`
4. **Erreur 502** : Le système basculera automatiquement vers Render

## 📊 Monitoring

Railway Dashboard > Logs pour voir les logs en temps réel.
