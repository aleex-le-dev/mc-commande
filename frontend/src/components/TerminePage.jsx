import React, { useEffect, useMemo, useState } from 'react'
import OrderHeader from './cartes/OrderHeader'
import ArticleCard from './cartes/ArticleCard'
// Pagination retirée pour la page Terminé
import { useArticles } from '../hooks/useArticles'
import delaiService from '../services/delaiService'
import SmartImageLoader from './SmartImageLoader'

/**
 * Page "Terminé" refactorisée avec séparation des responsabilités
 * - Utilise le hook useArticles pour la gestion des données
 * - Logique de transformation déplacée dans le service
 */
const TerminePageRefactored = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [focusedOrder, setFocusedOrder] = useState(null)
  const [openReadyOverlayId, setOpenReadyOverlayId] = useState(null)
  const [openPausedOverlayId, setOpenPausedOverlayId] = useState(null)
  const [openInProgressOverlayId, setOpenInProgressOverlayId] = useState(null)
  // Afficher tout: pas de pagination sur la page Terminé
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5000)

  // Utiliser le hook unifié pour les articles
  const { 
    groupedArticles,
    pagination,
    isLoading,
    error
  } = useArticles({
    page: currentPage,
    limit: itemsPerPage,
    status: 'all',
    search: searchTerm,
    sortBy: 'order_date',
    sortOrder: 'desc',
    productionType: 'all'
  })
  
  const [urgentByArticleId, setUrgentByArticleId] = useState({})
  const [delaiConfig, setDelaiConfig] = useState(null)
  const [holidays, setHolidays] = useState({})
  const [dateLimiteStr, setDateLimiteStr] = useState(null)

  // Charger la configuration des délais
  useEffect(() => {
    const loadDelaiConfig = async () => {
      try {
        const config = await delaiService.getDelai()
        setDelaiConfig(config)
        setDateLimiteStr(config?.dateLimite)
      } catch (error) {
        console.error('Erreur chargement config délais:', error)
      }
    }
    loadDelaiConfig()
  }, [])

  // Utiliser les articles groupés fournis par le hook useArticles
  const grouped = useMemo(() => {
    if (!groupedArticles || Object.keys(groupedArticles).length === 0) {
      return []
    }
    
    const enriched = Object.entries(groupedArticles).map(([orderNumber, { order, articles }]) => {
      // Calculer les statuts pour cette commande
      const statusCounts = { a_faire: 0, en_cours: 0, en_pause: 0, termine: 0 }
      let totalArticles = 0
      let urgentCount = 0
      
      articles.forEach(article => {
        const status = article.status || 'a_faire'
        if (statusCounts[status] !== undefined) {
          statusCounts[status]++
        }
        totalArticles++
        if (article.urgent === true) {
          urgentCount++
        }
      })
      
      // Déterminer le statut global de la commande
      let globalStatus = 'a_faire'
      let isReadyToShip = false
      if (statusCounts.termine === totalArticles) {
        globalStatus = 'ready'
        isReadyToShip = true
      } else if (statusCounts.en_cours > 0) {
        globalStatus = 'in_progress'
      } else if (statusCounts.en_pause > 0) {
        globalStatus = 'paused'
      }
      
      const hasUrgent = urgentCount > 0
      let isLate = false
      if (dateLimiteStr && order.order_date) {
        const orderDate = new Date(order.order_date)
        const dl = new Date(dateLimiteStr)
        const oN = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate())
        const dN = new Date(dl.getFullYear(), dl.getMonth(), dl.getDate())
        isLate = oN <= dN && !isReadyToShip
      }
      
      // Articles restants (non terminés)
      const remaining = articles.filter(article => article.status !== 'termine')
      
      return {
        orderNumber,
        order,
        articles,
        remaining,
        statusCounts,
        totalArticles,
        urgentCount,
        globalStatus,
        isReadyToShip,
        hasUrgent,
        isLate
      }
    })

    // Filtrer par recherche (numéro, client)
    const term = (searchTerm || '').toLowerCase().trim()
    let filtered = term ? enriched.filter(o =>
      `${o.orderNumber}`.toLowerCase().includes(term) ||
      (o.customer || '').toLowerCase().includes(term)
    ) : enriched

    if (focusedOrder) {
      if (focusedOrder === 'ready') {
        filtered = filtered.filter(o => o.isReadyToShip)
      } else if (focusedOrder === 'in_progress') {
        filtered = filtered.filter(o => o.globalStatus === 'in_progress')
      } else if (focusedOrder === 'paused') {
        filtered = filtered.filter(o => o.globalStatus === 'paused')
      } else if (focusedOrder === 'to_do') {
        filtered = filtered.filter(o => o.globalStatus === 'a_faire')
      }
    }

    // Ordonner: prêtes à expédier en premier, puis partiellement, par date croissante
    filtered.sort((a, b) => {
      if (a.isReadyToShip !== b.isReadyToShip) return a.isReadyToShip ? -1 : 1
      return new Date(a.orderDate) - new Date(b.orderDate)
    })

    return filtered
  }, [groupedArticles, searchTerm, dateLimiteStr])

  // Calculer les sections avec priorité d'affichage
  const ready = useMemo(() => {
    return grouped.filter(o => o.isReadyToShip)
  }, [grouped])

  const inProgress = useMemo(() => {
    return grouped.filter(o => o.globalStatus === 'in_progress')
  }, [grouped])

  const paused = useMemo(() => {
    return grouped.filter(o => o.globalStatus === 'paused')
  }, [grouped])

  const toDo = useMemo(() => {
    return grouped.filter(o => o.globalStatus === 'a_faire')
  }, [grouped])

  // Fonctions de gestion des overlays
  const handleOverlayOpen = (overlayId, type) => {
    setOpenReadyOverlayId(null)
    setOpenPausedOverlayId(null)
    setOpenInProgressOverlayId(null)
    
    switch (type) {
      case 'ready':
        setOpenReadyOverlayId(overlayId)
        break
      case 'paused':
        setOpenPausedOverlayId(overlayId)
        break
      case 'in_progress':
        setOpenInProgressOverlayId(overlayId)
        break
    }
  }

  const handleClickOutside = () => {
    setOpenReadyOverlayId(null)
    setOpenPausedOverlayId(null)
    setOpenInProgressOverlayId(null)
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

  if (isLoading) {
    return <div className="max-w-6xl mx-auto"><div className="bg-white rounded-2xl shadow-sm border p-6 text-center">Chargement...</div></div>
  }

  if (error) {
    return <div className="max-w-6xl mx-auto"><div className="bg-white rounded-2xl shadow-sm border p-6 text-center text-red-600">Erreur de chargement: {error.message}</div></div>
  }

  return (
    <div className="w-full px-4">
      <div className="mb-6">
        <OrderHeader
          selectedType="termine"
          filteredArticlesCount={grouped.length}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onGoToEnd={() => {
            try {
              const container = document.scrollingElement || document.documentElement
              container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
            } catch {}
          }}
        />
        
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setFocusedOrder(null); setOpenReadyOverlayId(null) }}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
              !focusedOrder 
                ? 'bg-blue-100 border-blue-300 text-blue-800' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            📋 Total: <strong>{grouped.length}</strong>
          </button>
          
          <button
            onClick={() => setFocusedOrder('ready')}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
              focusedOrder === 'ready' 
                ? 'bg-green-100 border-green-300 text-green-800' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            ✅ Prêtes: <strong>{ready.length}</strong>
          </button>
          
          <button
            onClick={() => setFocusedOrder('in_progress')}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
              focusedOrder === 'in_progress' 
                ? 'bg-blue-100 border-blue-300 text-blue-800' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            🔄 En cours: <strong>{inProgress.length}</strong>
          </button>
          
          <button
            onClick={() => setFocusedOrder('paused')}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
              focusedOrder === 'paused' 
                ? 'bg-yellow-100 border-yellow-300 text-yellow-800' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            ⏸️ En pause: <strong>{paused.length}</strong>
          </button>
          
          <button
            onClick={() => setFocusedOrder('to_do')}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer ${
              focusedOrder === 'to_do' 
                ? 'bg-gray-100 border-gray-300 text-gray-800' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            🆕 À faire: <strong>{toDo.length}</strong>
          </button>
        </div>
      </div>

      {/* Affichage des commandes groupées */}
      <div className="space-y-6">
        {grouped.map(({ orderNumber, order, articles, remaining, statusCounts, totalArticles, urgentCount, globalStatus, isReadyToShip, hasUrgent, isLate }) => (
          <div key={orderNumber} className="bg-white rounded-2xl shadow-sm border p-6">
            {/* En-tête de commande */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Commande #{orderNumber}
                </h3>
                {hasUrgent && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-800 border border-red-200">
                    🚨 {urgentCount} urgent{urgentCount > 1 ? 's' : ''}
                  </span>
                )}
                {isLate && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                    ⏰ En retard
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {statusCounts.termine}/{totalArticles} terminé{statusCounts.termine > 1 ? 's' : ''}
                </span>
                {isReadyToShip ? (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 border border-green-200">
                    ✅ Prête à expédier
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                    🔄 En cours
                  </span>
                )}
              </div>
            </div>

            {/* Informations client */}
            <div className="mb-4 text-sm text-gray-600">
              <p><strong>Client:</strong> {order.customer_name}</p>
              <p><strong>Email:</strong> {order.customer_email}</p>
              <p><strong>Date:</strong> {new Date(order.order_date).toLocaleDateString('fr-FR')}</p>
            </div>

            {/* Articles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((article) => (
                <ArticleCard
                  key={article.article_id}
                  article={article}
                  size={getArticleSize(article)}
                  color={getArticleColor(article)}
                  options={getArticleOptions()}
                  onOverlayOpen={(cardId) => handleOverlayOpen(cardId, globalStatus)}
                  openOverlayCardId={
                    globalStatus === 'ready' ? openReadyOverlayId :
                    globalStatus === 'paused' ? openPausedOverlayId :
                    globalStatus === 'in_progress' ? openInProgressOverlayId : null
                  }
                  onClickOutside={handleClickOutside}
                  searchTerm={searchTerm}
                  productionType="all"
                  prioritizeUrgent={true}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination supprimée pour tout charger */}
    </div>
  )
}

export default TerminePageRefactored
