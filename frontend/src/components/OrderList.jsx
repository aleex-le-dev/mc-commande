import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import LoadingSpinner from './LoadingSpinner'
import ImagePreloader from './ImagePreloader'
import { 
  SyncProgress, 
  OrderHeader, 
  InfiniteScrollGrid,
  useAllArticles,
  useSyncProgress,
  useOrderData
} from './cartes'

const OrderList = ({ onNavigateToType, selectedType: propSelectedType }) => {
  const queryClient = useQueryClient()
  
  // Utiliser le hook simple pour récupérer tous les articles
  const {
    articles,
    isLoading,
    error,
    totalArticles,
    refetch
  } = useAllArticles(propSelectedType)

  // Utiliser le hook pour les données des articles et la synchronisation
  const { performSync } = useOrderData(propSelectedType)

  // Passer la fonction performSync au hook de synchronisation
  const { syncProgress, syncLogs } = useSyncProgress(performSync)

  const [searchTerm, setSearchTerm] = useState('')
  const [openOverlayCardId, setOpenOverlayCardId] = useState(null)
  const gridRef = useRef(null)
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY || document.documentElement.scrollTop
      const viewport = window.innerHeight || document.documentElement.clientHeight
      const full = document.documentElement.scrollHeight
      // Afficher uniquement quand on a réellement défilé ET qu'on est proche du bas
      setShowBackToTop(scrolled > 200 && (scrolled + viewport >= full - 150))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Écouter l'événement de rechargement des données
  useEffect(() => {
    const handleRefreshData = async () => {
      console.log('🔄 Rechargement des données demandé')
      console.log('📊 Articles avant rechargement:', articles.length)
      
      // Invalider les queries pour forcer le rechargement
      await queryClient.invalidateQueries(['all-orders'])
      await queryClient.invalidateQueries(['db-orders'])
      await queryClient.invalidateQueries(['production-statuses'])
      
      console.log('✅ Queries invalidées')
      
      // Aussi appeler refetch pour être sûr
      try {
        const result = await refetch()
        console.log('📈 Refetch terminé:', result)
      } catch (error) {
        console.error('❌ Erreur lors du refetch:', error)
      }
    }
    window.addEventListener('mc-refresh-data', handleRefreshData)
    return () => window.removeEventListener('mc-refresh-data', handleRefreshData)
  }, [refetch, queryClient, articles.length])



  // Calculer le nombre d'articles filtrés
  const filteredArticlesCount = useMemo(() => {
    if (!searchTerm || searchTerm.trim() === '') {
      return totalArticles
    }
    
    const term = searchTerm.toLowerCase().trim()
    return articles.filter(article => 
      `${article.orderNumber}`.toLowerCase().includes(term) ||
      (article.customer || '').toLowerCase().includes(term) ||
      (article.product_name || '').toLowerCase().includes(term)
    ).length
  }, [articles, searchTerm, totalArticles])

  // Gérer l'ouverture des overlays
  const handleOverlayOpen = (cardId) => {
    setOpenOverlayCardId(prevId => prevId === cardId ? null : cardId)
  }

  // Fonction pour extraire la taille d'un article
  const getArticleSize = (metaData) => {
    if (!metaData || !Array.isArray(metaData)) return null
    
    // Recherche exhaustive de toutes les variantes de taille
    const sizeMeta = metaData.find(meta => 
      meta.key && (
        meta.key.toLowerCase().includes('taille') ||
        meta.key.toLowerCase().includes('size') ||
        meta.key.toLowerCase().includes('dimension') ||
        meta.key.toLowerCase().includes('pa_taille') ||
        meta.key.toLowerCase().includes('attribute_pa_taille') ||
        meta.key.toLowerCase().includes('_taille') ||
        meta.key.toLowerCase().includes('_size') ||
        meta.key === 'taille' ||
        meta.key === 'size' ||
        meta.key === 'pa_taille'
      )
    )
    
    if (sizeMeta && sizeMeta.value) {
      const cleanValue = sizeMeta.value.trim()
      return cleanValue || null
    }
    
    return null
  }

  // Fonction pour extraire la couleur d'un article
  const getArticleColor = (metaData) => {
    if (!metaData || !Array.isArray(metaData)) return null
    
    // Recherche exhaustive de toutes les variantes de couleur
    const colorMeta = metaData.find(meta => 
      meta.key && (
        meta.key.toLowerCase().includes('couleur') ||
        meta.key.toLowerCase().includes('color') ||
        meta.key.toLowerCase().includes('colour') ||
        meta.key.toLowerCase().includes('pa_couleur') ||
        meta.key.toLowerCase().includes('attribute_pa_couleur') ||
        meta.key.toLowerCase().includes('_couleur') ||
        meta.key.toLowerCase().includes('_color') ||
        meta.key === 'couleur' ||
        meta.key === 'color' ||
        meta.key === 'pa_couleur' ||
        meta.key === 'attribute_pa_couleur'
      )
    )
    
    if (colorMeta && colorMeta.value) {
      const cleanValue = colorMeta.value.trim()
      return cleanValue || null
    }
    
    return null
  }

  // Fonction pour extraire les options d'un article
  const getArticleOptions = (metaData) => {
    if (!metaData || !Array.isArray(metaData)) return 'Aucune'
    
    const options = metaData
      .filter(meta => 
        meta.key && 
        !meta.key.toLowerCase().includes('taille') && 
        !meta.key.toLowerCase().includes('size') &&
        !meta.key.toLowerCase().includes('couleur') &&
        !meta.key.toLowerCase().includes('color') &&
        meta.key !== '_qty' &&
        meta.key !== '_tax_class' &&
        meta.key !== '_product_id' &&
        meta.key !== '_variation_id' &&
        meta.key !== '_line_subtotal' &&
        meta.key !== '_line_subtotal_tax' &&
        meta.key !== '_line_total' &&
        meta.key !== '_line_tax' &&
        meta.key !== '_line_tax_data' &&
        meta.key !== '_reduced_stock'
      )
      .map(meta => `${meta.key}: ${meta.value}`)
      .join(', ')
    
    return options || 'Aucune'
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="text-red-800">
            <p className="font-medium">Erreur lors du chargement des commandes</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Popup de progression de synchronisation */}
      <SyncProgress syncProgress={syncProgress} syncLogs={syncLogs} />

      {/* En-tête avec titre et recherche */}
      <OrderHeader 
        selectedType={propSelectedType}
        filteredArticlesCount={filteredArticlesCount}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onGoToEnd={() => gridRef.current && gridRef.current.goToEnd && gridRef.current.goToEnd()}
      />

      {/* Grille avec scroll infini - chargement progressif par 30 */}
      <InfiniteScrollGrid 
        ref={gridRef}
        allArticles={articles}
        getArticleSize={getArticleSize}
        getArticleColor={getArticleColor}
        getArticleOptions={getArticleOptions}
        handleOverlayOpen={handleOverlayOpen}
        openOverlayCardId={openOverlayCardId}
        searchTerm={searchTerm}
        productionType={propSelectedType}
      />

      {/* Préchargeur d'images en arrière-plan */}
      <ImagePreloader 
        articles={articles}
        onPreloadComplete={() => {}}
      />

      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 rounded-full bg-[var(--rose-clair-text)] text-white shadow-lg px-4 py-3 hover:opacity-90 cursor-pointer"
          aria-label="Retour en haut"
          title="Retour en haut"
        >
          ↑ Retour vers le haut
        </button>
      )}
    </div>
  )
}

export default OrderList
