import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import ArticleCard from './ArticleCard'
import LoadingSpinner from '../LoadingSpinner'
import { assignmentsService, tricoteusesService } from '../../services/mongodbService'
import delaiService from '../../services/delaiService'

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
  const [visibleCount, setVisibleCount] = useState(40)
  const sentinelRef = useRef(null)
  const [lastNonEmptyArticles, setLastNonEmptyArticles] = useState([])
  const [dateLimite, setDateLimite] = useState(null) // État pour la date limite

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

  // Fonction de mise à jour ciblée pour éviter les re-renders complets
  const updateAssignment = useCallback((articleId, newAssignment) => {
    setAssignments(prev => ({
      ...prev,
      [articleId]: newAssignment
    }))
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

  // Charger la date limite depuis le service
  const loadDateLimite = useCallback(async () => {
    try {
              // Récupérer la configuration des délais
        const configResponse = await delaiService.getDelai()
        if (configResponse.success && configResponse.data) {
          // Utiliser directement la date limite déjà calculée et stockée en BDD
          if (configResponse.data.dateLimite) {
            const dateLimiteStr = configResponse.data.dateLimite.split('T')[0]
            setDateLimite(dateLimiteStr)
            console.log('📅 Date limite utilisée depuis la BDD:', dateLimiteStr)
          } else {
            console.log('⚠️ Pas de date limite stockée en BDD, calcul impossible')
          }
        }
    } catch (error) {
      console.error('Erreur lors du chargement de la date limite:', error)
    }
  }, [])

  useEffect(() => {
    loadAssignments()
    loadTricoteuses()
    loadDateLimite()
  }, [loadAssignments, loadTricoteuses, loadDateLimite, productionType]) // Recharger quand on change d'onglet

  // Réinitialiser le nombre d'éléments visibles quand les filtres changent
  useEffect(() => {
    setVisibleCount(40)
  }, [filteredArticles.length, productionType, searchTerm])

  // Observer pour le chargement progressif (virtualisation simple)
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry.isIntersecting) {
        setVisibleCount((prev) => Math.min(prev + 40, filteredArticles.length))
      }
    }, { root: null, rootMargin: '600px', threshold: 0 })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [filteredArticles.length])

  // Gérer l'état de loading lors des changements d'onglets
  useEffect(() => {
    if (filteredArticles.length > 0) {
      setIsLoading(false)
      setLastNonEmptyArticles(filteredArticles)
    } else {
      // Si on perd temporairement les articles, continuer d'afficher la dernière liste connue
      setIsLoading(lastNonEmptyArticles.length === 0)
    }
  }, [filteredArticles, filteredArticles.length, productionType, lastNonEmptyArticles.length])

  // Mémoriser les cartes pour éviter les re-renders
  const memoizedCards = useMemo(() => {
    const source = (filteredArticles.length > 0 ? filteredArticles : lastNonEmptyArticles)
    const subset = source.slice(0, visibleCount)
    const cards = []
    
    subset.forEach((article, index) => {
      const cardId = `${article.orderId}-${article.line_item_id}`
      const isHighlighted = searchTerm && (
        `${article.orderNumber}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (article.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (article.product_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      
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
            assignment={assignments[article.line_item_id]} // Passer l'assignation directement
            tricoteusesProp={tricoteuses}
            onAssignmentUpdate={(articleId, assignment) => updateAssignment(articleId, assignment)} // Fonction pour rafraîchir les assignations
          />
        </div>
      )
      
      // Vérifier si c'est le dernier article de la date limite
      const isLastArticleOfDateLimite = index === subset.length - 1 || 
        (subset[index + 1] && subset[index + 1].orderDate !== article.orderDate)
      
      // Si c'est le dernier article de la date limite, ajouter un trait de séparation
      if (isLastArticleOfDateLimite && article.orderDate && dateLimite) {
        const dateCommande = new Date(article.orderDate)
        const dateLimiteObj = new Date(dateLimite)
        
        // Vérifier si la commande est de la date limite calculée
        if (dateCommande.toDateString() === dateLimiteObj.toDateString()) {
          console.log('📅 Ajout du trait de séparation après la commande:', article.orderNumber, 'Date:', article.orderDate, 'Date limite calculée:', dateLimite)
          
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
    assignments,
    tricoteuses
  ])

  // Afficher le loading pendant les changements d'onglets
  if (isLoading || assignmentsLoading || tricoteusesLoading) {
    return <LoadingSpinner />
  }

  // Si toujours pas d'articles et pas de cache, afficher un loader
  if (filteredArticles.length === 0 && lastNonEmptyArticles.length === 0) {
    return <LoadingSpinner />
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 w-full">
        {memoizedCards}
        {/* Sentinelle pour charger plus d'éléments au scroll */}
        <div ref={sentinelRef} style={{ width: 1, height: 1 }} />
      </div>
    </div>
  )
}

export default SimpleFlexGrid
