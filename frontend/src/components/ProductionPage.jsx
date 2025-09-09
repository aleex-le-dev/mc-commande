import React, { useState, useMemo, useEffect, useCallback } from 'react'
import OrderHeader from './cartes/OrderHeader'
import SimpleFlexGrid from './cartes/SimpleFlexGrid'
import LoadingSpinner from './LoadingSpinner'
import { useArticles } from '../hooks/useArticles'

/**
 * Page générique pour Maille/Couture
 */
const ProductionPage = ({ productionType, title }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showUrgentOnly, setShowUrgentOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  
  // Utiliser le hook unifié pour les articles
  const { 
    articles,
    filteredArticles,
    stats,
    pagination,
    isLoading,
    error
  } = useArticles({
    page: currentPage,
    limit: 15,
    status: selectedStatus,
    search: searchTerm,
    sortBy: 'order_date',
    sortOrder: 'desc',
    productionType,
    showUrgentOnly
  })

  // logs retirés
  
  // Gérer l'ouverture des overlays
  const [openOverlayCardId, setOpenOverlayCardId] = useState(null)
  const handleOverlayOpen = (cardId) => {
    setOpenOverlayCardId(prevId => prevId === cardId ? null : cardId)
  }
  const handleClickOutside = () => {
    setOpenOverlayCardId(null)
  }

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

  // Les statistiques sont maintenant fournies par le hook useArticles
  const statusCounts = {
    a_faire: stats.a_faire,
    en_cours: stats.en_cours,
    en_pause: stats.en_pause,
    termine: stats.termine
  }
  const urgentCount = stats.urgent

  if (isLoading) {
    console.log('⏳ Affichage du spinner...')
    return <LoadingSpinner />
  }
  if (error) return <div className="max-w-6xl mx-auto"><div className="bg-white rounded-2xl shadow-sm border p-6 text-center text-red-600">Erreur de chargement: {error.message}</div></div>

  return (
    <div className="w-full px-4">
      <div className="mb-6">
        <OrderHeader
          selectedType={productionType}
          filteredArticlesCount={filteredArticles.length}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onGoToEnd={() => {
            try {
              const container = document.scrollingElement || document.documentElement
              container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
            } catch {}
          }}
        />
        
        {/* Bandeau "Filtre actif" supprimé */}
        
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          
          <button
            onClick={() => { setSelectedStatus('all'); setShowUrgentOnly(false); setSearchTerm(''); setOpenOverlayCardId(null) }}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
              selectedStatus === 'all' 
                ? 'bg-blue-100 border-blue-300 text-blue-800' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            📋 Total: <strong>{articles.length}</strong>
          </button>

          <button
            onClick={() => { setShowUrgentOnly(true); setSelectedStatus('all') }}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
              showUrgentOnly 
                ? 'bg-red-100 border-red-300 text-red-800' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            🚨 Urgentes: <strong>{urgentCount}</strong>
          </button>
          
          <button
            onClick={() => { setSelectedStatus('a_faire'); setShowUrgentOnly(false) }}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
              selectedStatus === 'a_faire' 
                ? 'bg-gray-100 border-gray-300 text-gray-800' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            🆕 À faire: <strong>{statusCounts.a_faire}</strong>
          </button>
          
          <button
            onClick={() => { setSelectedStatus('en_cours'); setShowUrgentOnly(false) }}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
              selectedStatus === 'en_cours' 
                ? 'bg-blue-100 border-blue-400 text-blue-800' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            🔄 En cours: <strong>{statusCounts.en_cours}</strong>
          </button>
          
          <button
            onClick={() => { setSelectedStatus('en_pause'); setShowUrgentOnly(false) }}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
              selectedStatus === 'en_pause' 
                ? 'bg-yellow-100 border-yellow-400 text-yellow-800' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            ⏸️ En pause: <strong>{statusCounts.en_pause}</strong>
          </button>
          
          <button
            onClick={() => { setSelectedStatus('termine'); setShowUrgentOnly(false) }}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
              selectedStatus === 'termine' 
                ? 'bg-green-100 border-green-400 text-green-800' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            ✅ Terminé: <strong>{statusCounts.termine}</strong>
          </button>
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
        prioritizeUrgent={true}
      />
      
      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={!pagination.hasPrev}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
          >
            ← Précédent
          </button>
          
          <span className="text-sm text-gray-600">
            Page {pagination.page} sur {pagination.totalPages} 
            ({pagination.total} articles au total)
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
            disabled={!pagination.hasNext}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
          >
            Suivant →
          </button>
        </div>
      )}
      
      {/* Toast synchro quotidienne */}
      {typeof window !== 'undefined' && window.__dailySyncToast && (
        <div className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          {window.__dailySyncToast}
        </div>
      )}
    </div>
  )
}

export default ProductionPage
