import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { 
  getProductionStatuses, 
  updateArticleStatus, 
  dispatchToProduction,
  syncOrders,
  getOrdersFromDatabase,
  getOrdersByProductionType,
  getSyncLogs
} from '../services/mongodbService'
import LoadingSpinner from './LoadingSpinner'

// Composant pour afficher l'image du produit
const ProductImage = ({ productId, productName, permalink }) => {
  const [imageUrl, setImageUrl] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorDetails, setErrorDetails] = useState('')

  useEffect(() => {
    if (productId) {
      // Reset l'état quand l'ID change
      setImageUrl(null)
      setHasError(false)
      setErrorDetails('')
      fetchProductImage(productId)
    }
  }, [productId])

  const fetchProductImage = async (id) => {
    if (!id) {
      console.warn('ProductImage: Pas d\'ID de produit fourni')
      setHasError(true)
      setErrorDetails('Pas d\'ID')
      return
    }

    setIsLoading(true)
    setHasError(false)
    setErrorDetails('')
    
    try {
      // Récupérer la configuration WordPress depuis les variables d'environnement
      const wordpressUrl = import.meta.env.VITE_WORDPRESS_URL
      const consumerKey = import.meta.env.VITE_WORDPRESS_CONSUMER_KEY
      const consumerSecret = import.meta.env.VITE_WORDPRESS_CONSUMER_SECRET

      if (!wordpressUrl || !consumerKey || !consumerSecret) {
        console.warn('ProductImage: Configuration WordPress manquante')
        setHasError(true)
        setErrorDetails('Config manquante')
        return
      }

      const authParams = `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`
      const url = `${wordpressUrl}/wp-json/wc/v3/products/${id}?${authParams}&_fields=id,images`
      
      console.log(`ProductImage: Tentative de récupération de l'image pour le produit ${id}`)
      console.log(`ProductImage: URL appelée: ${url}`)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // Augmenter le timeout
      })

      console.log(`ProductImage: Réponse HTTP ${response.status} pour le produit ${id}`)

      if (response.ok) {
        const product = await response.json()
        console.log(`ProductImage: Données reçues pour le produit ${id}:`, {
          hasImages: !!product?.images,
          imagesCount: product?.images?.length || 0,
          firstImage: product?.images?.[0]
        })
        
        if (product?.images && product.images.length > 0 && product.images[0]?.src) {
          console.log(`ProductImage: Image trouvée pour le produit ${id}: ${product.images[0].src}`)
          setImageUrl(product.images[0].src)
        } else {
          console.warn(`ProductImage: Pas d'image pour le produit ${id}`)
          setHasError(true)
          setErrorDetails('Pas d\'image')
        }
      } else {
        console.warn(`ProductImage: Erreur HTTP ${response.status} pour le produit ${id}`)
        setHasError(true)
        setErrorDetails(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.warn(`ProductImage: Erreur lors de la récupération de l'image pour le produit ${id}:`, error.message)
      setHasError(true)
      setErrorDetails(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
      </div>
    )
  }

  if (hasError || !imageUrl) {
    return (
      <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center group relative">
        <span className="text-xs text-gray-500">🖼️</span>
        {errorDetails && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            {errorDetails}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
          </div>
        )}
      </div>
    )
  }

  return (
    <a
      href={permalink || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block"
      title="Voir l'image du produit"
    >
      <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden hover:bg-gray-200 transition-colors">
        <img 
          src={imageUrl} 
          alt={productName}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      </div>
    </a>
  )
}

