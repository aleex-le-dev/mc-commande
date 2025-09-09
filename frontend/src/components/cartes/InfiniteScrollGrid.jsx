import React, { useState, useEffect, useCallback, useRef, useMemo, useImperativeHandle, forwardRef } from 'react'
import ArticleCard from './ArticleCard'
import LoadingSpinner from '../LoadingSpinner'
import { assignmentsService, tricoteusesService } from '../../services/mongodbService'
import delaiService from '../../services/delaiService'

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
  const [assignments, setAssignments] = useState({})
  const [assignmentsLoading, setAssignmentsLoading] = useState(true)
  const [tricoteuses, setTricoteuses] = useState([])
  const [tricoteusesLoading, setTricoteusesLoading] = useState(true)
  const [dateLimite, setDateLimite] = useState(null)
  const calculEffectue = useRef(false)
  
  // État pour le chargement progressif
  const [visibleArticles, setVisibleArticles] = useState([])
  const [currentBatch, setCurrentBatch] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const BATCH_SIZE = 15
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

  // Urgent: assignment.urgent ou localStorage (pour non assignés)
  const [urgentTick, setUrgentTick] = useState(0)
  useEffect(() => {
    const handleUrgent = () => setUrgentTick(Date.now())
    window.addEventListener('mc-mark-urgent', handleUrgent, true)
    return () => window.removeEventListener('mc-mark-urgent', handleUrgent, true)
  }, [])

  const isArticleUrgent = useCallback((article) => {
    // Utiliser urgentTick pour forcer le re-calcul
    urgentTick // référence pour déclencher le re-calcul
    const assignedUrgent = Boolean(assignments[article.line_item_id]?.urgent)
    
    // Un article est urgent uniquement si l'assignation en BDD le dit
    return assignedUrgent
  }, [assignments, urgentTick])

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
  }, [filteredArticles, isArticleUrgent, urgentTick, assignments])
  
  // Observer pour détecter quand on approche du bas
  const observerRef = useRef()
  const lastArticleRef = useCallback(node => {
    if (isLoadingMore) return
    
    if (observerRef.current) observerRef.current.disconnect()
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreArticles()
      }
    }, { threshold: 0.1 })
    
    if (node) observerRef.current.observe(node)
  }, [isLoadingMore, hasMore])

  // Charger plus d'articles
  const loadMoreArticles = useCallback(() => {
    if (isLoadingMore || !hasMore) return
    
    setIsLoadingMore(true)
    
    // Simuler un petit délai pour l'effet visuel
    setTimeout(() => {
      const nextBatch = currentBatch + 1
      const startIndex = nextBatch * BATCH_SIZE
      const endIndex = startIndex + BATCH_SIZE
      const newArticles = sortedArticles.slice(startIndex, endIndex)
      
      if (newArticles.length > 0) {
        setVisibleArticles(prev => [...prev, ...newArticles])
        setCurrentBatch(nextBatch)
        setHasMore(endIndex < sortedArticles.length)
      } else {
        setHasMore(false)
      }
      
      setIsLoadingMore(false)
    }, 300)
  }, [currentBatch, sortedArticles.length, isLoadingMore, hasMore])

  // Exposer une méthode pour charger tout et scroller en bas
  useImperativeHandle(ref, () => ({
    goToEnd: () => {
      // Charger tout d'un coup pour atteindre la fin
      setVisibleArticles(sortedArticles)
      setCurrentBatch(Math.ceil(sortedArticles.length / BATCH_SIZE) - 1)
      setHasMore(false)
      // Scroller quand le DOM est prêt (frame suivante)
      requestAnimationFrame(() => {
        if (bottomSentinelRef.current) {
          bottomSentinelRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
        } else {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
        }
      })
    }
  }), [sortedArticles])

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

  // Écouter l'événement de rechargement pour recharger les assignations
  useEffect(() => {
    let refreshTimeout = null
    
    const handleRefreshData = () => {
      // Éviter les rechargements multiples en cours
      if (refreshTimeout) {
        clearTimeout(refreshTimeout)
      }
      
      refreshTimeout = setTimeout(() => {
        console.log('🔄 Rechargement des assignations demandé')
        loadAssignments()
        refreshTimeout = null
      }, 150) // Délai légèrement différent pour éviter les conflits
    }
    
    window.addEventListener('mc-refresh-data', handleRefreshData)
    return () => {
      window.removeEventListener('mc-refresh-data', handleRefreshData)
      if (refreshTimeout) {
        clearTimeout(refreshTimeout)
      }
    }
  }, [loadAssignments])

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
    if (calculEffectue.current) return
    
    try {
      const [configResponse, joursFeriesResponse] = await Promise.all([
        delaiService.getDelai(),
        delaiService.getJoursFeries()
      ])
      
      if (configResponse.success && configResponse.data) {
        const joursDelai = configResponse.data.joursDelai || 21
        const joursOuvrables = configResponse.data.joursOuvrables || {
          lundi: true, mardi: true, mercredi: true, jeudi: true, vendredi: true, samedi: false, dimanche: false
        }
        const joursFeries = joursFeriesResponse.success ? joursFeriesResponse.joursFeries : {}
        
        const estJourFerie = (date) => {
          const dateStr = date.toISOString().split('T')[0]
          if (joursFeries && joursFeries[dateStr]) return true
          
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
            return Object.values(joursFeriesDefaut).includes(dateStr)
          }
          return false
        }
        
        const aujourdhui = new Date()
        let dateLimite = new Date(aujourdhui)
        let joursRetires = 0
        
        while (joursRetires < joursDelai) {
          dateLimite.setDate(dateLimite.getDate() - 1)
          const jourSemaine = dateLimite.getDay()
          const nomJour = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][jourSemaine]
          const dateStr = dateLimite.toISOString().split('T')[0]
          
          if (joursOuvrables[nomJour] && !estJourFerie(dateLimite)) {
            joursRetires++
          }
        }
        
        const dateLimiteStr = dateLimite.toISOString().split('T')[0]
        setDateLimite(dateLimiteStr)
        
        if (configResponse.data.dateLimite !== dateLimiteStr) {
          try {
            await delaiService.saveDelai({
              ...configResponse.data,
              dateLimite: dateLimiteStr,
              derniereModification: new Date().toISOString()
            })
          } catch (saveError) {
            console.error('Erreur lors de la sauvegarde de la date limite:', saveError)
          }
        }
        
        calculEffectue.current = true
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la date limite:', error)
    }
  }, [])

  // Initialiser le chargement
  useEffect(() => {
    loadAssignments()
    loadTricoteuses()
    loadDateLimite()
  }, [loadAssignments, loadTricoteuses, loadDateLimite, productionType])

  // Rafraîchir les tricoteuses en temps réel après modifications dans l'onglet Admin
  useEffect(() => {
    const handler = () => loadTricoteuses()
    window.addEventListener('mc-tricoteuses-updated', handler)
    return () => window.removeEventListener('mc-tricoteuses-updated', handler)
  }, [loadTricoteuses])

  // Réinitialiser le chargement progressif quand la recherche change
  useEffect(() => {
    if (sortedArticles.length > 0) {
      const firstBatch = sortedArticles.slice(0, BATCH_SIZE)
      setVisibleArticles(firstBatch)
      setCurrentBatch(0)
      setHasMore(sortedArticles.length > BATCH_SIZE)
    } else {
      setVisibleArticles([])
      setCurrentBatch(0)
      setHasMore(false)
    }
  }, [sortedArticles])

  // Charger le premier lot d'articles (seulement si pas de recherche)
  useEffect(() => {
    if (allArticles.length > 0 && !searchTerm) {
      const firstBatch = allArticles.slice(0, BATCH_SIZE)
      setVisibleArticles(firstBatch)
      setCurrentBatch(0)
      setHasMore(allArticles.length > BATCH_SIZE)
    }
  }, [allArticles, searchTerm])

  // Fonction pour vérifier si un article doit avoir le badge en retard
  const isArticleEnRetard = (article) => {
    if (!dateLimite || !article.orderDate) {
      return false
    }
    
    const dateCommande = new Date(article.orderDate)
    const dateLimiteObj = new Date(dateLimite)
    
    // Normaliser les dates pour la comparaison (ignorer l'heure)
    const dateCommandeNormalisee = new Date(dateCommande.getFullYear(), dateCommande.getMonth(), dateCommande.getDate())
    const dateLimiteNormalisee = new Date(dateLimiteObj.getFullYear(), dateLimiteObj.getMonth(), dateLimiteObj.getDate())
    
    // Un article est en retard si sa date de commande est AVANT ou ÉGALE à la date limite
    const estEnRetard = dateCommandeNormalisee <= dateLimiteNormalisee
    
    return estEnRetard
  }

  // Fonction pour vérifier si un article est APRÈS la date limite (pour la bordure rouge)
  const isArticleApresDateLimite = (article) => {
    if (!dateLimite || !article.orderDate) return false
    
    const dateCommande = new Date(article.orderDate)
    const dateLimiteObj = new Date(dateLimite)
    
    // Normaliser les dates pour la comparaison (ignorer l'heure)
    const dateCommandeNormalisee = new Date(dateCommande.getFullYear(), dateCommande.getMonth(), dateCommande.getDate())
    const dateLimiteNormalisee = new Date(dateLimiteObj.getFullYear(), dateLimiteObj.getMonth(), dateLimiteObj.getDate())
    
    // Un article est APRÈS la date limite si sa date de commande est POSTÉRIEURE à la date limite
    return dateCommandeNormalisee > dateLimiteNormalisee
  }

  // Trouver l'index du dernier article en retard dans la liste filtrée
  const getLastRetardIndex = () => {
    if (!dateLimite) return -1
    
    for (let i = sortedArticles.length - 1; i >= 0; i--) {
      if (isArticleEnRetard(sortedArticles[i])) {
        return i
      }
    }
    return -1
  }

  const lastRetardIndex = getLastRetardIndex()

  // Afficher le loading pendant les changements d'onglets
  if (assignmentsLoading || tricoteusesLoading) {
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
        {visibleArticles.map((article, index) => {
          const cardId = `${article.orderId}-${article.line_item_id}`
          const isHighlighted = searchTerm && (
            `${article.orderNumber}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (article.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (article.product_name || '').toLowerCase().includes(searchTerm.toLowerCase())
          )
          
          // Référence pour le dernier article (pour l'observer)
          const isLastArticle = index === visibleArticles.length - 1
          
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
                assignment={assignments[article.line_item_id]}
                tricoteusesProp={tricoteuses}
                onAssignmentUpdate={(articleId, assignment) => {
                  setAssignments(prev => ({ ...prev, [articleId]: assignment }))
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
      {isLoadingMore && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Chargement de {BATCH_SIZE} articles...</span>
          </div>
        </div>
      )}
      
      {/* Message de fin */}
      <div ref={bottomSentinelRef} />
      {!hasMore && visibleArticles.length > 0 && (
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
