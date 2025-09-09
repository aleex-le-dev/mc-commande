# Dockerfile pour Railway - Backend Maison Cléo
FROM node:18-alpine

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances de production uniquement
RUN npm ci --only=production && npm cache clean --force

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 3001

# Commande de démarrage
CMD ["node", "mongodb-api.js"]
