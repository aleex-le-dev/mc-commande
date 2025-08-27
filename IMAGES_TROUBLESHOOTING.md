# 🔍 Guide de Dépannage - Problème des Images

## 🚨 Symptômes
- Les images des produits ne s'affichent plus
- Erreur "Could not establish connection. Receiving end does not exist"
- Message "0 images chargées en mémoire pour un accès instantané"

## 🔧 Solutions

### 1. Vérifier le Backend
Le problème principal est souvent que le backend n'est pas démarré ou accessible.

```bash
# Démarrer le backend
cd backend
npm start

# Ou utiliser le script automatique
node start-backend.js
```

**Vérifier que le backend répond sur :** http://localhost:3001

### 2. Diagnostic Automatique
Utiliser le composant de test intégré :

1. Aller dans l'onglet "Modification des commandes"
2. Cliquer sur "Afficher Test des Images"
3. Cliquer sur "Lancer le Diagnostic"

Le diagnostic vérifiera :
- ✅ Connexion au backend
- ✅ Accès à la base de données MongoDB
- ✅ Disponibilité des images
- ✅ État d'IndexedDB

### 3. Vérifier la Base de Données
Les images sont stockées dans la collection `product_images` de MongoDB.

```bash
# Vérifier que MongoDB est accessible
# Vérifier que la collection product_images contient des données
```

### 4. Synchronisation des Images
Si la collection `product_images` est vide, lancer une synchronisation :

1. Aller dans l'onglet "Synchronisation"
2. Lancer une synchronisation des commandes
3. Les images seront automatiquement téléchargées depuis WooCommerce

### 5. Vérifier la Configuration
Vérifier les variables d'environnement dans `backend/.env` :

```env
MONGODB_URI=mongodb://localhost:27017/maisoncleo
WOOCOMMERCE_URL=https://votre-site.com
WOOCOMMERCE_CONSUMER_KEY=votre_clé
WOOCOMMERCE_CONSUMER_SECRET=votre_secret
```

### 6. Nettoyer le Cache
Si le problème persiste, nettoyer le cache local :

```javascript
// Dans la console du navigateur
imageService.clearCache()
imageService.cleanLocalDB()
```

### 7. Vérifier les Logs
Consulter les logs du backend pour identifier les erreurs :

```bash
# Dans le terminal du backend
# Les erreurs s'affichent en temps réel
```

## 📋 Checklist de Vérification

- [ ] Backend démarré sur le port 3001
- [ ] MongoDB accessible et connecté
- [ ] Collection `product_images` contient des données
- [ ] Variables d'environnement WooCommerce configurées
- [ ] Synchronisation des commandes effectuée
- [ ] Cache local nettoyé si nécessaire

## 🆘 Si Rien ne Fonctionne

1. **Redémarrer complètement** :
   ```bash
   # Arrêter tous les processus
   # Redémarrer le backend
   # Redémarrer le frontend
   ```

2. **Vérifier les ports** :
   - Port 3001 : Backend
   - Port 5173 : Frontend (dev)
   - Port 27017 : MongoDB

3. **Vérifier les pare-feu** et les permissions réseau

4. **Consulter les logs d'erreur** dans la console du navigateur

## 📞 Support

Si le problème persiste après avoir suivi ce guide :
1. Exécuter le diagnostic automatique
2. Noter les messages d'erreur exacts
3. Vérifier la version de Node.js et npm
4. Vérifier la connectivité réseau

---

**Note :** Les images sont générées automatiquement en base64 si elles ne peuvent pas être récupérées depuis WooCommerce, garantissant que l'interface reste fonctionnelle même en cas de problème de connexion.
