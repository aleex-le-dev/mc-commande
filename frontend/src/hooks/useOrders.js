/**
 * Hook personnalisé pour la gestion des commandes avec pagination
 * Utilise les nouveaux services optimisés
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { ApiService } from '../services/apiService.js'
import { logger } from '../utils/logger'

export const useOrders = (options = {}) => {
  const {
    page = 1,
    limit = 15,
    status = 'all',
    search = '',
    sortBy = 'order_date',
    sortOrder = 'desc',
    productionType = 'all'
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
    },
    stats: null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isFetching, setIsFetching] = useState(false)

  const fetchOrders = useCallback(async (force = false) => {
    // Éviter les requêtes multiples sauf si forcé
    if (isFetching && !force) {
      return
    }
    
    logger.service.start('Chargement commandes')
    setIsFetching(true)
    setLoading(true)
    setError(null)

    try {
      const result = await ApiService.orders.getOrdersPaginated(
        page,
        limit,
        status,
        search,
        sortBy,
        sortOrder,
        productionType
      )

      setData(result)
      logger.service.success('Chargement commandes')
      if (import.meta.env.DEV) {
      }
    } catch (err) {
      logger.service.error('Chargement commandes', err)
      setError(err)
      
      // Fallback: mode offline avec pagination
      try {
        const offlineData = await ApiService.orders.getOrdersFromDatabase(page, limit)
        setData(offlineData)
      } catch (offlineErr) {
        logger.service.error('Fallback offline', offlineErr)
      }
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }, [page, limit, status, search, sortBy, sortOrder, productionType, isFetching])

  useEffect(() => {
    // OPTIMISATION: Délai pour éviter les appels multiples avec cleanup
    const timeoutId = setTimeout(() => {
      fetchOrders()
    }, 100)
    
    return () => clearTimeout(timeoutId) // ✅ Cleanup déjà présent
  }, [page, limit, status, search, sortBy, sortOrder, productionType])

  // Rafraîchir les filtres et compteurs après changement de statut/assignation
  useEffect(() => {
    const onDataUpdated = () => fetchOrders(true)
    window.addEventListener('mc-assignment-updated', onDataUpdated)
    window.addEventListener('mc-refresh-data', onDataUpdated)
    window.addEventListener('mc-data-updated', onDataUpdated)
    return () => {
      window.removeEventListener('mc-assignment-updated', onDataUpdated)
      window.removeEventListener('mc-refresh-data', onDataUpdated)
      window.removeEventListener('mc-data-updated', onDataUpdated)
    }
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
