import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import OrderHeader from './cartes/OrderHeader'
import LoadingSpinner from './LoadingSpinner'
import { useArticles } from '../hooks/useArticles'
import InfiniteScrollGrid from './cartes/InfiniteScrollGrid'

/**
 * Page générique pour Maille/Couture
 */
const ProductionPage = ({ productionType, title }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showUrgentOnly, setShowUrgentOnly] = useState(false)
  // La pagination est remplacée par un scroll infini; ces états ne sont plus nécessaires
  
  // Utiliser le hook unifié pour les articles
  const { 
    articles,
    filteredArticles,
    stats,
    isLoading,
    error
  } = useArticles({
    // On récupère tous les articles filtrés et on laisse le grid gérer l'affichage progressif
    status: selectedStatus,
    search: searchTerm,
    sortBy: 'order_date',
    sortOrder: 'asc',
    productionType,
    showUrgentOnly
  })
  // Ref vers le grid pour exposer des actions (ex: aller en bas)
  const gridRef = useRef(null)


  
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
    return <LoadingSpinner />
  }
  if (error) return <div className="max-w-6xl mx-auto"><div className="bg-white rounded-2xl shadow-sm border p-6 text-center text-red-600">Erreur de chargement: {error.message}</div></div>
  return (
    <div className="w-full px-4">
      <div className="mb-6">
        <OrderHeader
          selectedType={productionType}
          filteredArticlesCount={stats.total}
          searchTerm={searchTerm}
          onSearchChange={(val) => { setSearchTerm(val) }}
          onGoToEnd={() => {
            try {
              // Utiliser l'API du grid pour charger tout puis scroller en bas
              if (gridRef.current && typeof gridRef.current.goToEnd === 'function') {
                gridRef.current.goToEnd()
              } else {
                const container = document.scrollingElement || document.documentElement
                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
              }
            } catch {}
          }}
        />
        
        {/* Bandeau "Filtre actif" supprimé */}
        
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          
          <button
            onClick={() => { setSelectedStatus('all'); setShowUrgentOnly(false); setOpenOverlayCardId(null) }}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
              selectedStatus === 'all' 
                ? 'bg-blue-100 border-blue-300 text-blue-800' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            📋 Total: <strong>{stats.total}</strong>
          </button>

          <button
            onClick={() => { setShowUrgentOnly(true); setSelectedStatus('all') }}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
              showUrgentOnly 
                ? 'bg-red-100 border-red-300 text-red-800' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            🚨 Urgentes: <strong>{stats.urgent}</strong>
          </button>
          
          <button
            onClick={() => { setSelectedStatus('a_faire'); setShowUrgentOnly(false) }}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
              selectedStatus === 'a_faire' 
                ? 'bg-gray-100 border-gray-300 text-gray-800' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            🆕 À faire: <strong>{stats.a_faire}</strong>
          </button>
          
          <button
            onClick={() => { setSelectedStatus('en_cours'); setShowUrgentOnly(false) }}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
              selectedStatus === 'en_cours' 
                ? 'bg-blue-100 border-blue-400 text-blue-800' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            🔄 En cours: <strong>{stats.en_cours}</strong>
          </button>
          
          <button
            onClick={() => { setSelectedStatus('en_pause'); setShowUrgentOnly(false) }}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
              selectedStatus === 'en_pause' 
                ? 'bg-yellow-100 border-yellow-400 text-yellow-800' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            ⏸️ En pause: <strong>{stats.en_pause}</strong>
          </button>
          
          <button
            onClick={() => { setSelectedStatus('termine'); setShowUrgentOnly(false) }}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
              selectedStatus === 'termine' 
                ? 'bg-green-100 border-green-400 text-green-800' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            ✅ Terminé: <strong>{stats.termine}</strong>
          </button>
        </div>
      </div>

      <InfiniteScrollGrid
        ref={gridRef}
        allArticles={filteredArticles}
        getArticleSize={getArticleSize}
        getArticleColor={getArticleColor}
        getArticleOptions={getArticleOptions}
        handleOverlayOpen={handleOverlayOpen}
        openOverlayCardId={openOverlayCardId}
        searchTerm={searchTerm}
        productionType={productionType}
      />
      
      {/* La pagination est supprimée au profit d'un scroll infini avec lots de 15 */}
      
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
