import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getOrdersFromDatabase, getOrdersByProductionType } from '../../../services/mongodbService'

export const useAllArticles = (selectedType = 'all') => {
  // Récupérer les commandes selon le filtre actif (all ou par type)
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

  // Récupérer TOUTES les commandes sans filtre pour calculer les totaux/indices par commande
  const { data: allOrdersUnfiltered } = useQuery({
    queryKey: ['all-orders-unfiltered'],
    queryFn: () => getOrdersFromDatabase(),
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 3,
    retryDelay: 1000,
    retryOnMount: false,
    keepPreviousData: true,
  })

  // Charger explicitement les commandes par types principaux pour un comptage global cross-type fiable
  const { data: coutureOrders } = useQuery({
    queryKey: ['orders-by-type', 'couture'],
    queryFn: () => getOrdersByProductionType('couture'),
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 3,
    retryDelay: 1000,
    retryOnMount: false,
    keepPreviousData: true,
  })

  const { data: mailleOrders } = useQuery({
    queryKey: ['orders-by-type', 'maille'],
    queryFn: () => getOrdersByProductionType('maille'),
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 3,
    retryDelay: 1000,
    retryOnMount: false,
    keepPreviousData: true,
  })

  // Préparer les articles avec statuts
  const articles = useMemo(() => {
    // Si pas de données, retourner un tableau vide
    if (!dbOrders || dbOrders.length === 0) {
      return []
    }
    
    try {
      // Log d'état des datasets
      console.log('[useAllArticles] dataset', {
        selectedType,
        dbOrdersCount: Array.isArray(dbOrders) ? dbOrders.length : 0,
        allOrdersUnfilteredCount: Array.isArray(allOrdersUnfiltered) ? allOrdersUnfiltered.length : 0,
      })
    } catch {}

    // Construire les groupes complets par order_number à partir de l'union des datasets (non filtré + par types)
    const allByNumber = {}
    const unionOrders = [
      ...(Array.isArray(allOrdersUnfiltered) ? allOrdersUnfiltered : []),
      ...(Array.isArray(coutureOrders) ? coutureOrders : []),
      ...(Array.isArray(mailleOrders) ? mailleOrders : []),
    ]

    unionOrders.forEach((order) => {
      if (!order) return
      const key = order.order_number
      if (!allByNumber[key]) {
        allByNumber[key] = []
      }
      // Éviter les doublons par line_item_id
      const incomingLineItemId = order?.items?.[0]?.line_item_id
      const exists = allByNumber[key].some(o => o?.items?.[0]?.line_item_id === incomingLineItemId)
      if (!exists) {
        allByNumber[key].push(order)
      }
    })

    // Fallback: si pas de dataset complet disponible, utiliser uniquement les données actuelles
    const ordersByNumber = {}
    const sourceForCounts = Object.keys(allByNumber).length > 0 ? allByNumber : ordersByNumber
    dbOrders.forEach((order) => {
      if (!ordersByNumber[order.order_number]) {
        ordersByNumber[order.order_number] = []
      }
      ordersByNumber[order.order_number].push(order)
      // S'assurer que le map des counts contient bien l'entrée
      if (!sourceForCounts[order.order_number]) {
        sourceForCounts[order.order_number] = ordersByNumber[order.order_number]
      }
    })
    
    const articles = []
    Object.entries(ordersByNumber).forEach(([orderNumber, orders]) => {
      const fullOrders = sourceForCounts[orderNumber] || orders
      const totalItems = fullOrders.length

      // Logs ciblés pour la commande 391045
      if (`${orderNumber}` === '391045') {
        try {
          const fullLineItems = fullOrders.map(o => o.items?.[0]?.line_item_id).filter(Boolean)
          const filteredLineItems = orders.map(o => o.items?.[0]?.line_item_id).filter(Boolean)
          console.log('[useAllArticles] 391045 group', {
            filteredCount: orders.length,
            fullCount: fullOrders.length,
            filteredLineItems,
            fullLineItems,
          })
        } catch {}
      }

      // Déterminer l'ordre d'indexation global dans la commande en s'appuyant sur la position dans fullOrders
      // On utilise la correspondance par line_item_id pour retrouver l'index global
      orders.forEach((order) => {
        const item = order.items?.[0]
        if (item) {
          const globalIndex = fullOrders.findIndex((o) => {
            const li = o.items?.[0]
            return li && item && li.line_item_id === item.line_item_id
          })
          const itemIndex = globalIndex >= 0 ? (globalIndex + 1) : (orders.indexOf(order) + 1)

          if (`${orderNumber}` === '391045') {
            try {
              console.log('[useAllArticles] 391045 item', {
                line_item_id: item.line_item_id,
                computedGlobalIndex: globalIndex,
                itemIndex,
                totalItems,
                productionType: item.production_status?.production_type || 'couture'
              })
            } catch {}
          }

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
            // Comptage global par commande (cross type)
            itemIndex,
            totalItems
          })
        }
      })
    })
    
    // Trier les articles par date de commande (plus ancien en premier)
    const sortedArticles = articles.sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate))
    
    // Exposer les articles globalement pour le menu contextuel
    if (typeof window !== 'undefined') {
      window.mcAllArticles = sortedArticles
    }
    
    return sortedArticles
  }, [dbOrders, selectedType, allOrdersUnfiltered, coutureOrders, mailleOrders])

  return {
    articles,
    isLoading,
    error,
    refetch,
    totalArticles: articles.length
  }
}
