import React, { useState, useMemo } from 'react'
import OrderHeader from './cartes/OrderHeader'
import { useUnifiedArticles } from './cartes/hooks/useUnifiedArticles'
import { useOrderFilters } from './cartes/hooks/useOrderFilters'
import SimpleFlexGrid from './cartes/SimpleFlexGrid'

/**
 * Page générique pour Maille/Couture
 */
const ProductionPage = ({ productionType, title }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const { articles, isLoading, error } = useUnifiedArticles(productionType)
  const { filteredArticles, openOverlayCardId, handleOverlayOpen, handleClickOutside } = useOrderFilters(productionType, articles)

  // Fonctions pour les cartes
  const getArticleSize = (article) => {
    const name = article.product_name?.toLowerCase() || ''
    return name.includes('sweat') || name.includes('hoodie') || name.includes('cardigan') ? 'large' : 'medium'
  }

  const getArticleColor = (article) => {
    const colors = {
      'termine': 'border-green-500 bg-green-50',
      'en_cours': 'border-blue-500 bg-blue-50',
      'en_pause': 'border-yellow-500 bg-yellow-50',
      'a_faire': 'border-gray-300 bg-white'
    }
    return colors[article.status] || colors['a_faire']
  }

  const getArticleOptions = () => ({
    showAssignButton: true,
    showStatusButton: true,
    showNoteButton: true,
    showClientButton: true
  })

  // Compteurs de statuts
  const statusCounts = useMemo(() => {
    const counts = { a_faire: 0, en_cours: 0, en_pause: 0, termine: 0 }
    filteredArticles.forEach(article => counts[article.status] = (counts[article.status] || 0) + 1)
    return counts
  }, [filteredArticles])

  if (isLoading) return <div className="max-w-6xl mx-auto"><div className="bg-white rounded-2xl shadow-sm border p-6 text-center">Chargement...</div></div>
  if (error) return <div className="max-w-6xl mx-auto"><div className="bg-white rounded-2xl shadow-sm border p-6 text-center text-red-600">Erreur de chargement</div></div>

  return (
    <div className="w-full px-4">
      <div className="mb-6">
        <OrderHeader
          selectedType={productionType}
          filteredArticlesCount={filteredArticles.length}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
        
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white">📋 Total: <strong>{filteredArticles.length}</strong></span>
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white">⏳ À faire: <strong>{statusCounts.a_faire}</strong></span>
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white">🔄 En cours: <strong>{statusCounts.en_cours}</strong></span>
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white">⏸️ En pause: <strong>{statusCounts.en_pause}</strong></span>
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white">✅ Terminé: <strong>{statusCounts.termine}</strong></span>
        </div>
      </div>

      <SimpleFlexGrid
        filteredArticles={filteredArticles}
        getArticleSize={getArticleSize}
        getArticleColor={getArticleColor}
        getArticleOptions={getArticleOptions}
        handleOverlayOpen={handleOverlayOpen}
        openOverlayCardId={openOverlayCardId}
        searchTerm={searchTerm}
        productionType={productionType}
      />
    </div>
  )
}

export default ProductionPage
