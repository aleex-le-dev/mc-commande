import React, { useState, useMemo, useEffect, useCallback } from 'react'
import OrderHeader from './cartes/OrderHeader'
import SimpleFlexGrid from './cartes/SimpleFlexGrid'
import LoadingSpinner from './LoadingSpinner'
import { useOrders } from '../hooks/useOrders'
import { useAssignments } from '../hooks/useAssignments'
import { useTricoteuses } from '../hooks/useTricoteuses'

/**
 * Page générique pour Maille/Couture
 */
const ProductionPage = ({ productionType, title }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showUrgentOnly, setShowUrgentOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  
  // Utiliser les nouveaux hooks
  const { 
    orders, 
    pagination, 
    loading: ordersLoading, 
    error: ordersError,
    refetch: refetchOrders 
  } = useOrders({
    page: currentPage,
    limit: 15,
    status: selectedStatus,
    search: searchTerm,
    sortBy: 'order_date',
    sortOrder: 'desc'
  })
  
  const { 
    assignments, 
    loading: assignmentsLoading,
    getAssignmentByArticleId,
    getActiveAssignments 
  } = useAssignments()
  
  const { 
    tricoteuses, 
    loading: tricoteusesLoading,
    getTricoteuseById 
  } = useTricoteuses()
  
  // Créer la carte des urgences
  const urgentMap = useMemo(() => {
    const map = {}
    assignments.forEach(a => {
      if (a && a.article_id && a.urgent) {
        map[String(a.article_id)] = true
      }
    })
    return map
  }, [assignments])

  // Convertir les commandes en articles pour l'affichage
  const articles = useMemo(() => {
    // Gérer les deux formats : nouveau (avec pagination) et ancien (tableau direct)
    const ordersArray = orders?.orders || orders
    
    if (!ordersArray || !Array.isArray(ordersArray)) {
      console.log('❌ Pas de commandes disponibles:', orders)
      return []
    }
    
    console.log('📋 Commandes reçues:', ordersArray.length, 'TIMESTAMP:', Date.now())
    
    // DEBUG FORCÉ: Structure complète des données
    console.log('🚨🚨🚨 DEBUG FORCÉ - Structure des ordres:', JSON.stringify(ordersArray[0], null, 2))
    
    const allArticles = []
    ordersArray.forEach(order => {
      // Debug complet de la structure
      console.log('🔍 Commande complète:', order)
      console.log('🔍 Clés de la commande:', Object.keys(order))
      console.log('🔍 order.items:', order.items)
      console.log('🔍 order.line_items:', order.line_items)
      
      // Le backend retourne 'items', pas 'line_items'
      const orderItems = order.items || order.line_items || []
      console.log('🔍 Commande:', order.order_number, 'Items:', orderItems.length)
      
      if (Array.isArray(orderItems)) {
        orderItems.forEach((item, index) => {
          console.log(`🚨 ITEM ${index}:`, JSON.stringify(item, null, 2))
          console.log('🔍 Item complet:', item)
          console.log('🔍 Item:', item?.product_name, 'Type:', item?.production_status?.production_type, 'Filtre:', productionType)
          
          // Filtrer par type de production
          if (productionType === 'maille' && item.production_status?.production_type !== 'maille') {
            console.log('❌ Item filtré (maille):', item.product_name)
            return
          }
          if (productionType === 'couture' && item.production_status?.production_type !== 'couture') {
            console.log('❌ Item filtré (couture):', item.product_name)
            return
          }
          
          // Utiliser line_item_id au lieu de article_id pour la correspondance
          const articleId = item.line_item_id || item.id
          const assignment = getAssignmentByArticleId(articleId)
          const tricoteuse = assignment ? getTricoteuseById(assignment.tricoteuse_id) : null
          
          allArticles.push({
            ...item,
            article_id: articleId, // S'assurer que article_id est défini
            orderNumber: order.order_number,
            customer: order.customer,
            orderDate: order.order_date,
            status: item.production_status?.status || 'a_faire',
            assignedTo: tricoteuse?.name || null,
            urgent: assignment?.urgent || false,
            assignmentId: assignment?._id || null
          })
        })
      }
    })
    
    console.log('📦 Articles générés:', allArticles.length, 'pour', productionType)
    return allArticles
  }, [orders, assignments, tricoteuses, productionType, getAssignmentByArticleId, getTricoteuseById])
  
  // Filtrage local par recherche et statut
  const filteredArticles = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    let filtered = articles
    
    // Filtrage urgent prioritaire
    if (showUrgentOnly) {
      filtered = filtered.filter(article => article.urgent === true)
    } else {
      // Filtrage par statut
      if (selectedStatus !== 'all') {
        filtered = filtered.filter(article => article.status === selectedStatus)
      }
    }
    
    // Filtrage par recherche
    if (term) {
      filtered = filtered.filter(article => 
        `${article.orderNumber}`.toLowerCase().includes(term) ||
        (article.customer || '').toLowerCase().includes(term) ||
        (article.product_name || '').toLowerCase().includes(term)
      )
    }
    
    return filtered
  }, [articles, searchTerm, selectedStatus, showUrgentOnly])

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

  const statusCounts = useMemo(() => {
    const counts = { a_faire: 0, en_cours: 0, en_pause: 0, termine: 0 }
    articles.forEach(a => {
      if (counts[a.status] !== undefined) counts[a.status] += 1
    })
    return counts
  }, [articles])

  const urgentCount = useMemo(() => {
    return articles.reduce((n, article) => n + (article.urgent ? 1 : 0), 0)
  }, [articles])

  const isLoading = ordersLoading || assignmentsLoading || tricoteusesLoading
  const error = ordersError

  // Logs de debug
  console.log('🔍 Debug ProductionPage:', {
    ordersLoading,
    assignmentsLoading,
    tricoteusesLoading,
    isLoading,
    error,
    orders: orders ? Object.keys(orders) : 'null',
    articles: articles.length,
    assignments: assignments.length,
    tricoteuses: tricoteuses.length
  })

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
