# 🐳 Fix Railway - Solution Docker

## ❌ Problème Nixpacks
L'erreur `undefined variable 'npm'` indique un problème avec la configuration Nixpacks.

## ✅ Solution Docker (plus fiable)

### 1. Fichiers créés
- `Dockerfile` - Configuration Docker optimisée
- `.dockerignore` - Exclure les fichiers inutiles
- `nixpacks.toml` - Configuration simplifiée

### 2. Dans Railway Dashboard

#### Builder
- Changer de "Nixpacks" vers **"Dockerfile"**
- Ou garder "Nixpacks" avec la config corrigée

#### Configuration
- **Build Command** : (laisser vide, Docker s'en charge)
- **Start Command** : `node mongodb-api.js`
- **Healthcheck Path** : `/api/health`

### 3. Redéploiement

```bash
git add .
git commit -m "Add Dockerfile for Railway deployment"
git push
```

## 🔧 Configuration alternative (Nixpacks)

Si vous préférez garder Nixpacks :

### Dans Railway Dashboard > Settings > Build
- **Builder** : "Nixpacks"
- **Build Command** : (laisser vide)
- **Start Command** : `node mongodb-api.js`

## ✅ Avantages Docker

- ✅ Plus fiable que Nixpacks
- ✅ Build plus rapide
- ✅ Moins d'erreurs
- ✅ Configuration explicite

## 🚀 Test

Une fois redéployé :
```bash
node test-railway.js
```

## 🆘 Si Docker ne marche pas

### Option 1 : Railway CLI
```bash
npm install -g @railway/cli
railway login
railway deploy
```

### Option 2 : Changer de région
Dans Railway Dashboard > Settings > Regions :
- Essayer "US East" au lieu de "EU West"
