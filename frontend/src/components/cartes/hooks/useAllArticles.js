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
    
    // Grouper les commandes par order_number pour calculer le totalItems correct
    const ordersByNumber = {}
    dbOrders.forEach((order) => {
      if (!ordersByNumber[order.order_number]) {
        ordersByNumber[order.order_number] = []
      }
      ordersByNumber[order.order_number].push(order)
    })
    
    const articles = []
    Object.entries(ordersByNumber).forEach(([orderNumber, orders]) => {
      const totalItems = orders.length // Nombre total d'articles pour cette commande
      
      orders.forEach((order, index) => {
        const item = order.items?.[0] // Chaque commande n'a qu'un seul article
        if (item) {
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
            isDispatched: item.production_status && item.production_status.status !== 'a_faire',
            // Ajouter les informations de comptage par commande
            itemIndex: index + 1, // Position de l'article dans la commande (1, 2, 3...)
            totalItems: totalItems // Nombre total d'articles dans la commande
          })
        }
      })
    })
    
    // Trier les articles par date de commande (plus ancien en premier)
    const sortedArticles = articles.sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate))
    

    
    return sortedArticles
  }, [dbOrders, selectedType])

  return {
    articles,
    isLoading,
    error,
    refetch,
    totalArticles: articles.length
  }
}
