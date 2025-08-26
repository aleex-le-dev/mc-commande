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
├── OrderGrid.jsx              # Composant de grille avec virtualisation react-window
├── FlexOrderGrid.jsx          # Composant de grille flexbox avec virtualisation manuelle
├── SimpleFlexGrid.jsx         # Composant de grille flexbox simple et performant ⭐
├── CardStyles.jsx             # Composant d'injection des styles CSS
├── GRID_OPTIONS.md            # Documentation des options de grille
├── README.md                  # Ce fichier
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
- Optimisation des performances pour grandes listes
- Gestion de l'état des overlays

### FlexOrderGrid.jsx
- Grille flexbox avec virtualisation manuelle
- Layout flexible et responsive
- Contrôle précis de la plage visible

### SimpleFlexGrid.jsx ⭐ (Recommandé)
- Grille flexbox simple avec flex-wrap
- Responsive natif (1 à 4 colonnes selon l'écran)
- Excellentes performances avec React.memo
- Code simple et maintenable
- **Cartes larges** qui prennent toute la largeur de la page

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

## Options de Grille

Trois composants de grille sont disponibles :

1. **SimpleFlexGrid** ⭐ - Recommandé pour la plupart des cas
   - Flexbox avec flex-wrap
   - Responsive natif (1-4 colonnes)
   - Excellentes performances
   - Code simple et maintenable
   - **Cartes larges** qui utilisent toute la largeur disponible

2. **OrderGrid** - Pour de très grandes listes
   - Virtualisation native avec react-window
   - Performance optimale pour 1000+ articles
   - Layout plus rigide

3. **FlexOrderGrid** - Solution hybride avancée
   - Flexbox + virtualisation manuelle
   - Contrôle précis mais plus complexe

Voir `GRID_OPTIONS.md` pour une comparaison détaillée.

## Avantages de la refactorisation

1. **Performance** : Composants mémorisés et optimisations multiples
2. **Maintenabilité** : Code modulaire et réutilisable
3. **Lisibilité** : Séparation claire des responsabilités
4. **Testabilité** : Composants isolés et testables individuellement
5. **Réutilisabilité** : Composants réutilisables dans d'autres parties de l'application
6. **Flexibilité** : Choix entre différentes stratégies de grille selon les besoins
7. **Largeur optimale** : Les cartes s'adaptent parfaitement à la largeur de la page

## Utilisation

```jsx
import { 
  ArticleCard, 
  SimpleFlexGrid,  // Recommandé
  useOrderData 
} from './cartes'

// Utilisation des composants et hooks
const MyComponent = () => {
  const { prepareArticles } = useOrderData()
  
  return (
    <SimpleFlexGrid 
      filteredArticles={articles}
      // ... autres props
    />
  )
}
```

## Migration

Pour passer de l'ancien OrderGrid au nouveau SimpleFlexGrid :

```jsx
// Avant
import { OrderGrid } from './cartes'
<OrderGrid ... />

// Après  
import { SimpleFlexGrid } from './cartes'
<SimpleFlexGrid ... />
```

Aucune modification des props n'est nécessaire.

## Responsive Breakpoints

Le `SimpleFlexGrid` s'adapte automatiquement à toutes les tailles d'écran :

- **Tous écrans < 1024px** : 2 colonnes - Cartes moyennes (toujours 2 colonnes)
- **Large (1024px+)** : 3 colonnes - Cartes larges
- **XL (1280px+)** : 4 colonnes - Cartes très larges
- **2XL (1536px+)** : 5 colonnes - Cartes ultra larges

Les cartes utilisent maintenant **100% de la largeur disponible** sans aucune contrainte de largeur maximale, éliminant complètement les espaces blancs à gauche et à droite. **En dessous de 1024px, les cartes sont toujours affichées en 2 colonnes** pour une lisibilité optimale sur tous les écrans.
