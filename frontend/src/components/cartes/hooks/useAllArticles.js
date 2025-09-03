import React, { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getOrdersFromDatabase, getOrdersByProductionType } from '../../../services/mongodbService'

export const useAllArticles = (selectedType = 'all') => {
  const queryClient = useQueryClient()
  // Récupérer les commandes selon le filtre actif (all ou par type)
  const { 
    data: dbOrders, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['all-orders', selectedType],
    queryFn: async () => {
      try {
        if (selectedType && selectedType !== 'all') {
          return await getOrdersByProductionType(selectedType)
        }
        return await getOrdersFromDatabase()
      } catch (error) {
        // Gérer les erreurs d'annulation silencieusement
        if (error?.name === 'AbortError' || error?.message === 'RequestAborted') {
          throw new Error('RequestAborted')
        }
        throw error
      }
    },
    staleTime: 900000, // 15 minutes
    gcTime: 1800000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 2, // Réduit de 3 à 2
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponentiel
    retryOnMount: false,
    keepPreviousData: true,
    // Éviter les requêtes simultanées
    networkMode: 'online',
    onError: (err) => {
      if (err?.message === 'RequestAborted' || err?.name === 'AbortError') {
        return // Ignorer silencieusement
      }
      console.error('Erreur useAllArticles:', err)
    }
  })

  // Toujours précharger les données pour les comptages cross-type
  const { data: allOrdersUnfiltered } = useQuery({
    queryKey: ['all-orders-unfiltered'],
    queryFn: async () => {
      try {
        return await getOrdersFromDatabase()
      } catch (error) {
        if (error?.name === 'AbortError' || error?.message === 'RequestAborted') {
          throw new Error('RequestAborted')
        }
        throw error
      }
    },
    staleTime: 900000, // 15 minutes
    gcTime: 1800000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    retryOnMount: false,
    keepPreviousData: true,
    networkMode: 'online',
    enabled: true,
    onError: (err) => {
      if (err?.message === 'RequestAborted' || err?.name === 'AbortError') {
        return
      }
      console.error('Erreur allOrdersUnfiltered:', err)
    }
  })

  // Charger explicitement les commandes par types principaux pour un comptage global cross-type fiable
  const { data: coutureOrders } = useQuery({
    queryKey: ['orders-by-type', 'couture'],
    queryFn: async () => {
      try {
        return await getOrdersByProductionType('couture')
      } catch (error) {
        if (error?.name === 'AbortError' || error?.message === 'RequestAborted') {
          throw new Error('RequestAborted')
        }
        throw error
      }
    },
    staleTime: 900000, // 15 minutes
    gcTime: 1800000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    retryOnMount: false,
    keepPreviousData: true,
    networkMode: 'online',
    enabled: true,
    onError: (err) => {
      if (err?.message === 'RequestAborted' || err?.name === 'AbortError') {
        return
      }
      console.error('Erreur coutureOrders:', err)
    }
  })

  const { data: mailleOrders } = useQuery({
    queryKey: ['orders-by-type', 'maille'],
    queryFn: async () => {
      try {
        return await getOrdersByProductionType('maille')
      } catch (error) {
        if (error?.name === 'AbortError' || error?.message === 'RequestAborted') {
          throw new Error('RequestAborted')
        }
        throw error
      }
    },
    staleTime: 900000, // 15 minutes
    gcTime: 1800000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    retryOnMount: false,
    keepPreviousData: true,
    networkMode: 'online',
    enabled: true,
    onError: (err) => {
      if (err?.message === 'RequestAborted' || err?.name === 'AbortError') {
        return
      }
      console.error('Erreur mailleOrders:', err)
    }
  })

  // Préparer les articles avec statuts
  const articles = useMemo(() => {
    // Si pas de données principales, retourner un tableau vide
    if (!dbOrders || dbOrders.length === 0) {
      return []
    }
    
    // Attendre que les données de comptage soient disponibles
    const hasCountingData = allOrdersUnfiltered || coutureOrders || mailleOrders
    if (!hasCountingData) {
      return []
    }
    

    

    


    // Construire les groupes complets par order_number
    const allByNumber = {}
    let unionOrders = []
    
    // Toujours utiliser l'union de tous les datasets pour avoir TOUS les articles
    // Cela permet de voir tous les articles d'une commande même quand on filtre par type
    unionOrders = [
      ...(Array.isArray(dbOrders) ? dbOrders : []),
      ...(Array.isArray(allOrdersUnfiltered) ? allOrdersUnfiltered : []),
      ...(Array.isArray(coutureOrders) ? coutureOrders : []),
      ...(Array.isArray(mailleOrders) ? mailleOrders : []),
    ]
    
    // Dédupliquer par line_item_id pour éviter les doublons
    const uniqueOrders = []
    const seenLineItems = new Set()
    
    unionOrders.forEach(order => {
      const lineItemId = order.items?.[0]?.line_item_id
      if (lineItemId && !seenLineItems.has(lineItemId)) {
        seenLineItems.add(lineItemId)
        uniqueOrders.push(order)
      }
    })
    
    unionOrders = uniqueOrders

    unionOrders.forEach((order) => {
      if (!order) return
      const key = order.order_number
      if (!allByNumber[key]) {
        allByNumber[key] = []
      }
      allByNumber[key].push(order)
    })
    

    


    // Construire les groupes pour l'affichage selon le filtre sélectionné
    const ordersByNumber = {}
    // Toujours utiliser allByNumber pour les comptages car il contient TOUS les articles
    const sourceForCounts = allByNumber
    
    // Filtrer les articles selon le type sélectionné pour l'affichage
    const filteredOrders = selectedType === 'all' ? dbOrders : 
      dbOrders.filter(order => order.items?.[0]?.production_status?.production_type === selectedType)
    
    filteredOrders.forEach((order) => {
      if (!ordersByNumber[order.order_number]) {
        ordersByNumber[order.order_number] = []
      }
      ordersByNumber[order.order_number].push(order)
    })
    

    
    const articles = []
    Object.entries(ordersByNumber).forEach(([orderNumber, orders]) => {
      const fullOrders = sourceForCounts[orderNumber] || orders
      const totalItems = fullOrders.length
      
      // Log pour la commande 391045 en maille
      if (orderNumber === '391045') {
        const mailleItems = fullOrders.filter(order => 
          order.items?.[0]?.production_status?.production_type === 'maille'
        )
        const coutureItems = fullOrders.filter(order => 
          order.items?.[0]?.production_status?.production_type === 'couture'
        )
        
        console.log(`📊 COMMANDE 391045: ${totalItems} articles total`)
        console.log(`📦 MAILLE: ${mailleItems.length} articles`)
        console.log(`🧵 COUTURE: ${coutureItems.length} articles`)
        console.log('')
        
        mailleItems.forEach((order, index) => {
          const status = order.items?.[0]?.production_status?.status || 'a_faire'
          console.log(`📦 Maille ${index + 1}: ${status}`)
        })
        
        coutureItems.forEach((order, index) => {
          const status = order.items?.[0]?.production_status?.status || 'a_faire'
          console.log(`🧵 Couture ${index + 1}: ${status}`)
        })
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
    error: error && !(error.name === 'AbortError' || error.message === 'RequestAborted' || error.message?.includes('AbortError')) ? error : null,
    refetch,
    totalArticles: articles.length
  }
}
