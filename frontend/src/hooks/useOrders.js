/**
 * Hook personnalisé pour la gestion des commandes avec pagination
 * Utilise les nouveaux services optimisés
 */
import { useState, useEffect, useCallback } from 'react'
import OrdersService from '../services/ordersService.js'

export const useOrders = (options = {}) => {
  const {
    page = 1,
    limit = 15,
    status = 'all',
    search = '',
    sortBy = 'order_date',
    sortOrder = 'desc'
  } = options

  const [data, setData] = useState({
    orders: [],
    pagination: {
      page: 1,
      limit: 15,
      total: 0,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await OrdersService.getOrders({
        page,
        limit,
        status,
        search,
        sortBy,
        sortOrder
      })

      setData(result)
    } catch (err) {
      console.error('Erreur chargement commandes:', err)
      setError(err)
      
      // Fallback: mode offline
      const offlineData = OrdersService.getOfflineOrders({
        page,
        limit,
        status
      })
      setData(offlineData)
    } finally {
      setLoading(false)
    }
  }, [page, limit, status, search, sortBy, sortOrder])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const refetch = useCallback(() => {
    fetchOrders()
  }, [fetchOrders])

  const goToPage = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= data.pagination.totalPages) {
      // Le changement de page sera géré par le useEffect
      // via le changement de la prop page
    }
  }, [data.pagination.totalPages])

  const nextPage = useCallback(() => {
    if (data.pagination.hasNext) {
      goToPage(data.pagination.page + 1)
    }
  }, [data.pagination.hasNext, data.pagination.page, goToPage])

  const prevPage = useCallback(() => {
    if (data.pagination.hasPrev) {
      goToPage(data.pagination.page - 1)
    }
  }, [data.pagination.hasPrev, data.pagination.page, goToPage])

  return {
    ...data,
    loading,
    error,
    refetch,
    goToPage,
    nextPage,
    prevPage
  }
}

export default useOrders
