import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import ArticleCard from './ArticleCard'
import LoadingSpinner from '../LoadingSpinner'
import useGridState from '../../hooks/useGridState'

// Composant simple avec flexbox et flex-wrap pour les cartes
const SimpleFlexGrid = ({ 
  filteredArticles, 
  getArticleSize, 
  getArticleColor, 
  getArticleOptions, 
  handleOverlayOpen, 
  openOverlayCardId, 
  searchTerm,
  productionType = 'unknown', // Ajouter le type de production
  prioritizeUrgent = true
}) => {
  // Hook spécialisé pour la gestion d'état
  const gridState = useGridState()
  
  const [urgentTick, setUrgentTick] = useState(0) // État pour forcer les re-renders
  const sentinelRef = useRef(null)
  const calculEffectue = useRef(false)
  
  // Pas besoin de isLoading local, on utilise directement les données
  
  // OPTIMISATION: Réduire les états locaux et utiliser des refs pour les valeurs non-critiques
  const visibleCountRef = useRef(280)
  const lastNonEmptyArticlesRef = useRef([])
  const urgentTickRef = useRef(0)
  const urgentOverridesRef = useRef(new Map()) // key: `${orderId}-${lineItemId}` -> boolean
  
  // États dérivés avec useMemo pour éviter les re-renders
  const visibleCount = useMemo(() => visibleCountRef.current, [])
  const lastNonEmptyArticles = useMemo(() => lastNonEmptyArticlesRef.current, [])

  // Les assignations et tricoteuses sont maintenant gérées par useGridState

  // État pour forcer le re-render des cartes
  const [cardsUpdateTrigger, setCardsUpdateTrigger] = useState(0)
  
  // Écouter l'événement de synchronisation terminée
  useEffect(() => {
    const handleSyncCompleted = () => {
      console.log('🔄 Re-render après synchronisation')
      setCardsUpdateTrigger(prev => prev + 1)
    }
    
    window.addEventListener('mc-sync-completed', handleSyncCompleted)
    return () => window.removeEventListener('mc-sync-completed', handleSyncCompleted)
  }, [])
  
  // Fonction de mise à jour ciblée pour éviter les re-renders complets
  const updateAssignment = useCallback((articleId, newAssignment) => {
    // Mettre à jour l'état local immédiatement
    if (newAssignment) {
      gridState.setAssignments(prev => {
        const updated = {
          ...prev,
          [articleId]: newAssignment
        }
        return updated
      })
      
      // Note: Les articles sont gérés par le composant parent via filteredArticles
      // Pas besoin de les mettre à jour localement ici
    } else {
      gridState.setAssignments(prev => {
        const updated = { ...prev }
        delete updated[articleId]
        return updated
      })
      
      // Note: Les articles sont gérés par le composant parent via filteredArticles
      // Pas besoin de les mettre à jour localement ici
    }
    
    // Forcer le re-render des cartes
    setCardsUpdateTrigger(prev => prev + 1)
    
    // Puis recharger les données pour synchroniser
    gridState.refreshData()
  }, [gridState])

  // La date limite est maintenant gérée par useGridState

  // Écouter les mises à jour globales des tricoteuses et assignations
  useEffect(() => {
    const handler = () => gridState.refreshData()
    window.addEventListener('mc-tricoteuses-updated', handler)
    window.addEventListener('mc-assignment-updated', handler)
    return () => {
      window.removeEventListener('mc-tricoteuses-updated', handler)
      window.removeEventListener('mc-assignment-updated', handler)
    }
  }, [gridState])

  // Re-trier immédiatement quand un article est marqué urgent
  useEffect(() => {
    const handleUrgent = () => {
      urgentTickRef.current += 1
      setUrgentTick(urgentTickRef.current)
    }
    const handleUrgentUpdated = (ev) => {
      const { orderId, lineItemId, urgent } = ev.detail || {}
      if (!orderId || !lineItemId) return
      urgentOverridesRef.current.set(`${orderId}-${lineItemId}`, Boolean(urgent))
      urgentTickRef.current += 1
      setUrgentTick(urgentTickRef.current)
    }
    window.addEventListener('mc-mark-urgent', handleUrgent)
    window.addEventListener('mc-article-urgent-updated', handleUrgentUpdated)
    return () => {
      window.removeEventListener('mc-mark-urgent', handleUrgent)
      window.removeEventListener('mc-article-urgent-updated', handleUrgentUpdated)
    }
  }, [])

  // Réinitialiser le nombre d'éléments visibles quand les filtres changent
  useEffect(() => {
    visibleCountRef.current = 280 // Afficher tous les articles par défaut
  }, [filteredArticles.length, productionType, searchTerm])

  // Observer pour le chargement progressif (virtualisation simple)
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry.isIntersecting) {
        visibleCountRef.current = Math.min(visibleCountRef.current + 40, filteredArticles.length)
      }
    }, { root: null, rootMargin: '600px', threshold: 0 })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [filteredArticles.length])

  // Gérer l'état de loading lors des changements d'onglets
  useEffect(() => {
    if (filteredArticles.length > 0) {
      lastNonEmptyArticlesRef.current = filteredArticles
    }
  }, [filteredArticles, filteredArticles.length, productionType])

  // Mémoriser les cartes pour éviter les re-renders
  const memoizedCards = useMemo(() => {
    // Inclure cardsUpdateTrigger dans les dépendances pour forcer le re-render
    const trigger = cardsUpdateTrigger
    const source = (filteredArticles.length > 0 ? filteredArticles : lastNonEmptyArticlesRef.current)
    // Prioriser les urgents en tête selon le flag
    const arranged = prioritizeUrgent
      ? [...source].sort((a, b) => {
          const keyA = `${a.orderId}-${a.line_item_id}`
          const keyB = `${b.orderId}-${b.line_item_id}`
          const overrideA = urgentOverridesRef.current.get(keyA)
          const overrideB = urgentOverridesRef.current.get(keyB)
          const ua = (typeof overrideA === 'boolean') ? (overrideA ? 1 : 0) : ((a.production_status?.urgent === true) ? 1 : 0)
          const ub = (typeof overrideB === 'boolean') ? (overrideB ? 1 : 0) : ((b.production_status?.urgent === true) ? 1 : 0)
          if (ua !== ub) return ub - ua
          return 0
        })
      : source
    // Afficher la fin de la liste (les plus récentes en bas si tri croissant)
    const subsetStart = Math.max(0, arranged.length - visibleCount)
    const subset = arranged.slice(subsetStart)
    const cards = []
    
    // Helper: déterminer si l'article est en retard par rapport à la date limite
    const isArticleEnRetard = (article) => {
      
      if (!gridState.dateLimite || !article.orderDate) {
        return false
      }
      
      const dateCommande = new Date(article.orderDate)
      const dateLimiteObj = new Date(gridState.dateLimite)
      const dc = new Date(dateCommande.getFullYear(), dateCommande.getMonth(), dateCommande.getDate())
      const dl = new Date(dateLimiteObj.getFullYear(), dateLimiteObj.getMonth(), dateLimiteObj.getDate())
      const isRetard = dc <= dl
      
      
      return isRetard
    }

    subset.forEach((article, index) => {
      const cardId = `${article.orderId}-${article.line_item_id}`
      const isHighlighted = searchTerm && (
        `${article.orderNumber}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (article.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (article.product_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      
      // Debug: vérifier les IDs
      
      // Ajouter la carte
      cards.push(
        <div 
          key={`${productionType}-${cardId}`} // Clé unique incluant le type de production
          className="w-full"
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
            assignment={gridState.assignments[article.line_item_id]} // Passer l'assignation directement
            // Debug: vérifier l'ID utilisé
            data-debug-assignment-id={article.line_item_id}
            data-debug-assignments-keys={Object.keys(gridState.assignments).join(',')}
            tricoteusesProp={gridState.tricoteuses}
            onAssignmentUpdate={(articleId, assignment) => updateAssignment(articleId, assignment)} // Fonction pour rafraîchir les assignations
            isEnRetard={isArticleEnRetard(article)}
          />
        </div>
      )
      
      
    })
    
    return cards
  }, [
    filteredArticles, 
    getArticleSize, 
    getArticleColor, 
    getArticleOptions, 
    handleOverlayOpen, 
    openOverlayCardId, 
    searchTerm,
    productionType, // Ajouter aux dépendances
    gridState.assignments,
    urgentTick,
    gridState.tricoteuses,
    prioritizeUrgent,
    gridState.dateLimite,
    cardsUpdateTrigger // Forcer le re-render des cartes
  ])

  // Afficher le loading pendant les changements d'onglets
  if (gridState.assignmentsLoading || gridState.tricoteusesLoading || gridState.dateLimiteLoading) {
    return <LoadingSpinner />
  }

  // Si toujours pas d'articles et pas de cache, afficher un message
  if (filteredArticles.length === 0 && lastNonEmptyArticles.length === 0) {
    return (
      <div className="w-full text-center py-12">
        <div className="text-gray-500 text-lg">
          📋 Aucun article trouvé
        </div>
        <div className="text-gray-400 text-sm mt-2">
          Aucune commande n'a été trouvée pour le moment.
        </div>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-6 w-full cols-1-350">
        {memoizedCards}
        {/* Sentinelle pour charger plus d'éléments au scroll */}
        <div ref={sentinelRef} style={{ width: 1, height: 1 }} />
      </div>
    </div>
  )
}

export default SimpleFlexGrid
