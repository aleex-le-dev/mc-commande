/**
 * Hook pour récupérer les statuts de production et leurs notes
 */
import { useState, useEffect, useCallback } from 'react'
import { getApiUrl } from '../config/api'

export const useProductionStatus = () => {
  const [productionStatuses, setProductionStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProductionStatuses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(getApiUrl('production/status'))
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setProductionStatuses(data.statuses || [])
    } catch (err) {
      console.error('Erreur récupération statuts production:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProductionStatuses()
  }, [fetchProductionStatuses])

  // Écouter les événements de rechargement des données
  useEffect(() => {
    const handleRefreshData = () => {
      console.log('🔄 useProductionStatus - Rechargement des statuts de production...')
      fetchProductionStatuses()
    }
    
    window.addEventListener('mc-refresh-data', handleRefreshData)
    return () => {
      window.removeEventListener('mc-refresh-data', handleRefreshData)
    }
  }, [fetchProductionStatuses])

  const getProductionStatusByArticle = useCallback((orderId, lineItemId) => {
    return productionStatuses.find(
      status => status.order_id === orderId && status.line_item_id === lineItemId
    )
  }, [productionStatuses])

  const getNotesByArticle = useCallback((orderId, lineItemId) => {
    const status = getProductionStatusByArticle(orderId, lineItemId)
    return status?.notes || ''
  }, [getProductionStatusByArticle])

  return {
    productionStatuses,
    loading,
    error,
    getProductionStatusByArticle,
    getNotesByArticle,
    refetch: fetchProductionStatuses
  }
}

export default useProductionStatus
