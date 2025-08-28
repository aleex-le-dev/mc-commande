import { useState, useEffect, useMemo, useCallback } from 'react'

// Hook personnalisé pour gérer le filtrage des commandes
export const useOrderFilters = (propSelectedType, allArticles) => {
  const [selectedType, setSelectedType] = useState(propSelectedType || 'all')
  const [searchTerm, setSearchTerm] = useState('')

  // Mettre à jour le selectedType local quand la prop change
  useEffect(() => {
    if (propSelectedType) {
      setSelectedType(propSelectedType)
    }
  }, [propSelectedType])

  // Filtrer les articles
  const filteredArticles = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    
    return allArticles.filter(article => {
      const typeMatch = selectedType === 'all' || article.productionType === selectedType
      if (!typeMatch) return false
      if (!term) return true
      return (
        `${article.orderNumber}`.toLowerCase().includes(term) ||
        (article.customer || '').toLowerCase().includes(term) ||
        (article.product_name || '').toLowerCase().includes(term)
      )
    })
  }, [allArticles, selectedType, searchTerm])

  // Gérer l'ouverture des overlays (un seul à la fois)
  const [openOverlayCardId, setOpenOverlayCardId] = useState(null)

  const handleOverlayOpen = useCallback((cardId) => {
    setOpenOverlayCardId(prevId => prevId === cardId ? null : cardId)
  }, [])

  // Fermer l'overlay au clic ailleurs
  const handleClickOutside = useCallback(() => {
    setOpenOverlayCardId(null)
  }, [])

  return {
    selectedType,
    setSelectedType,
    searchTerm,
    setSearchTerm,
    filteredArticles,
    openOverlayCardId,
    handleOverlayOpen,
    handleClickOutside
  }
}
