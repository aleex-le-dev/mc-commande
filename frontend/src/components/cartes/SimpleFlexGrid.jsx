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
  
  const [isLoading, setIsLoading] = useState(true)
  const [urgentTick, setUrgentTick] = useState(0) // État pour forcer les re-renders
  const sentinelRef = useRef(null)
  const calculEffectue = useRef(false)
  
  // OPTIMISATION: Réduire les états locaux et utiliser des refs pour les valeurs non-critiques
  const visibleCountRef = useRef(280)
  const lastNonEmptyArticlesRef = useRef([])
  const urgentTickRef = useRef(0)
  
  // États dérivés avec useMemo pour éviter les re-renders
  const visibleCount = useMemo(() => visibleCountRef.current, [])
  const lastNonEmptyArticles = useMemo(() => lastNonEmptyArticlesRef.current, [])

  // Les assignations et tricoteuses sont maintenant gérées par useGridState

  // État pour forcer le re-render des cartes
  const [cardsUpdateTrigger, setCardsUpdateTrigger] = useState(0)
  
  // Fonction de mise à jour ciblée pour éviter les re-renders complets
  const updateAssignment = useCallback((articleId, newAssignment) => {
    console.log('🔍 updateAssignment appelée:', articleId, newAssignment)
    // Mettre à jour l'état local immédiatement
    if (newAssignment) {
      gridState.setAssignments(prev => {
        const updated = {
          ...prev,
          [articleId]: newAssignment
        }
        console.log('🔍 Assignations mises à jour:', updated)
        return updated
      })
      
      // Note: Les articles sont gérés par le composant parent via filteredArticles
      // Pas besoin de les mettre à jour localement ici
    } else {
      gridState.setAssignments(prev => {
        const updated = { ...prev }
        delete updated[articleId]
        console.log('🔍 Assignation supprimée:', updated)
        return updated
      })
      
      // Mettre à jour le statut de l'article localement
      setArticles(prev => prev.map(article => {
        if (article.line_item_id === articleId) {
          return {
            ...article,
            globalStatus: 'a_faire'
          }
        }
        return article
      }))
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
      // Forcer un re-render seulement si nécessaire
      if (urgentTickRef.current % 5 === 0) {
        // Re-render seulement tous les 5 urgents pour éviter les re-renders excessifs
        setUrgentTick(urgentTickRef.current)
      }
    }
    window.addEventListener('mc-mark-urgent', handleUrgent)
    return () => window.removeEventListener('mc-mark-urgent', handleUrgent)
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
      setIsLoading(false)
      lastNonEmptyArticlesRef.current = filteredArticles
    } else {
      // Si on perd temporairement les articles, continuer d'afficher la dernière liste connue
      setIsLoading(lastNonEmptyArticlesRef.current.length === 0)
    }
  }, [filteredArticles, filteredArticles.length, productionType, lastNonEmptyArticlesRef.current.length])

  // Mémoriser les cartes pour éviter les re-renders
  const memoizedCards = useMemo(() => {
    const source = (filteredArticles.length > 0 ? filteredArticles : lastNonEmptyArticlesRef.current)
    // Prioriser les urgents en tête selon le flag
    const arranged = prioritizeUrgent
      ? [...source].sort((a, b) => {
          const ua = (a.production_status?.urgent === true) ? 1 : 0
          const ub = (b.production_status?.urgent === true) ? 1 : 0
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
      if (!gridState.dateLimite || !article.orderDate) return false
      const dateCommande = new Date(article.orderDate)
      const dateLimiteObj = new Date(gridState.dateLimite)
      const dc = new Date(dateCommande.getFullYear(), dateCommande.getMonth(), dateCommande.getDate())
      const dl = new Date(dateLimiteObj.getFullYear(), dateLimiteObj.getMonth(), dateLimiteObj.getDate())
      return dc <= dl
    }

    subset.forEach((article, index) => {
      const cardId = `${article.orderId}-${article.line_item_id}`
      const isHighlighted = searchTerm && (
        `${article.orderNumber}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (article.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (article.product_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      
      // Debug: vérifier les IDs
      console.log('🔍 Article ID:', article.line_item_id, 'Assignations disponibles:', Object.keys(gridState.assignments))
      
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
      
      // Vérifier si c'est le dernier article de la date limite
      const isLastArticleOfDateLimite = index === subset.length - 1 || 
        (subset[index + 1] && subset[index + 1].orderDate !== article.orderDate)
      
      // Si c'est le dernier article de la date limite, ajouter un trait de séparation
      if (isLastArticleOfDateLimite && article.orderDate && gridState.dateLimite) {
        const dateCommande = new Date(article.orderDate)
        const dateLimiteObj = new Date(gridState.dateLimite)
        
        // Vérifier si la commande est de la date limite calculée
        if (dateCommande.toDateString() === dateLimiteObj.toDateString()) {
          
          // Ajouter le trait de séparation qui traverse toute la largeur
          cards.push(
            <div 
              key={`separator-${article.orderNumber}`}
              className="col-span-full w-full h-2 bg-red-500 my-4 rounded-lg shadow-lg"
              style={{ 
                gridColumn: '1 / -1',
                width: '100%',
                margin: '16px 0'
              }}
            >
              <div className="flex items-center justify-center h-full">
                <span className="text-white text-sm font-bold">📅 Date limite - {dateLimiteObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
              </div>
            </div>
          )
        }
      }
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
  if (isLoading || gridState.assignmentsLoading || gridState.tricoteusesLoading || gridState.dateLimiteLoading) {
    return <LoadingSpinner />
  }

  // Si toujours pas d'articles et pas de cache, afficher un loader
  if (filteredArticles.length === 0 && lastNonEmptyArticles.length === 0) {
    return <LoadingSpinner />
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
