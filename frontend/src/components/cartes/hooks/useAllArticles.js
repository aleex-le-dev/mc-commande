import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getOrdersFromDatabase, getOrdersByProductionType } from '../../../services/mongodbService'

export const useAllArticles = (selectedType = 'all') => {
  // Récupérer toutes les commandes
  const { 
    data: dbOrders, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['all-orders', selectedType],
    queryFn: () => {
      if (selectedType && selectedType !== 'all') {
        return getOrdersByProductionType(selectedType)
      }
      return getOrdersFromDatabase()
    },
    staleTime: 30000, // 30 secondes
    refetchOnWindowFocus: false,
  })

  // Préparer les articles avec statuts
  const articles = useMemo(() => {
    if (!dbOrders || dbOrders.length === 0) return []
    
    const articles = []
    dbOrders.forEach((order) => {
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
          isDispatched: item.production_status && item.production_status.status !== 'a_faire'
        })
      })
    })
    
    return articles
  }, [dbOrders])

  return {
    articles,
    isLoading,
    error,
    refetch,
    totalArticles: articles.length
  }
}
