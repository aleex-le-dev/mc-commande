import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getOrdersPaginated } from '../../../services/mongodbService'

export const useServerPagination = (selectedType = 'all', searchTerm = '') => {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const queryClient = useQueryClient()
  
  // Clé de requête unique pour chaque combinaison de filtres
  const queryKey = ['orders-paginated', selectedType, searchTerm, currentPage, itemsPerPage]
  
  // Requête avec pagination côté serveur
  const { 
    data, 
    isLoading, 
    error, 
    isFetching,
    refetch 
  } = useQuery({
    queryKey,
    queryFn: () => getOrdersPaginated(currentPage, itemsPerPage, selectedType, searchTerm),
    staleTime: 10000, // 10 secondes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    keepPreviousData: true, // Garder les données précédentes pendant le chargement
  })
  
  // Extraire les données
  const orders = data?.orders || []
  const pagination = data?.pagination || { page: 1, limit: 15, total: 0, pages: 1 }
  
  // Préparer les articles avec statuts
  const articles = useMemo(() => {
    if (!orders || orders.length === 0) return []
    
    const articles = []
    orders.forEach((order) => {
      order.items?.forEach((item) => {
        articles.push({
          ...item,
          orderId: order.order_id,
          orderNumber: order.order_number,
          orderDate: order.order_date,
          customer: order.customer_name,
          customerEmail: order.customer_email,
          customerPhone: order.customer_phone,
          customerAddress: order.customer_address,
          customerNote: order.customer_note,
          shippingMethod: order.shipping_title || order.shipping_method_title || order.shipping_method || 'Livraison gratuite',
          shippingCarrier: order.shipping_carrier || null,
          customerCountry: order.customer_country || null,
          permalink: item.permalink,
          productionType: item.production_status?.production_type || 'couture',
          status: item.production_status?.status || 'a_faire',
          assigned_to: item.production_status?.assigned_to || null,
          isDispatched: item.production_status && item.production_status.status !== 'a_faire'
        })
      })
    })
    
    return articles
  }, [orders])
  
  // Navigation des pages
  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= pagination.pages) {
      setCurrentPage(page)
      // Scroll vers le haut pour une meilleure UX
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [pagination.pages])
  
  const nextPage = useCallback(() => {
    if (pagination.hasNext) {
      goToPage(currentPage + 1)
    }
  }, [currentPage, pagination.hasNext, goToPage])
  
  const prevPage = useCallback(() => {
    if (pagination.hasPrev) {
      goToPage(currentPage - 1)
    }
  }, [currentPage, pagination.hasPrev, goToPage])
  
  const goToFirst = useCallback(() => goToPage(1), [goToPage])
  const goToLast = useCallback(() => goToPage(pagination.pages), [goToPage, pagination.pages])
  
  // Changer le nombre d'items par page
  const changeItemsPerPage = useCallback((newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Retourner à la première page
  }, [])
  
  // Précharger la page suivante pour une navigation fluide
  useEffect(() => {
    if (pagination.hasNext) {
      const nextPage = currentPage + 1
      queryClient.prefetchQuery({
        queryKey: ['orders-paginated', selectedType, searchTerm, nextPage, itemsPerPage],
        queryFn: () => getOrdersPaginated(nextPage, itemsPerPage, selectedType, searchTerm),
        staleTime: 10000
      })
    }
  }, [currentPage, pagination.hasNext, selectedType, searchTerm, itemsPerPage, queryClient])
  
  // Précharger la page précédente
  useEffect(() => {
    if (pagination.hasPrev) {
      const prevPage = currentPage - 1
      queryClient.prefetchQuery({
        queryKey: ['orders-paginated', selectedType, searchTerm, prevPage, itemsPerPage],
        queryFn: () => getOrdersPaginated(prevPage, itemsPerPage, selectedType, searchTerm),
        staleTime: 10000
      })
    }
  }, [currentPage, pagination.hasPrev, selectedType, searchTerm, itemsPerPage, queryClient])
  
  return {
    // Données
    articles,
    orders,
    pagination,
    
    // État de chargement
    isLoading,
    isFetching,
    error,
    
    // Actions de navigation
    goToPage,
    nextPage,
    prevPage,
    goToFirst,
    goToLast,
    changeItemsPerPage,
    
    // État actuel
    currentPage,
    itemsPerPage,
    
    // Utilitaires
    refetch,
    hasNext: pagination.hasNext,
    hasPrev: pagination.hasPrev,
    totalItems: pagination.total,
    totalPages: pagination.pages
  }
}
