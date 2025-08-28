import React, { useMemo, useCallback, useState, useEffect } from 'react'
import ArticleCard from './ArticleCard'
import LoadingSpinner from '../LoadingSpinner'
import { assignmentsService, tricoteusesService } from '../../services/mongodbService'

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
  const [isLoading, setIsLoading] = useState(true)
  const [assignments, setAssignments] = useState({})
  const [assignmentsLoading, setAssignmentsLoading] = useState(true)
  const [tricoteuses, setTricoteuses] = useState([])
  const [tricoteusesLoading, setTricoteusesLoading] = useState(true)

  // Charger toutes les assignations en une fois
  const loadAssignments = useCallback(async () => {
    try {
      setAssignmentsLoading(true)
      const response = await assignmentsService.getAllAssignments()
      const assignmentsMap = {}
      response.forEach(assignment => {
        assignmentsMap[assignment.article_id] = assignment
      })
      setAssignments(assignmentsMap)
    } catch (error) {
      console.error('Erreur chargement assignations:', error)
    } finally {
      setAssignmentsLoading(false)
    }
  }, [])

  // Charger toutes les tricoteuses une seule fois
  const loadTricoteuses = useCallback(async () => {
    try {
      setTricoteusesLoading(true)
      const data = await tricoteusesService.getAllTricoteuses()
      setTricoteuses(data || [])
    } catch (error) {
      console.error('Erreur chargement tricoteuses:', error)
      setTricoteuses([])
    } finally {
      setTricoteusesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAssignments()
    loadTricoteuses()
  }, [loadAssignments, loadTricoteuses, productionType]) // Recharger quand on change d'onglet

  // Gérer l'état de loading lors des changements d'onglets
  useEffect(() => {
    // Toujours afficher le loading au début
    if (filteredArticles.length === 0) {
      setIsLoading(true)
      // Simuler un délai de chargement
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 800)
      return () => clearTimeout(timer)
    } else {
      // Articles disponibles, masquer le loading
      setIsLoading(false)
    }
  }, [filteredArticles.length, productionType]) // Retirer previousArticlesCount des dépendances

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
            assignment={assignments[article.line_item_id]} // Passer l'assignation directement
            tricoteuses={tricoteuses}
            onAssignmentUpdate={loadAssignments} // Fonction pour rafraîchir les assignations
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
    productionType, // Ajouter aux dépendances
    assignments,
    tricoteuses
  ])

  // Afficher le loading pendant les changements d'onglets
  if (isLoading || assignmentsLoading || tricoteusesLoading) {
    return <LoadingSpinner />
  }

  if (filteredArticles.length === 0) {
    return <LoadingSpinner />
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
