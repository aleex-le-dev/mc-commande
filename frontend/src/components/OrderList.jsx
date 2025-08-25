import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiEye } from 'react-icons/fi'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { fetchOrders } from '../services/wordpressApi'
import { getProductionStatuses, updateArticleStatus } from '../services/mongodbService'
import LoadingSpinner from './LoadingSpinner'

const OrderList = ({ onNavigateToType, selectedType: propSelectedType }) => {
  const [selectedType, setSelectedType] = useState(propSelectedType || 'all')
  const queryClient = useQueryClient()

  // Mettre à jour le selectedType local quand la prop change
  React.useEffect(() => {
    if (propSelectedType) {
      setSelectedType(propSelectedType)
    }
  }, [propSelectedType])

  const { data: orders, isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['orders'],
    queryFn: () => fetchOrders({}),
    refetchInterval: 30000,
    staleTime: 10000
  })

  const { data: productionStatuses, isLoading: statusesLoading } = useQuery({
    queryKey: ['production-statuses'],
    queryFn: getProductionStatuses,
    refetchInterval: 10000, // Rafraîchir plus souvent pour les statuts
    staleTime: 5000
  })

  // Mutation pour mettre à jour le statut
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, lineItemId, status }) => updateArticleStatus(orderId, lineItemId, status),
    onSuccess: () => {
      // Rafraîchir les données après mise à jour
      queryClient.invalidateQueries(['production-statuses'])
    },
    onError: (error) => {
      console.error('Erreur lors de la mise à jour du statut:', error)
      alert('Erreur lors de la mise à jour du statut')
    }
  })

  // Fonction pour déterminer le type de production (couture ou maille)
  const getProductionType = (productName) => {
    const name = productName.toLowerCase()
    
    // Mots-clés pour la maille (priorité haute)
    const mailleKeywords = ['tricotée', 'tricoté', 'knitted', 'pull', 'gilet', 'cardigan', 'sweat', 'hoodie', 'bonnet', 'écharpe', 'gants', 'chaussettes']
    
    // Vérifier d'abord les mots-clés maille
    if (mailleKeywords.some(keyword => name.includes(keyword))) {
      return { type: 'maille', color: 'bg-purple-100 text-purple-800' }
    } else {
      // Par défaut, tout le reste est de la couture
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

  // Fonction pour changer le statut d'un article
  const changeArticleStatus = (orderId, lineItemId, newStatus) => {
    updateStatusMutation.mutate({ orderId, lineItemId, status: newStatus })
  }

  // Fonction pour récupérer le statut d'un article
  const getArticleStatus = (orderId, lineItemId) => {
    if (!productionStatuses) return 'a_faire'
    
    const status = productionStatuses.find(s => 
      s.order_id === orderId && s.line_item_id === lineItemId
    )
    
    return status ? status.status : 'a_faire'
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

  // Fonction pour récupérer la méthode de transport
  const getShippingMethod = (order) => {
    let shippingMethod = 'Transport non spécifié'
    
    if (order.shipping_lines && order.shipping_lines.length > 0) {
      const methodTitle = order.shipping_lines[0].method_title || ''
      
      if (methodTitle.toLowerCase().includes('livraison gratuite') || methodTitle.toLowerCase().includes('free shipping')) {
        if (order.billing?.country === 'FR') {
          shippingMethod = `${methodTitle} (UPS)`
        } else {
          shippingMethod = `${methodTitle} (DHL)`
        }
      } else {
        shippingMethod = methodTitle
      }
    } else if (order.shipping_method_title) {
      shippingMethod = order.shipping_method_title
    } else if (order.shipping_method) {
      shippingMethod = order.shipping_method
    }
    
    return shippingMethod
  }

  // Préparer les données des articles avec statuts
  const prepareArticles = () => {
    if (!orders) return []
    
    const articles = []
    orders.forEach(order => {
      order.line_items?.forEach(item => {
        const productionType = getProductionType(item.name)
        const currentStatus = getArticleStatus(order.id, item.id)
        
        articles.push({
          ...item,
          orderId: order.id,
          orderNumber: order.number,
          orderDate: order.date_created,
          customer: `${order.billing?.first_name} ${order.billing?.last_name}`,
          customerEmail: order.billing?.email,
          customerPhone: order.billing?.phone,
          customerAddress: `${order.billing?.address_1}, ${order.billing?.city}, ${order.billing?.postcode}`,
          customerNote: order.customer_note,
          productionType: productionType.type,
          status: currentStatus,
          shippingMethod: getShippingMethod(order)
        })
      })
    })
    return articles
  }

  // Filtrer les articles
  const filteredArticles = prepareArticles().filter(article => {
    const typeMatch = selectedType === 'all' || article.productionType === selectedType
    return typeMatch
  })

  if (ordersLoading || statusesLoading) {
    return <LoadingSpinner />
  }

  if (ordersError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="text-red-800">
            <p className="font-medium">Erreur lors du chargement des commandes</p>
            <p className="text-sm">{ordersError.message}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec filtres */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {propSelectedType === 'couture' ? '🧵 Production Couture' : 
           propSelectedType === 'maille' ? '🪡 Production Maille' : 
           'Gestion de Production'} ({filteredArticles.length} articles)
        </h2>
        
        {/* Filtres - seulement affichés si on n'est pas sur une page spécifique */}
        {!propSelectedType && (
          <div className="flex gap-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous types</option>
              <option value="maille">Maille</option>
              <option value="couture">Couture</option>
            </select>
          </div>
        )}
      </div>

            {/* Affichage des articles */}
      {propSelectedType ? (
        // Affichage direct pour les pages spécifiques (couture ou maille)
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredArticles.map((article, index) => (
                    <tr key={`${article.orderId}-${article.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">#{article.orderNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(new Date(article.orderDate), 'dd/MM/yyyy', { locale: fr })}
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
                        {article.customerNote ? (
                          <div className="text-sm text-gray-900 max-w-xs">
                            <div className="p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                              "{article.customerNote}"
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 italic">Aucune note</div>
                        )}
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
                            {article.name}
                          </a>
                        ) : (
                          <div className="text-sm font-medium text-gray-900">{article.name}</div>
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
                        <div className="text-xs text-gray-500">
                          🚚 {article.shippingMethod}
                        </div>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        // Affichage avec séparateurs par type pour la page générale
        ['maille', 'couture'].map(type => {
          const typeArticles = filteredArticles.filter(article => article.productionType === type)
          if (typeArticles.length === 0) return null
          
          return (
            <div key={type} className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className={`text-lg font-semibold ${type === 'maille' ? 'text-purple-700' : 'text-blue-700'}`}>
                  {type === 'maille' ? '🧶 Tricoteuses' : '✂️ Couturières'} ({typeArticles.length} articles)
                </h3>
                {onNavigateToType && (
                  <button
                    onClick={() => onNavigateToType(type)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      type === 'maille' 
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    Voir tous les articles {type === 'maille' ? 'Maille' : 'Couture'}
                  </button>
                )}
              </div>
              
              <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className={`${type === 'maille' ? 'bg-purple-50' : 'bg-blue-50'}`}>
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
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {typeArticles.map((article, index) => (
                        <tr key={`${article.orderId}-${article.id}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">#{article.orderNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {format(new Date(article.orderDate), 'dd/MM/yyyy', { locale: fr })}
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
                            {article.customerNote ? (
                              <div className="text-sm text-gray-900 max-w-xs">
                                <div className="p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                                  "{article.customerNote}"
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400 italic">Aucune note</div>
                            )}
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
                                {article.name}
                              </a>
                            ) : (
                              <div className="text-sm font-medium text-gray-900">{article.name}</div>
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
                            <div className="text-xs text-gray-500">
                              🚚 {article.shippingMethod}
                            </div>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        })
      )}
      
      {filteredArticles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Aucun article trouvé avec les filtres sélectionnés</p>
        </div>
      )}
    </div>
  )
}

export default OrderList