import React, { useEffect, useCallback, useRef, useMemo, useImperativeHandle, forwardRef, useState } from 'react'
import ArticleCard from './ArticleCard'
import LoadingSpinner from '../LoadingSpinner'
import useGridState from '../../hooks/useGridState'
import usePaginationState from '../../hooks/usePaginationState'

// Composant avec chargement progressif par lots de 30 articles
const InfiniteScrollGrid = forwardRef(({ 
  allArticles, 
  getArticleSize, 
  getArticleColor, 
  getArticleOptions, 
  handleOverlayOpen, 
  openOverlayCardId, 
  searchTerm,
  productionType = 'unknown'
}, ref) => {
  // Hooks spécialisés pour la gestion d'état
  const gridState = useGridState()
  const paginationState = usePaginationState(15)
  
  const calculEffectue = useRef(false)
  const bottomSentinelRef = useRef(null)

  // Filtrer les articles en fonction du terme de recherche
  const filteredArticles = useMemo(() => {
    if (!searchTerm || searchTerm.trim() === '') {
      return allArticles
    }
    
    const term = searchTerm.toLowerCase().trim()
    return allArticles.filter(article => 
      `${article.orderNumber}`.toLowerCase().includes(term) ||
      (article.customer || '').toLowerCase().includes(term) ||
      (article.product_name || '').toLowerCase().includes(term)
    )
  }, [allArticles, searchTerm])

  // Gestion des articles urgents
  const [urgentTick, setUrgentTick] = useState(0)
  useEffect(() => {
    const handleUrgent = () => setUrgentTick(Date.now())
    window.addEventListener('mc-mark-urgent', handleUrgent, true)
    return () => window.removeEventListener('mc-mark-urgent', handleUrgent, true)
  }, [])

  const isArticleUrgent = useCallback((article) => {
    // Utiliser urgentTick pour forcer le re-calcul
    urgentTick // référence pour déclencher le re-calcul
    const assignedUrgent = Boolean(gridState.assignments[article.line_item_id]?.urgent)
    
    // Un article est urgent uniquement si l'assignation en BDD le dit
    return assignedUrgent
  }, [gridState.assignments, urgentTick])

  // Ordonner: urgents d'abord, puis par ordre chronologique
  const sortedArticles = useMemo(() => {
    const withIndex = filteredArticles.map((a, i) => ({ a, i }))
    withIndex.sort((x, y) => {
      const ux = isArticleUrgent(x.a) ? 1 : 0
      const uy = isArticleUrgent(y.a) ? 1 : 0
      if (ux !== uy) return uy - ux // urgents en premier
      // Pour les non-urgents, conserver l'ordre chronologique original
      return x.i - y.i // ordre initial stable (chronologique)
    })
    return withIndex.map(w => w.a)
  }, [filteredArticles, isArticleUrgent, urgentTick, gridState.assignments])
  
  // Observer pour détecter quand on approche du bas
  const observerRef = useRef()
  const lastArticleRef = useCallback(node => {
    if (paginationState.isLoadingMore) return
    
    if (observerRef.current) observerRef.current.disconnect()
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && paginationState.hasMore) {
        loadMoreArticles()
      }
    }, { threshold: 0.1 })
    
    if (node) observerRef.current.observe(node)
  }, [paginationState.isLoadingMore, paginationState.hasMore])

  // Charger plus d'articles
  const loadMoreArticles = useCallback(() => {
    paginationState.loadMore(sortedArticles)
  }, [paginationState, sortedArticles])

  // Exposer une méthode pour charger tout et scroller en bas
  useImperativeHandle(ref, () => ({
    goToEnd: () => {
      // Charger tout d'un coup pour atteindre la fin
      paginationState.setVisibleArticles(sortedArticles)
      // Scroller quand le DOM est prêt (frame suivante)
      requestAnimationFrame(() => {
        if (bottomSentinelRef.current) {
          bottomSentinelRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
        } else {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
        }
      })
    }
  }), [sortedArticles, paginationState])

  // Les assignations sont maintenant gérées par useGridState

  // Écouter l'événement de rechargement pour recharger les données
  useEffect(() => {
    const handleRefreshData = () => {
      console.log('🔄 Rechargement des données demandé')
      gridState.refreshData()
    }
    
    window.addEventListener('mc-refresh-data', handleRefreshData)
    return () => {
      window.removeEventListener('mc-refresh-data', handleRefreshData)
    }
  }, [gridState])

  // Les tricoteuses sont maintenant gérées par useGridState

  // Rafraîchir les tricoteuses en temps réel après modifications dans l'onglet Admin
  useEffect(() => {
    const handler = () => gridState.refreshData()
    window.addEventListener('mc-tricoteuses-updated', handler)
    return () => window.removeEventListener('mc-tricoteuses-updated', handler)
  }, [gridState])

  // Réinitialiser le chargement progressif quand la recherche change
  useEffect(() => {
    if (sortedArticles.length > 0) {
      const firstBatch = sortedArticles.slice(0, 15)
      paginationState.setVisibleArticles(firstBatch)
    } else {
      paginationState.setVisibleArticles([])
    }
  }, [sortedArticles])

  // Charger le premier lot d'articles (seulement si pas de recherche)
  useEffect(() => {
    if (allArticles.length > 0 && !searchTerm) {
      const firstBatch = allArticles.slice(0, 15)
      paginationState.setVisibleArticles(firstBatch)
    }
  }, [allArticles, searchTerm, paginationState])

  // Fonction pour vérifier si un article doit avoir le badge en retard
  const isArticleEnRetard = (article) => {
    if (!gridState.dateLimite || !article.orderDate) {
      return false
    }
    
    const dateCommande = new Date(article.orderDate)
    const dateLimiteObj = new Date(gridState.dateLimite)
    
    // Normaliser les dates pour la comparaison (ignorer l'heure)
    const dateCommandeNormalisee = new Date(dateCommande.getFullYear(), dateCommande.getMonth(), dateCommande.getDate())
    const dateLimiteNormalisee = new Date(dateLimiteObj.getFullYear(), dateLimiteObj.getMonth(), dateLimiteObj.getDate())
    
    // Un article est en retard si sa date de commande est AVANT ou ÉGALE à la date limite
    const estEnRetard = dateCommandeNormalisee <= dateLimiteNormalisee
    
    return estEnRetard
  }

  // Fonction pour vérifier si un article est APRÈS la date limite (pour la bordure rouge)
  const isArticleApresDateLimite = (article) => {
    if (!gridState.dateLimite || !article.orderDate) return false
    
    const dateCommande = new Date(article.orderDate)
    const dateLimiteObj = new Date(gridState.dateLimite)
    
    // Normaliser les dates pour la comparaison (ignorer l'heure)
    const dateCommandeNormalisee = new Date(dateCommande.getFullYear(), dateCommande.getMonth(), dateCommande.getDate())
    const dateLimiteNormalisee = new Date(dateLimiteObj.getFullYear(), dateLimiteObj.getMonth(), dateLimiteObj.getDate())
    
    // Un article est APRÈS la date limite si sa date de commande est POSTÉRIEURE à la date limite
    return dateCommandeNormalisee > dateLimiteNormalisee
  }

  // Trouver l'index du dernier article en retard dans la liste filtrée
  const getLastRetardIndex = () => {
    if (!gridState.dateLimite) return -1
    
    for (let i = sortedArticles.length - 1; i >= 0; i--) {
      if (isArticleEnRetard(sortedArticles[i])) {
        return i
      }
    }
    return -1
  }

  const lastRetardIndex = getLastRetardIndex()

  // Afficher le loading pendant les changements d'onglets
  if (gridState.assignmentsLoading || gridState.tricoteusesLoading) {
    return <LoadingSpinner />
  }

  // Si pas d'articles, afficher un message
  if (filteredArticles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          {searchTerm ? `Aucun article trouvé pour "${searchTerm}"` : 'Aucun article trouvé avec les filtres sélectionnés'}
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Total d'articles en base: {allArticles.length} | Articles filtrés: {filteredArticles.length} | Type sélectionné: {productionType}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Grille avec chargement progressif */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 w-full max-w-full">
        {paginationState.visibleArticles.map((article, index) => {
          const cardId = `${article.orderId}-${article.line_item_id}`
          const isHighlighted = searchTerm && (
            `${article.orderNumber}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (article.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (article.product_name || '').toLowerCase().includes(searchTerm.toLowerCase())
          )
          
          // Référence pour le dernier article (pour l'observer)
          const isLastArticle = index === paginationState.visibleArticles.length - 1
          
          // Vérifier si c'est le dernier article en retard (en utilisant l'index global)
          const isDernierEnRetard = lastRetardIndex !== -1 && 
            sortedArticles.indexOf(article) === lastRetardIndex
          
          return (
            <div 
              key={cardId}
              ref={isLastArticle ? lastArticleRef : null}
              className="w-full relative"
              style={{ zIndex: 1 }}
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
                productionType={productionType}
                assignment={gridState.assignments[article.line_item_id]}
                tricoteusesProp={gridState.tricoteuses}
                onAssignmentUpdate={(articleId, assignment) => {
                  // Les assignations sont gérées par useGridState
                  gridState.refreshData()
                }}
                isEnRetard={isArticleEnRetard(article)}
              />
              
              {/* Trait rouge vertical à droite de la dernière carte en retard avec padding */}
              {isDernierEnRetard && (
                <div className="absolute top-0 w-1 h-full bg-red-500 rounded-l-full shadow-lg" style={{ right: '-8px' }}></div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Indicateur de chargement en bas */}
      {paginationState.isLoadingMore && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Chargement de 15 articles...</span>
          </div>
        </div>
      )}
      
      {/* Message de fin */}
      <div ref={bottomSentinelRef} />
      {!paginationState.hasMore && paginationState.visibleArticles.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            ✅ Tous les {filteredArticles.length} articles ont été chargés
            {searchTerm && ` pour "${searchTerm}"`}
          </p>
        </div>
      )}
    </div>
  )
});

export default InfiniteScrollGrid
