import { useState, useEffect, useMemo } from 'react'

export const usePagination = (items, defaultItemsPerPage = 15) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage)
  
  // Réinitialiser la page courante quand les items changent
  useEffect(() => {
    setCurrentPage(1)
  }, [items.length])
  
  // Calculer la pagination
  const pagination = useMemo(() => {
    const totalItems = items.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    
    return {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      startIndex,
      endIndex,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    }
  }, [items.length, currentPage, itemsPerPage])
  
  // Obtenir les items de la page courante
  const currentItems = useMemo(() => {
    return items.slice(pagination.startIndex, pagination.endIndex)
  }, [items, pagination.startIndex, pagination.endIndex])
  
  // Changer de page
  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page)
    }
  }
  
  // Page suivante
  const nextPage = () => {
    if (pagination.hasNext) {
      setCurrentPage(currentPage + 1)
    }
  }
  
  // Page précédente
  const prevPage = () => {
    if (pagination.hasPrev) {
      setCurrentPage(currentPage - 1)
    }
  }
  
  // Aller à la première page
  const goToFirst = () => setCurrentPage(1)
  
  // Aller à la dernière page
  const goToLast = () => setCurrentPage(pagination.totalPages)
  
  // Changer le nombre d'items par page
  const changeItemsPerPage = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Retourner à la première page
  }
  
  return {
    // Données de pagination
    pagination,
    currentItems,
    
    // Actions de navigation
    goToPage,
    nextPage,
    prevPage,
    goToFirst,
    goToLast,
    changeItemsPerPage,
    
    // État
    currentPage,
    itemsPerPage
  }
}
