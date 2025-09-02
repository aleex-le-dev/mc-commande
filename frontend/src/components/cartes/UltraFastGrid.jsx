import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { FixedSizeGrid as Grid } from 'react-window'
import ArticleCard from './ArticleCard'
import LoadingSpinner from '../LoadingSpinner'
import { assignmentsService, tricoteusesService } from '../../services/mongodbService'
import delaiService from '../../services/delaiService'

// Composant de grille ultra-rapide avec virtualisation optimisée
const UltraFastGrid = ({ 
  articles, 
  getArticleSize, 
  getArticleColor, 
  getArticleOptions, 
  handleOverlayOpen, 
  openOverlayCardId, 
  searchTerm,
  productionType = 'unknown',
  isLoading = false,
  isFetching = false
}) => {
  const [assignments, setAssignments] = useState({})
  const [assignmentsLoading, setAssignmentsLoading] = useState(true)
  const [tricoteuses, setTricoteuses] = useState([])
  const [tricoteusesLoading, setTricoteusesLoading] = useState(true)
  const [dateLimite, setDateLimite] = useState(null)
  const calculEffectue = useRef(false)
  const gridRef = useRef(null)

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

  useEffect(() => {
    loadAssignments()
    loadTricoteuses()
    loadDateLimite()
  }, [loadAssignments, loadTricoteuses, loadDateLimite, productionType])

  // Écouter les mises à jour pour recharger la liste des tricoteuses sans rechargement
  useEffect(() => {
    const handler = () => loadTricoteuses()
    window.addEventListener('mc-tricoteuses-updated', handler)
    return () => window.removeEventListener('mc-tricoteuses-updated', handler)
  }, [loadTricoteuses])

  // Calculer la grille optimisée
  const gridConfig = useMemo(() => {
    if (articles.length === 0) return null
    
    const screenWidth = window.innerWidth
    let columnCount = 5
    if (screenWidth >= 1600) columnCount = 5
    else if (screenWidth >= 1200) columnCount = 4
    else if (screenWidth >= 900) columnCount = 3
    else if (screenWidth >= 600) columnCount = 2
    else columnCount = 1
    
    const availableWidth = window.innerWidth - 32
    const columnWidth = Math.floor(availableWidth / columnCount)
    const rowHeight = 450
    const totalRows = Math.ceil(articles.length / columnCount)
    const totalHeight = totalRows * rowHeight + 100
    
    return {
      columnCount,
      columnWidth,
      rowHeight,
      totalRows,
      totalHeight,
      availableWidth
    }
  }, [articles.length])

  // Mémoriser la grille pour éviter les recréations
  const memoizedGrid = useMemo(() => {
    if (!gridConfig || articles.length === 0) return null
    
    return (
      <Grid
        ref={gridRef}
        columnCount={gridConfig.columnCount}
        columnWidth={gridConfig.columnWidth}
        height={gridConfig.totalHeight}
        rowCount={gridConfig.totalRows}
        rowHeight={gridConfig.rowHeight}
        width={gridConfig.availableWidth}
        itemData={{
          articles,
          getArticleSize,
          getArticleColor,
          getArticleOptions,
          handleOverlayOpen,
          openOverlayCardId,
          searchTerm,
          columnCount: gridConfig.columnCount,
          columnWidth: gridConfig.columnWidth,
          assignments,
          tricoteuses,
          productionType,
          dateLimite
        }}
      >
        {({ columnIndex, rowIndex, style, data }) => {
          const index = rowIndex * data.columnCount + columnIndex
          const article = data.articles[index]
          if (!article) return null
          
          const cardId = `${article.orderId}-${article.line_item_id}`
          const isHighlighted = data.searchTerm && (
            `${article.orderNumber}`.toLowerCase().includes(data.searchTerm.toLowerCase()) ||
            (article.customer || '').toLowerCase().includes(data.searchTerm.toLowerCase()) ||
            (article.product_name || '').toLowerCase().includes(data.searchTerm.toLowerCase())
          )
          
          return (
            <div style={style} className="p-3">
              <ArticleCard 
                key={cardId}
                article={article}
                index={index}
                getArticleSize={data.getArticleSize}
                getArticleColor={data.getArticleColor}
                getArticleOptions={data.getArticleOptions}
                onOverlayOpen={() => data.handleOverlayOpen(cardId)}
                isOverlayOpen={data.openOverlayCardId === cardId}
                isHighlighted={isHighlighted}
                searchTerm={data.searchTerm}
                productionType={data.productionType}
                assignment={data.assignments[article.line_item_id]}
                tricoteusesProp={data.tricoteuses}
                onAssignmentUpdate={(articleId, assignment) => {
                  setAssignments(prev => ({ ...prev, [articleId]: assignment }))
                }}
              />
            </div>
          )
        }}
      </Grid>
    )
  }, [
    gridConfig, 
    articles, 
    getArticleSize, 
    getArticleColor, 
    getArticleOptions, 
    handleOverlayOpen, 
    openOverlayCardId, 
    searchTerm,
    assignments,
    tricoteuses,
    productionType,
    dateLimite
  ])

  // Afficher le loading pendant les changements d'onglets
  if (isLoading || assignmentsLoading || tricoteusesLoading) {
    return <LoadingSpinner />
  }

  // Si pas d'articles, afficher un message
  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Aucun article trouvé avec les filtres sélectionnés</p>
        <p className="text-sm text-gray-400 mt-2">
          Total d'articles en base: {articles.length} | Type sélectionné: {productionType}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Indicateur de chargement en arrière-plan */}
      {isFetching && (
        <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          🔄 Mise à jour...
        </div>
      )}
      
      {/* Grille virtualisée ultra-rapide */}
      <div className="relative">
        {memoizedGrid}
      </div>
    </div>
  )
}

export default UltraFastGrid
