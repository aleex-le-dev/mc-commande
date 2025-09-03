import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getOrdersFromDatabase, getOrdersByProductionType } from '../../../services/mongodbService'
import { useMemo, useCallback, useEffect } from 'react'

/**
 * Hook simplifié pour gérer tous les articles
 */
export const useUnifiedArticles = (selectedType = 'all') => {
  const queryClient = useQueryClient()

  // Récupérer TOUTES les commandes depuis la BDD (avec synchronisation automatique)
  const { data: allOrders, isLoading, error } = useQuery({
    queryKey: ['unified-orders'],
    queryFn: getOrdersFromDatabase,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2
  })

  // Transformer en articles
  const articles = useMemo(() => {
    if (!allOrders) return []
    
    const articlesList = []
    allOrders.forEach(order => {
      const orderItems = order.items || []
      orderItems.forEach((item, index) => {
        const productionType = item.production_status?.production_type || 'couture'
        const status = item.production_status?.status || 'a_faire'
        
        articlesList.push({
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
          productionType: productionType,
          status: status,
          isDispatched: status !== 'a_faire',
          // Ajouter les informations de position dans la commande
          itemIndex: index + 1,
          totalItems: orderItems.length
        })
      })
    })
    
    return articlesList
  }, [allOrders])

  // Filtrer par type
  const filteredArticles = useMemo(() => {
    return selectedType === 'all' ? articles : articles.filter(article => article.productionType === selectedType)
  }, [articles, selectedType])

  // Regrouper par commande pour Terminé (utilise TOUS les articles)
  const ordersByNumber = useMemo(() => {
    const grouped = {}
    
    // Toujours utiliser TOUS les articles pour calculer les bons ratios
    articles.forEach(article => {
      const key = article.orderNumber
      if (!grouped[key]) {
        grouped[key] = {
          orderNumber: key,
          orderId: article.orderId,
          customer: article.customer,
          orderDate: article.orderDate,
          items: []
        }
      }
      grouped[key].items.push(article)
    })

    return Object.values(grouped).map(order => {
      const total = order.items.length
      const finished = order.items.filter(item => item.status === 'termine').length
      const remaining = order.items.filter(item => item.status !== 'termine')
      return {
        ...order,
        total,
        finished,
        remaining,
        isReadyToShip: total > 0 && finished === total
      }
    })
  }, [articles])

  // Mise à jour temps réel
  const updateArticleStatus = useCallback((orderId, lineItemId, newStatus) => {
    queryClient.setQueryData(['unified-orders'], (oldData) => {
      if (!oldData) return oldData
      return oldData.map(order => {
        if (order.order_id === orderId) {
          return {
            ...order,
            items: order.items.map(item => {
              if (item.line_item_id === lineItemId) {
                return {
                  ...item,
                  production_status: { ...item.production_status, status: newStatus }
                }
              }
              return item
            })
          }
        }
        return order
      })
    })
  }, [queryClient])

  // Écouter les mises à jour
  useEffect(() => {
    const handleStatusUpdate = (event) => {
      const { orderId, lineItemId, status } = event.detail
      updateArticleStatus(orderId, lineItemId, status)
    }
    window.addEventListener('mc-article-status-updated', handleStatusUpdate)
    return () => window.removeEventListener('mc-article-status-updated', handleStatusUpdate)
  }, [updateArticleStatus])

  return {
    articles: filteredArticles,
    allArticles: articles,
    ordersByNumber,
    isLoading,
    error: error && !(error.name === 'AbortError' || error.message === 'RequestAborted') ? error : null,
    totalArticles: filteredArticles.length
  }
}
