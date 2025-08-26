# Composants Cartes - Refactorisation OrderList

## Structure

```
cartes/
├── index.js                    # Export centralisé de tous les composants
├── ArticleCard.jsx            # Composant principal de carte d'article
├── ProductImage.jsx           # Composant d'affichage d'image de produit
├── NoteExpander.jsx           # Composant d'expansion des notes
├── SyncProgress.jsx           # Composant de progression de synchronisation
├── OrderHeader.jsx            # Composant d'en-tête avec titre et recherche
├── OrderGrid.jsx              # Composant de grille avec virtualisation
├── CardStyles.jsx             # Composant d'injection des styles CSS
└── hooks/                     # Hooks personnalisés
    ├── useOrderData.js        # Gestion des données des commandes
    ├── useSyncProgress.js     # Gestion de la synchronisation
    └── useOrderFilters.js     # Gestion du filtrage
```

## Composants

### ArticleCard.jsx
- Composant principal de carte d'article optimisé avec React.memo
- Gestion des images avec fallback
- Overlay d'informations client
- Animations et effets visuels

### ProductImage.jsx
- Affichage des images de produits
- Gestion des erreurs et états de chargement
- Fallback vers icône placeholder

### NoteExpander.jsx
- Expansion/collapse des notes client
- Animations fluides
- Interface utilisateur intuitive

### SyncProgress.jsx
- Affichage de la progression de synchronisation
- Logs en temps réel
- Indicateurs visuels

### OrderHeader.jsx
- Titre dynamique selon le type de production
- Barre de recherche
- Compteur d'articles

### OrderGrid.jsx
- Grille virtualisée avec react-window
- Optimisation des performances
- Gestion de l'état des overlays

### CardStyles.jsx
- Injection des styles CSS personnalisés
- Variables CSS réutilisables
- Animations et keyframes

## Hooks

### useOrderData.js
- Gestion des requêtes avec React Query
- Préparation des données des articles
- Fonctions utilitaires pour les métadonnées

### useSyncProgress.js
- Gestion de la synchronisation automatique
- Progression étape par étape
- Logs en temps réel

### useOrderFilters.js
- Filtrage des articles par type et recherche
- Gestion des overlays
- État local optimisé

## Avantages de la refactorisation

1. **Performance** : Composants mémorisés et virtualisation
2. **Maintenabilité** : Code modulaire et réutilisable
3. **Lisibilité** : Séparation claire des responsabilités
4. **Testabilité** : Composants isolés et testables individuellement
5. **Réutilisabilité** : Composants réutilisables dans d'autres parties de l'application

## Utilisation

```jsx
import { 
  ArticleCard, 
  OrderGrid, 
  useOrderData 
} from './cartes'

// Utilisation des composants et hooks
const MyComponent = () => {
  const { prepareArticles } = useOrderData()
  // ...
}
```
