import React, { useMemo, useState, useEffect } from 'react'
import ArticleCard from './ArticleCard'

// Composant pour la grille d'articles avec flexbox et virtualisation hybride
const FlexOrderGrid = ({ 
  filteredArticles, 
  getArticleSize, 
  getArticleColor, 
  getArticleOptions, 
  handleOverlayOpen, 
  openOverlayCardId, 
  searchTerm 
}) => {
  const [containerRef, setContainerRef] = useState(null)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 })

  // Calculer le nombre de colonnes basé sur la largeur de l'écran
  const getColumnCount = () => {
    if (!containerRef) return 4
    const containerWidth = containerRef.offsetWidth
    if (containerWidth >= 1600) return 5      // Très grand écran
    if (containerWidth >= 1200) return 4      // Grand écran
    if (containerWidth >= 900) return 3       // Écran moyen
    if (containerWidth >= 600) return 2       // Petit écran
    return 1                                  // Très petit écran
  }

  // Calculer la hauteur totale nécessaire
  const getTotalHeight = () => {
    if (!containerRef) return 800
    const columnCount = getColumnCount()
    const rows = Math.ceil(filteredArticles.length / columnCount)
    return rows * 450 + 100 // 450px par ligne + marge
  }

  // Gérer le scroll pour la virtualisation
  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop
    const containerHeight = e.target.clientHeight
    const itemHeight = 450
    const columnCount = getColumnCount()
    
    const startIndex = Math.floor(scrollTop / itemHeight) * columnCount
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) * columnCount + columnCount * 2,
      filteredArticles.length
    )
    
    setVisibleRange({ start: Math.max(0, startIndex), end: endIndex })
  }

  // Mémoriser les articles visibles
  const visibleArticles = useMemo(() => {
    return filteredArticles.slice(visibleRange.start, visibleRange.end)
  }, [filteredArticles, visibleRange])

  // Mémoriser la grille flexbox
  const memoizedGrid = useMemo(() => {
    if (filteredArticles.length === 0) return null
    
    const columnCount = getColumnCount()
    const totalHeight = getTotalHeight()
    
    return (
      <div 
        className="w-full"
        style={{ height: totalHeight }}
        onScroll={handleScroll}
      >
        {/* Espacement en haut pour la virtualisation */}
        <div style={{ height: (visibleRange.start / columnCount) * 450 }} />
        
        {/* Articles visibles avec flexbox */}
        <div 
          className="flex flex-wrap gap-6 justify-start items-start px-6"
          style={{ 
            width: '100%',
            minHeight: Math.ceil(visibleArticles.length / columnCount) * 450
          }}
        >
          {visibleArticles.map((article, index) => {
            const actualIndex = visibleRange.start + index
            const cardId = `${article.orderId}-${article.line_item_id}`
            const isHighlighted = searchTerm && (
              `${article.orderNumber}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (article.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (article.product_name || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
            
            return (
              <div 
                key={cardId} 
                className="flex-shrink-0"
                style={{ 
                  width: `calc((100% - ${(columnCount - 1) * 24}px) / ${columnCount})`,
                  maxWidth: `calc((100% - ${(columnCount - 1) * 24}px) / ${columnCount})`
                }}
              >
                <ArticleCard 
                  article={article}
                  index={actualIndex}
                  getArticleSize={getArticleSize}
                  getArticleColor={getArticleColor}
                  getArticleOptions={getArticleOptions}
                  onOverlayOpen={() => handleOverlayOpen(cardId)}
                  isOverlayOpen={openOverlayCardId === cardId}
                  isHighlighted={isHighlighted}
                  searchTerm={searchTerm}
                />
              </div>
            )
          })}
        </div>
        
        {/* Espacement en bas pour la virtualisation */}
        <div style={{ height: Math.max(0, (filteredArticles.length - visibleRange.end) / columnCount) * 450 }} />
      </div>
    )
  }, [
    filteredArticles, 
    visibleRange, 
    getArticleSize, 
    getArticleColor, 
    getArticleOptions, 
    handleOverlayOpen, 
    openOverlayCardId, 
    searchTerm
  ])

  // Mettre à jour la plage visible quand les articles changent
  useEffect(() => {
    setVisibleRange({ start: 0, end: Math.min(20, filteredArticles.length) })
  }, [filteredArticles.length])

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
    <div className="w-full h-[800px] overflow-auto" ref={setContainerRef}>
      {memoizedGrid}
    </div>
  )
}

export default FlexOrderGrid
