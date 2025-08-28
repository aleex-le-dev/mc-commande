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
  const [visibleCount, setVisibleCount] = useState(280) // Augmenter la limite initiale
  const sentinelRef = useRef(null)
  const [lastNonEmptyArticles, setLastNonEmptyArticles] = useState([])
  const [dateLimite, setDateLimite] = useState(null) // État pour la date limite
  const calculEffectue = useRef(false)

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
    // Éviter les calculs répétés
    if (calculEffectue.current) return
    
    try {
      // Récupérer la configuration des délais et les jours fériés
      const [configResponse, joursFeriesResponse] = await Promise.all([
        delaiService.getDelai(),
        delaiService.getJoursFeries()
      ])
      
      if (configResponse.success && configResponse.data) {
        // Log de la date limite actuellement en BDD
        if (configResponse.data.dateLimite) {
          console.log('🗄️ Date limite actuellement en BDD:', configResponse.data.dateLimite.split('T')[0])
        } else {
          console.log('🗄️ Aucune date limite stockée en BDD')
        }
        
        const joursDelai = configResponse.data.joursDelai || 21
        const joursOuvrables = configResponse.data.joursOuvrables || {
          lundi: true, mardi: true, mercredi: true, jeudi: true, vendredi: true, samedi: false, dimanche: false
        }
        const joursFeries = joursFeriesResponse.success ? joursFeriesResponse.joursFeries : {}
        
        // Fonction pour vérifier si une date est un jour férié
        const estJourFerie = (date) => {
          const dateStr = date.toISOString().split('T')[0]
          
          // Vérifier d'abord dans les jours fériés chargés depuis l'API
          if (joursFeries && joursFeries[dateStr]) {
            return true
          }
          
          // Si pas de jours fériés depuis l'API, utiliser les jours fériés par défaut
          if (Object.keys(joursFeries || {}).length === 0) {
            const anneeActuelle = date.getFullYear()
            const joursFeriesDefaut = {
              '1er janvier': `${anneeActuelle}-01-01`,
              'Lundi de Pâques': `${anneeActuelle}-04-${anneeActuelle === 2025 ? '21' : anneeActuelle === 2024 ? '01' : '22'}`,
              '1er mai': `${anneeActuelle}-05-01`,
              '8 mai': `${anneeActuelle}-05-08`,
              'Ascension': `${anneeActuelle}-05-${anneeActuelle === 2025 ? '29' : anneeActuelle === 2024 ? '09' : '30'}`,
              'Lundi de Pentecôte': `${anneeActuelle}-06-${anneeActuelle === 2025 ? '09' : anneeActuelle === 2024 ? '17' : '10'}`,
              '14 juillet': `${anneeActuelle}-07-14`,
              '15 août': `${anneeActuelle}-08-15`,
              '1er novembre': `${anneeActuelle}-11-01`,
              '11 novembre': `${anneeActuelle}-11-11`,
              '25 décembre': `${anneeActuelle}-12-25`
            }
            
            // Vérifier si la date est dans les jours fériés par défaut
            return Object.values(joursFeriesDefaut).includes(dateStr)
          }
          
          return false
        }
        
        // Calculer la date limite en remontant depuis aujourd'hui
        const aujourdhui = new Date()
        let dateLimite = new Date(aujourdhui)
        let joursRetires = 0
        
        while (joursRetires < joursDelai) {
          dateLimite.setDate(dateLimite.getDate() - 1)
          
          const jourSemaine = dateLimite.getDay()
          const nomJour = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][jourSemaine]
          const dateStr = dateLimite.toISOString().split('T')[0]
          
          // Vérifier si c'est un jour ouvrable ET pas un jour férié
          if (joursOuvrables[nomJour] && !estJourFerie(dateLimite)) {
            joursRetires++
          }
        }
        
        const dateLimiteStr = dateLimite.toISOString().split('T')[0]
        setDateLimite(dateLimiteStr)
        
        // Enregistrer la nouvelle date limite en BDD seulement si elle est différente
        if (configResponse.data.dateLimite !== dateLimiteStr) {
          try {
            await delaiService.saveDelai({
              ...configResponse.data,
              dateLimite: dateLimiteStr,
              derniereModification: new Date().toISOString()
            })
            console.log('💾 Date limite sauvegardée en BDD:', dateLimiteStr)
          } catch (saveError) {
            console.error('Erreur lors de la sauvegarde de la date limite:', saveError)
          }
        }
        
        calculEffectue.current = true
      } else {
        console.log('⚠️ Pas de configuration de délai disponible')
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
    setVisibleCount(280) // Afficher tous les articles par défaut
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
    <div className="w-full overflow-x-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 w-full max-w-full">
        {memoizedCards}
        {/* Sentinelle pour charger plus d'éléments au scroll */}
        <div ref={sentinelRef} style={{ width: 1, height: 1 }} />
      </div>
    </div>
  )
}

export default SimpleFlexGrid
