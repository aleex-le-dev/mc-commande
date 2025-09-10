import React, { useMemo } from 'react'
import { FixedSizeGrid as Grid } from 'react-window'
import ArticleCard from './ArticleCard'

// Composant pour la grille d'articles avec flexbox et virtualisation
const OrderGrid = ({ 
  filteredArticles, 
  getArticleSize, 
  getArticleColor, 
  getArticleOptions, 
  handleOverlayOpen, 
  openOverlayCardId, 
  searchTerm 
}) => {
  // Calculer le nombre de colonnes basé sur la largeur de l'écran
  const getColumnCount = () => {
    const screenWidth = window.innerWidth
    if (screenWidth >= 1600) return 5      // Très grand écran
    if (screenWidth >= 1200) return 4      // Grand écran
    if (screenWidth >= 900) return 3       // Écran moyen
    if (screenWidth >= 600) return 2       // Petit écran
    return 1                                // Très petit écran
  }

  // Mémoriser la grille pour éviter les recréations
  const memoizedGrid = useMemo(() => {
    if (filteredArticles.length === 0) return null
    
    const columnCount = getColumnCount()
    // Utiliser 100% de la largeur disponible au lieu d'une largeur fixe
    const availableWidth = window.innerWidth - 32 // 32px pour les marges
    const columnWidth = Math.floor(availableWidth / columnCount)
    const rowHeight = 450
    
    // Calculer la hauteur totale nécessaire pour afficher tous les articles
    const totalRows = Math.ceil(filteredArticles.length / columnCount)
    const totalHeight = totalRows * rowHeight + 100 // Hauteur calculée + marge
    
    
    return (
      <Grid
        columnCount={columnCount}
        columnWidth={columnWidth}
        height={totalHeight}
        rowCount={totalRows}
        rowHeight={rowHeight}
        width={availableWidth}
        itemData={{
          articles: filteredArticles,
          getArticleSize,
          getArticleColor,
          getArticleOptions,
          handleOverlayOpen,
          openOverlayCardId,
          searchTerm,
          columnCount,
          columnWidth
        }}
      >
        {({ columnIndex, rowIndex, style, data }) => {
          const index = rowIndex * data.columnCount + columnIndex
          const article = data.articles[index]
          if (!article) return null
          
          const cardId = `${article.orderId}-${article.line_item_id}`
          const isHighlighted = data.searchTerm && (
            `${article.orderNumber}`.toLowerCase().includes(data.searchTerm.toLowerCase()) ||
            (article.customer || '').toLowerCase().includes(data.searchTerm.toLowerCase()) ||
            (article.product_name || '').toLowerCase().includes(data.searchTerm.toLowerCase())
          )
          
          // Log pour compter les articles rendus
          if (index === 0) console.log('🎯 Premier article rendu:', article.orderNumber)
          if (index === data.articles.length - 1) console.log('🏁 Dernier article rendu:', article.orderNumber, 'Index:', index)
          
          return (
            <div style={style} className="p-3">
              <ArticleCard 
                key={cardId}
                article={article}
                index={index}
                getArticleSize={data.getArticleSize}
                getArticleColor={data.getArticleColor}
                getArticleOptions={data.getArticleOptions}
                onOverlayOpen={() => data.handleOverlayOpen(cardId)}
                isOverlayOpen={data.openOverlayCardId === cardId}
                isHighlighted={isHighlighted}
                searchTerm={data.searchTerm}
              />
            </div>
          )
        }}
      </Grid>
    )
  }, [filteredArticles, getArticleSize, getArticleColor, getArticleOptions, handleOverlayOpen, openOverlayCardId, searchTerm])

  if (filteredArticles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Aucun article trouvé avec les filtres sélectionnés</p>
        <p className="text-sm text-gray-400 mt-2">
          Total d'articles en base: {filteredArticles.length} | Type sélectionné: {filteredArticles.length > 0 ? 'tous' : 'aucun'}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Actualisez la page pour synchroniser les nouvelles commandes
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Grille virtualisée avec flexbox-like layout */}
      <div className="relative">
        {memoizedGrid}
      </div>
    </div>
  )
}

export default OrderGrid