const OrderList = ({ onNavigateToType, selectedType: propSelectedType }) => {
  const [selectedType, setSelectedType] = useState(propSelectedType || 'all')

  const [syncProgress, setSyncProgress] = useState({ isRunning: false, progress: 0, message: '' })
  const [syncLogs, setSyncLogs] = useState([])
  const queryClient = useQueryClient()

  // Mettre à jour le selectedType local quand la prop change
  useEffect(() => {
    if (propSelectedType) {
      setSelectedType(propSelectedType)
    }
  }, [propSelectedType])

  // Synchronisation automatique au chargement de la page
  useEffect(() => {
    const performAutoSync = async () => {
      try {
        // Afficher le popup de progression
        setSyncProgress({ 
          isRunning: true, 
          progress: 0, 
          message: 'Connexion au backend...' 
        })
        
        // Étape 1: Connexion au backend
        setSyncProgress(prev => ({ ...prev, progress: 10, message: 'Connexion au backend...' }))
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Étape 2: Récupération des commandes WooCommerce
        setSyncProgress(prev => ({ ...prev, progress: 25, message: 'Récupération des commandes WooCommerce...' }))
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Étape 3: Récupération des permalinks
        setSyncProgress(prev => ({ ...prev, progress: 40, message: 'Récupération des permalinks...' }))
        await new Promise(resolve => setTimeout(resolve, 400))
        
        // Étape 4: Synchronisation avec la base de données
        setSyncProgress(prev => ({ ...prev, progress: 60, message: 'Synchronisation avec la base de données...' }))
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Étape 5: Appel de synchronisation
        setSyncProgress(prev => ({ ...prev, progress: 80, message: 'Synchronisation des données...' }))
        
        // Récupérer le dernier log en temps réel pendant la synchronisation
        const logsInterval = setInterval(async () => {
          try {
            const logs = await getSyncLogs()
            // Prendre seulement le dernier log au lieu de tous
            if (logs && logs.log) {
              setSyncLogs([logs.log])
            }
          } catch (error) {
            console.warn('Erreur lors de la récupération des logs:', error)
          }
        }, 200) // Plus rapide pour voir les logs en temps réel
        
        const syncResult = await syncOrders([])
        
        // Arrêter la récupération des logs
        clearInterval(logsInterval)
        
        // Récupérer le dernier log final
        const finalLogs = await getSyncLogs()
        if (finalLogs && finalLogs.log) {
          setSyncLogs([finalLogs.log])
        }
        
        // Étape 6: Afficher le résultat dans le popup de progression
        if (syncResult.results) {
          const { ordersCreated, itemsCreated } = syncResult.results
          const totalNew = ordersCreated + itemsCreated
          
          if (totalNew > 0) {
            setSyncProgress(prev => ({ 
              ...prev, 
              progress: 100, 
              message: `${ordersCreated} commande${ordersCreated > 1 ? 's' : ''} et ${itemsCreated} article${itemsCreated > 1 ? 's' : ''} récupéré${itemsCreated > 1 ? 's' : ''}`
            }))
          } else {
            setSyncProgress(prev => ({ 
              ...prev, 
              progress: 100, 
              message: 'Aucune nouvelle commande à traiter'
            }))
          }
        }
        
        // Rafraîchir les données
        queryClient.invalidateQueries(['db-orders'])
        queryClient.invalidateQueries(['production-statuses'])
        
        // Masquer le popup de progression après 3 secondes
        setTimeout(() => setSyncProgress({ isRunning: false, progress: 0, message: '' }), 3000)
        
      } catch (error) {
        console.error('Erreur lors de la synchronisation automatique:', error)
        
        // Afficher l'erreur dans le popup de progression
        setSyncProgress(prev => ({ 
          ...prev, 
          progress: 100, 
          message: 'Erreur lors de la synchronisation'
        }))
        
        // Masquer le popup après 3 secondes
        setTimeout(() => setSyncProgress({ isRunning: false, progress: 0, message: '' }), 3000)
      }
    }
    
    // Effectuer la synchronisation automatique
    performAutoSync()
  }, [queryClient])

  // Récupérer les commandes depuis la base de données
  const { data: dbOrders, isLoading: dbOrdersLoading, error: dbOrdersError } = useQuery({
    queryKey: ['db-orders', selectedType],
    queryFn: () => {
      if (propSelectedType && propSelectedType !== 'all') {
        console.log(`🔍 OrderList: Appel getOrdersByProductionType(${propSelectedType})`)
        return getOrdersByProductionType(propSelectedType)
      }
      console.log(`🔍 OrderList: Appel getOrdersFromDatabase()`)
      return getOrdersFromDatabase()
    },
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
    staleTime: 10000,
  })
  
  // Debug: afficher les données reçues
  console.log('🔍 OrderList dbOrders:', {
    selectedType,
    propSelectedType,
    dbOrders,
    dbOrdersLength: dbOrders?.length || 0,
    isLoading: dbOrdersLoading,
    error: dbOrdersError
  })

  // Récupérer les statuts de production
  const { data: productionStatuses, isLoading: statusesLoading } = useQuery({
    queryKey: ['production-statuses'],
    queryFn: getProductionStatuses,
    refetchInterval: 10000,
    staleTime: 5000
  })

  // Fonction pour déterminer le type de production
  const getProductionType = (productName) => {
    const name = productName.toLowerCase()
    
    const mailleKeywords = ['tricotée', 'tricoté', 'knitted', 'pull', 'gilet', 'cardigan', 'sweat', 'hoodie', 'bonnet', 'écharpe', 'gants', 'chaussettes']
    
    if (mailleKeywords.some(keyword => name.includes(keyword))) {
      return { type: 'maille', color: 'bg-purple-100 text-purple-800' }
    } else {
      return { type: 'couture', color: 'bg-blue-100 text-blue-800' }
    }
  }

  // Fonction pour obtenir la couleur du statut
  const getStatusColor = (status) => {
    const colors = {
      'a_faire': 'bg-gray-100 text-gray-800',
      'en_cours': 'bg-yellow-100 text-yellow-800',
      'termine': 'bg-green-100 text-green-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  // Fonction pour récupérer le statut d'un article
  const getArticleStatus = (orderId, lineItemId) => {
    if (!productionStatuses) return 'a_faire'
    
    const status = productionStatuses.find(s => 
      s.order_id === orderId && s.line_item_id === lineItemId
    )
    
    return status ? status.status : 'a_faire'
  }

  // Fonction pour extraire la taille d'un article
  const getArticleSize = (metaData) => {
    if (!metaData || !Array.isArray(metaData)) return 'Non spécifiée'
    
    const sizeMeta = metaData.find(meta => 
      meta.key && (
        meta.key.toLowerCase().includes('taille') ||
        meta.key.toLowerCase().includes('size') ||
        meta.key.toLowerCase().includes('dimension')
      )
    )
    
    return sizeMeta ? sizeMeta.value : 'Non spécifiée'
  }

  // Fonction pour extraire les options d'un article
  const getArticleOptions = (metaData) => {
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
  }

  // Fonction pour extraire la couleur d'un article
  const getArticleColor = (metaData) => {
    if (!metaData || !Array.isArray(metaData)) return 'Non spécifiée'
    
    const colorMeta = metaData.find(meta => 
      meta.key && (
        meta.key.toLowerCase().includes('couleur') ||
        meta.key.toLowerCase().includes('color') ||
        meta.key.toLowerCase().includes('colour')
      )
    )
    
    return colorMeta ? colorMeta.value : 'Non spécifiée'
  }

  // Préparer les données des articles avec statuts
  const prepareArticles = () => {
    if (!dbOrders) return []
    
    console.log('🔍 prepareArticles - dbOrders structure:', {
      dbOrdersLength: dbOrders.length,
      firstOrder: dbOrders[0],
      hasItems: dbOrders[0]?.items,
      itemsLength: dbOrders[0]?.items?.length
    })
    
    const articles = []
    dbOrders.forEach((order, orderIndex) => {
      console.log(`🔍 Order ${orderIndex}:`, {
        order_id: order.order_id,
        hasItems: !!order.items,
        itemsLength: order.items?.length || 0,
        firstItem: order.items?.[0]
      })
      
      order.items?.forEach((item, itemIndex) => {
        console.log(`🔍 Item ${itemIndex} in Order ${orderIndex}:`, item)
        
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
          permalink: item.permalink, // Utiliser le permalink stocké en BDD
          productionType: productionType,
          status: currentStatus,
          isDispatched: item.production_status && item.production_status.status !== 'a_faire'
        })
      })
    })
    
    console.log('🔍 prepareArticles - Articles créés:', articles.length)
    return articles
  }

  // Filtrer les articles
  const allArticles = prepareArticles()
  const filteredArticles = allArticles.filter(article => {
    const typeMatch = selectedType === 'all' || article.productionType === selectedType
    return typeMatch
  })
  
  // Debug: afficher les informations dans la console
  console.log('🔍 Debug OrderList:', {
    selectedType,
    totalArticles: allArticles.length,
    filteredArticles: filteredArticles.length,
    sampleArticles: allArticles.slice(0, 3).map(a => ({
      name: a.product_name,
      productionType: a.productionType,
      hasProductionStatus: !!a.production_status
    }))
  })

  if (dbOrdersLoading || statusesLoading) {
    return <LoadingSpinner />
  }

  if (dbOrdersError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="text-red-800">
            <p className="font-medium">Erreur lors du chargement des commandes</p>
            <p className="text-sm">{dbOrdersError.message}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Popup de progression de synchronisation */}
      {syncProgress.isRunning && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-blue-100 text-blue-800 border border-blue-200 rounded-lg shadow-lg max-w-md">
          <div className="mb-3">
            <p className="font-medium">
              <svg 
                className={`w-5 h-5 inline-block mr-2 ${syncProgress.isRunning ? 'animate-spin' : ''}`}
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Synchronisation
            </p>
          </div>
          
          {/* Log en temps réel */}
          <div className="bg-blue-50 rounded p-2">
            {syncLogs.length > 0 && syncLogs[0] ? (
              <div className="text-xs">
                    <span className="text-blue-600 font-mono">
                  {new Date(syncLogs[0].timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`ml-2 ${
                  syncLogs[0].type === 'success' ? 'text-green-600' :
                  syncLogs[0].type === 'error' ? 'text-red-600' :
                  syncLogs[0].type === 'warning' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                  {syncLogs[0].message}
                    </span>
              </div>
            ) : (
              <p className="text-xs text-blue-500 italic">En attente des logs...</p>
            )}
          </div>
        </div>
      )}



      {/* En-tête avec filtres */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {propSelectedType === 'couture' ? '🧵 Production Couture' : 
           propSelectedType === 'maille' ? '🪡 Production Maille' : 
           'Gestion de Production'} ({filteredArticles.length} articles)
        </h2>
      </div>

      {/* Affichage des articles */}
      <div className="space-y-4">
            <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
              <thead className={`${propSelectedType === 'maille' ? 'bg-purple-50' : 'bg-blue-50'}`}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        N° Commande
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Note
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Article
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Production
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Image
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                {filteredArticles.map((article, index) => (
                  <tr key={`${article.orderId}-${article.line_item_id}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">#{article.orderNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {format(new Date(article.orderDate), 'dd/MM/yyyy', { locale: fr })}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {format(new Date(article.orderDate), 'HH:mm', { locale: fr })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{article.customer}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            📧 {article.customerEmail || 'Email non renseigné'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            📞 {article.customerPhone || 'Téléphone non renseigné'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            📍 {article.customerAddress || 'Adresse non renseignée'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                          {article.customerNote ? (
                              <div className="p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                                "{article.customerNote}"
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400 italic">Aucune note</div>
                          )}
                      </div>
                        </td>
                        <td className="px-6 py-4">
                          {article.permalink ? (
                            <a
                              href={article.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-blue-600 hover:underline"
                              title="Ouvrir la fiche produit"
                            >
                          {article.product_name}
                            </a>
                          ) : (
                        <div className="text-sm font-medium text-gray-900">{article.product_name}</div>
                          )}
                          
                          {/* Détails de l'article */}
                          <div className="text-xs text-gray-500 mt-1">
                        📏 Taille: {getArticleSize(article.meta_data)}
                          </div>
                          <div className="text-xs text-gray-500">
                        📦 Qté: {article.quantity}
                      </div>
                      {getArticleColor(article.meta_data) !== 'Non spécifiée' && (
                        <div className="text-xs text-gray-500">
                          🎨 Couleur: {getArticleColor(article.meta_data)}
                          </div>
                      )}
                          {getArticleOptions(article.meta_data) !== 'Aucune' && (
                            <div className="text-xs text-gray-500 mt-1">
                              Options: {getArticleOptions(article.meta_data)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${article.productionType === 'maille' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                            {article.productionType === 'maille' ? '🧶 Maille' : '✂️ Couture'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <ProductImage 
                            productId={article.product_id} 
                            productName={article.product_name}
                            permalink={article.permalink}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
      
      {filteredArticles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Aucun article trouvé avec les filtres sélectionnés</p>
          <p className="text-sm text-gray-400 mt-2">
            Total d'articles en base: {allArticles.length} | Type sélectionné: {selectedType}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Actualisez la page pour synchroniser les nouvelles commandes
          </p>
        </div>
      )}
    </div>
  )
}

export default OrderList