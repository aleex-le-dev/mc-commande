# Maisoncléo - Gestion des Commandes WordPress

Application React pour récupérer et gérer les commandes de votre site WordPress WooCommerce.

## 🚀 Fonctionnalités

- **Récupération des commandes** : Connexion à l'API WordPress WooCommerce
- **Filtrage avancé** : Par statut, date, recherche textuelle
- **Export CSV** : Export des données de commandes
- **Interface moderne** : Design responsive avec Tailwind CSS
- **Configuration sécurisée** : Variables d'environnement ou stockage local des clés d'API
- **Actualisation automatique** : Rafraîchissement des données toutes les 30 secondes

## 📋 Prérequis

- Node.js 18+ et npm
- Site WordPress avec WooCommerce activé
- Clés d'API WooCommerce (clé consommateur et secret)

## 🛠️ Installation

1. **Cloner le projet**
   ```bash
   git clone [url-du-repo]
   cd maisoncleo
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configuration des variables d'environnement (recommandé)**
   
   Créez un fichier `.env` à la racine du projet :
   ```bash
   # Configuration WordPress WooCommerce
   VITE_WORDPRESS_URL=https://votre-site.com
   VITE_WORDPRESS_CONSUMER_KEY=ck_votre_cle_consommateur
   VITE_WORDPRESS_CONSUMER_SECRET=cs_votre_secret_consommateur
   VITE_WORDPRESS_API_VERSION=wc/v3
   ```

   **⚠️ Important** : Le fichier `.env` est déjà dans `.gitignore` pour éviter de commiter vos secrets.

4. **Lancer en mode développement**
   ```bash
   npm run dev
   ```

5. **Ouvrir dans le navigateur**
   ```
   http://localhost:5173
   ```

## ⚙️ Configuration WordPress

### Méthode 1 : Variables d'environnement (recommandée)

1. **Générer vos clés d'API WooCommerce** :
   - Connectez-vous à votre WordPress
   - Allez dans **WooCommerce > Paramètres > Avancé > API REST**
   - Cliquez sur **"Ajouter une clé"**
   - Donnez un nom à votre clé (ex: "Maisoncléo App")
   - Sélectionnez les permissions **"Lecture/Écriture"**
   - Cliquez sur **"Générer une clé"**
   - Copiez la **clé consommateur** et le **secret consommateur**

2. **Configurer le fichier .env** :
   ```bash
   VITE_WORDPRESS_URL=https://monsite.com
   VITE_WORDPRESS_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   VITE_WORDPRESS_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   VITE_WORDPRESS_API_VERSION=wc/v3
   ```

3. **Redémarrer l'application** après modification du `.env`

### Méthode 2 : Interface de configuration

Si vous n'utilisez pas de variables d'environnement, vous pouvez configurer via l'interface :

1. Ouvrez l'onglet **"Configuration"** dans l'application
2. Remplissez les champs avec vos informations WordPress
3. Cliquez sur **"Sauvegarder"**
4. Testez la connexion avec **"Tester la connexion"**

## 🔧 Scripts disponibles

- `npm run dev` - Lance le serveur de développement
- `npm run build` - Construit l'application pour la production
- `npm run preview` - Prévisualise la version de production
- `npm run lint` - Vérifie le code avec ESLint

## 📱 Utilisation

### Onglet Commandes
- **Filtres** : Filtrez par statut, date ou recherche textuelle
- **Actualiser** : Rafraîchit manuellement les données
- **Export CSV** : Télécharge les commandes au format CSV
- **Vue détaillée** : Cliquez sur l'icône œil pour voir les détails

### Onglet Configuration
- **Paramètres WordPress** : Configurez la connexion à votre site
- **Test de connexion** : Vérifiez que l'API est accessible
- **Sauvegarde** : Les paramètres sont sauvegardés localement (si pas de .env)

## 🏗️ Architecture

```
src/
├── components/
│   ├── OrderList.jsx      # Liste des commandes avec filtres
│   └── OrderForm.jsx      # Configuration WordPress
├── services/
│   └── wordpressApi.js    # Service API WooCommerce
├── App.jsx                # Composant principal
└── App.css               # Styles personnalisés
```

## 🔒 Sécurité

- **Variables d'environnement** : Stockage sécurisé des clés d'API (recommandé)
- **localStorage** : Stockage local en fallback (moins sécurisé)
- Aucune donnée n'est envoyée à des serveurs tiers
- Connexion sécurisée via HTTPS (recommandé)

## 🚨 Dépannage

### Erreur "Configuration WordPress manquante"
- Vérifiez que vous avez configuré le fichier `.env` ou l'onglet Configuration
- Assurez-vous que tous les champs sont remplis

### Erreur "Clés d'API invalides"
- Vérifiez que vos clés sont correctes
- Assurez-vous que WooCommerce est activé sur votre site
- Vérifiez que l'API REST est accessible

### Erreur "API WooCommerce non trouvée"
- Vérifiez que WooCommerce est installé et activé
- Assurez-vous que l'URL WordPress est correcte
- Vérifiez que l'API REST n'est pas bloquée par un plugin

### Variables d'environnement non prises en compte
- Redémarrez l'application après modification du `.env`
- Vérifiez que les noms des variables commencent par `VITE_`
- Assurez-vous que le fichier `.env` est à la racine du projet

## 📈 Évolutions futures

- [ ] Gestion des produits et stocks
- [ ] Tableau de bord avec statistiques
- [ ] Notifications en temps réel
- [ ] Gestion des clients
- [ ] Intégration avec d'autres plateformes e-commerce

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer des améliorations
- Soumettre des pull requests

## 📄 Licence

Ce projet est sous licence MIT.
