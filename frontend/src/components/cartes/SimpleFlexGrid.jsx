import React, { useMemo, useCallback } from 'react'
import ArticleCard from './ArticleCard'

// Composant simple avec flexbox et flex-wrap pour les cartes
const SimpleFlexGrid = ({ 
  filteredArticles, 
  getArticleSize, 
  getArticleColor, 
  getArticleOptions, 
  handleOverlayOpen, 
  openOverlayCardId, 
  searchTerm,
  productionType = 'unknown' // Ajouter le type de production
}) => {
  // Mémoriser les cartes pour éviter les re-renders
  const memoizedCards = useMemo(() => {
    return filteredArticles.map((article, index) => {
      const cardId = `${article.orderId}-${article.line_item_id}`
      const isHighlighted = searchTerm && (
        `${article.orderNumber}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (article.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (article.product_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      
      return (
        <div 
          key={`${productionType}-${cardId}`} // Clé unique incluant le type de production
          className="flex-shrink-0 w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)] 2xl:w-[calc(20%-19.2px)]"
        >
          <ArticleCard 
            article={article}
            index={index}
            getArticleSize={getArticleSize}
            getArticleColor={getArticleColor}
            getArticleOptions={getArticleOptions}
            onOverlayOpen={() => handleOverlayOpen(cardId)}
            isOverlayOpen={openOverlayCardId === cardId}
            isHighlighted={isHighlighted}
            searchTerm={searchTerm}
            productionType={productionType} // Passer le type de production
          />
        </div>
      )
    })
  }, [
    filteredArticles, 
    getArticleSize, 
    getArticleColor, 
    getArticleOptions, 
    handleOverlayOpen, 
    openOverlayCardId, 
    searchTerm,
    productionType // Ajouter aux dépendances
  ])

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
      <div className="flex flex-wrap gap-6 justify-start items-start w-full">
        {memoizedCards}
      </div>
    </div>
  )
}

export default SimpleFlexGrid
