# 🔧 Fix Railway - Erreur Railpack

## ❌ Problème identifié
L'erreur "Error creating build plan with Railpack" indique un problème avec la détection automatique du build.

## ✅ Solutions appliquées

### 1. Configuration Railway améliorée
- `railway.json` : Ajout de `buildCommand: "npm install"`
- `nixpacks.toml` : Configuration explicite du build
- `package.json` : Script `postinstall` ajouté

### 2. Dans Railway Dashboard

#### Builder
- Changer de "Railpack" vers "Nixpacks"
- Ou garder "Railpack" mais avec la config corrigée

#### Build Command
```
npm install
```

#### Start Command
```
node mongodb-api.js
```

#### Healthcheck Path
```
/api/health
```

## 🚀 Redéploiement

1. **Commit et push** les changements :
```bash
git add .
git commit -m "Fix Railway build configuration"
git push
```

2. **Railway redéploiera automatiquement**

3. **Ou forcer un redéploiement** dans Railway Dashboard

## 🔍 Vérification

Une fois redéployé, vérifier :
- ✅ Build réussi
- ✅ Healthcheck OK
- ✅ URL accessible

## 🆘 Si ça ne marche toujours pas

### Alternative 1 : Docker
Créer un `Dockerfile` dans le dossier `backend/` :

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "mongodb-api.js"]
```

### Alternative 2 : Changer de builder
Dans Railway Dashboard > Settings > Build :
- Builder : "Dockerfile"
- Ou "Nixpacks" au lieu de "Railpack"
