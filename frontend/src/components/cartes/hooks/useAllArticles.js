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
    staleTime: 300000, // 5 minutes (augmenté)
    gcTime: 600000, // 10 minutes (anciennement cacheTime)
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Ne pas refetch au montage
    retry: 3,
    retryDelay: 1000,
    // Empêcher l'annulation des requêtes
    retryOnMount: false,
    // Garder les données même en cas d'erreur
    keepPreviousData: true,
    onError: (err) => {
      // Ignorer proprement les annulations pour ne pas afficher d'erreur utilisateur
      if (err && err.name === 'AbortError') {
        return
      }
    }
  })

  // Préparer les articles avec statuts
  const articles = useMemo(() => {
    // Si pas de données, retourner un tableau vide
    if (!dbOrders || dbOrders.length === 0) {
      return []
    }
    
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
  }, [dbOrders, selectedType])

  return {
    articles,
    isLoading,
    error,
    refetch,
    totalArticles: articles.length
  }
}
