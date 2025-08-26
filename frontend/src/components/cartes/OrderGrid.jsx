import React, { useMemo } from 'react'
import { FixedSizeGrid as Grid } from 'react-window'
import ArticleCard from './ArticleCard'

// Composant pour la grille d'articles avec virtualisation
const OrderGrid = ({ 
  filteredArticles, 
  getArticleSize, 
  getArticleColor, 
  getArticleOptions, 
  handleOverlayOpen, 
  openOverlayCardId, 
  searchTerm 
}) => {
  // Mémoriser la grille pour éviter les recréations
  const memoizedGrid = useMemo(() => {
    if (filteredArticles.length === 0) return null
    
    return (
      <Grid
        columnCount={Math.min(4, Math.ceil(window.innerWidth / 400))}
        columnWidth={400}
        height={800}
        rowCount={Math.ceil(filteredArticles.length / Math.min(4, Math.ceil(window.innerWidth / 400)))}
        rowHeight={450}
        width={window.innerWidth}
        itemData={{
          articles: filteredArticles,
          getArticleSize,
          getArticleColor,
          getArticleOptions,
          handleOverlayOpen,
          openOverlayCardId,
          searchTerm
        }}
      >
        {({ columnIndex, rowIndex, style, data }) => {
          const columnCount = Math.min(4, Math.ceil(window.innerWidth / 400))
          const index = rowIndex * columnCount + columnIndex
          const article = data.articles[index]
          if (!article) return null
          
          const cardId = `${article.orderId}-${article.line_item_id}`
          const isHighlighted = data.searchTerm && (
            `${article.orderNumber}`.toLowerCase().includes(data.searchTerm.toLowerCase()) ||
            (article.customer || '').toLowerCase().includes(data.searchTerm.toLowerCase()) ||
            (article.product_name || '').toLowerCase().includes(data.searchTerm.toLowerCase())
          )
          
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
    <div className="h-[800px] w-full">
      {memoizedGrid}
    </div>
  )
}

export default OrderGrid
