import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useCallback } from 'react'
import { 
  getProductionStatuses, 
  syncOrders,
  getOrdersFromDatabase,
  getOrdersByProductionType,
  getSyncLogs
} from '../../../services/mongodbService'

// Hook personnalisé pour gérer les données des commandes
export const useOrderData = (selectedType, propSelectedType) => {
  const queryClient = useQueryClient()

  // Récupérer les statuts de production
  const { data: productionStatuses, isLoading: statusesLoading } = useQuery({
    queryKey: ['production-statuses'],
    queryFn: getProductionStatuses,
    refetchInterval: 10000,
    staleTime: 5000
  })

  // Récupérer les commandes depuis la base de données
  const { data: dbOrders, isLoading: dbOrdersLoading, error: dbOrdersError } = useQuery({
    queryKey: ['db-orders', selectedType],
    queryFn: () => {
      if (propSelectedType && propSelectedType !== 'all') {
        return getOrdersByProductionType(propSelectedType)
      }
      return getOrdersFromDatabase()
    },
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
    staleTime: 10000,
  })

  // Fonction pour déterminer le type de production
  const getProductionType = useCallback((productName) => {
    const name = productName.toLowerCase()
    
    const mailleKeywords = ['tricotée', 'tricoté', 'knitted', 'pull', 'gilet', 'cardigan', 'sweat', 'hoodie', 'bonnet', 'écharpe', 'gants', 'chaussettes']
    
    if (mailleKeywords.some(keyword => name.includes(keyword))) {
      return { type: 'maille', color: 'bg-purple-100 text-purple-800' }
    } else {
      return { type: 'couture', color: 'bg-blue-100 text-blue-800' }
    }
  }, [])

  // Fonction pour obtenir la couleur du statut
  const getStatusColor = useCallback((status) => {
    const colors = {
      'a_faire': 'bg-gray-100 text-gray-800',
      'en_cours': 'bg-yellow-100 text-yellow-800',
      'termine': 'bg-green-100 text-green-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }, [])

  // Fonction pour extraire la taille d'un article
  const getArticleSize = useCallback((metaData) => {
    if (!metaData || !Array.isArray(metaData)) return null
    
    // Recherche exhaustive de toutes les variantes de taille
    const sizeMeta = metaData.find(meta => 
      meta.key && (
        meta.key.toLowerCase().includes('taille') ||
        meta.key.toLowerCase().includes('size') ||
        meta.key.toLowerCase().includes('dimension') ||
        meta.key.toLowerCase().includes('pa_taille') ||
        meta.key.toLowerCase().includes('attribute_pa_taille') ||
        meta.key.toLowerCase().includes('_taille') ||
        meta.key.toLowerCase().includes('_size') ||
        meta.key === 'taille' ||
        meta.key === 'size' ||
        meta.key === 'pa_taille'
      )
    )
    
    if (sizeMeta && sizeMeta.value) {
      // Nettoyer et formater la valeur
      const cleanValue = sizeMeta.value.trim()
      return cleanValue || null
    }
    
    return null
  }, [])

  // Fonction pour extraire les options d'un article
  const getArticleOptions = useCallback((metaData) => {
    if (!metaData || !Array.isArray(metaData)) return 'Aucune'
    
    const options = metaData
      .filter(meta => 
        meta.key && 
        !meta.key.toLowerCase().includes('taille') && 
        !meta.key.toLowerCase().includes('size') &&
        !meta.key.toLowerCase().includes('couleur') &&
        !meta.key.toLowerCase().includes('color') &&
        meta.key !== '_qty' &&
        meta.key !== '_tax_class' &&
        meta.key !== '_product_id' &&
        meta.key !== '_variation_id' &&
        meta.key !== '_line_subtotal' &&
        meta.key !== '_line_subtotal_tax' &&
        meta.key !== '_line_total' &&
        meta.key !== '_line_tax' &&
        meta.key !== '_line_tax_data' &&
        meta.key !== '_reduced_stock'
      )
      .map(meta => `${meta.key}: ${meta.value}`)
      .join(', ')
    
    return options || 'Aucune'
  }, [])

  // Fonction pour extraire la couleur d'un article
  const getArticleColor = useCallback((metaData) => {
    if (!metaData || !Array.isArray(metaData)) return null
    
    // Recherche exhaustive de toutes les variantes de couleur
    const colorMeta = metaData.find(meta => 
      meta.key && (
        meta.key.toLowerCase().includes('couleur') ||
        meta.key.toLowerCase().includes('color') ||
        meta.key.toLowerCase().includes('colour') ||
        meta.key.toLowerCase().includes('pa_couleur') ||
        meta.key.toLowerCase().includes('attribute_pa_couleur') ||
        meta.key.toLowerCase().includes('_couleur') ||
        meta.key.toLowerCase().includes('_color') ||
        meta.key === 'couleur' ||
        meta.key === 'color' ||
        meta.key === 'pa_couleur' ||
        meta.key === 'pa_couleur' ||
        meta.key === 'attribute_pa_couleur'
      )
    )
    
    if (colorMeta && colorMeta.value) {
      // Nettoyer et formater la valeur
      const cleanValue = colorMeta.value.trim()
      return cleanValue || null
    }
    
    return null
  }, [])

  // Fonction pour récupérer le statut d'un article
  const getArticleStatus = useCallback((orderId, lineItemId) => {
    if (!productionStatuses) return 'a_faire'
    
    const status = productionStatuses.find(s => 
      s.order_id === orderId && s.line_item_id === lineItemId
    )
    
    return status ? status.status : 'a_faire'
  }, [productionStatuses])

  const getArticleAssignment = useCallback((orderId, lineItemId) => {
    if (!productionStatuses) return null
    
    const status = productionStatuses.find(s => 
      s.order_id === orderId && s.line_item_id === lineItemId
    )
    
    return status ? status.assigned_to : null
  }, [productionStatuses])

  // Préparer les données des articles avec statuts
  const prepareArticles = useMemo(() => {
    if (!dbOrders) return []
    
    const articles = []
    
    dbOrders.forEach((order, orderIndex) => {
      // Le backend retourne 'items', pas 'line_items'
      const orderItems = order.items || order.line_items || []
      orderItems.forEach((item, itemIndex) => {
        // Utiliser le type de production depuis la base de données si disponible
        let productionType = 'couture' // par défaut
        
        if (item.production_status && item.production_status.production_type) {
          productionType = item.production_status.production_type
        } else {
          // Fallback sur la détection automatique si pas de statut
          const detectedType = getProductionType(item.product_name)
          productionType = detectedType.type
        }
        
        const currentStatus = getArticleStatus(order.order_id, item.line_item_id)
        const currentAssignment = getArticleAssignment(order.order_id, item.line_item_id)
        
        articles.push({
          ...item,
          article_id: item.line_item_id || item.id, // S'assurer que article_id est défini
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
          permalink: item.permalink, // Utiliser le permalink stocké en BDD
          productionType: productionType,
          status: currentStatus,
          assigned_to: currentAssignment,
          isDispatched: item.production_status && item.production_status.status !== 'a_faire'
        })
      })
    })
    
    return articles
  }, [dbOrders, getProductionType, getArticleStatus, getArticleAssignment])

  // Fonction de synchronisation
  const performSync = useCallback(async () => {
    try {
      const syncResult = await syncOrders([])
      
      // Rafraîchir les données
      queryClient.invalidateQueries(['db-orders'])
      queryClient.invalidateQueries(['production-statuses'])
      
      return syncResult
    } catch (error) {
      throw error
    }
  }, [queryClient])

  return {
    productionStatuses,
    statusesLoading,
    dbOrders,
    dbOrdersLoading,
    dbOrdersError,
    prepareArticles,
    getProductionType,
    getStatusColor,
    getArticleSize,
    getArticleColor,
    getArticleOptions,
    getArticleStatus,
    performSync
  }
}
