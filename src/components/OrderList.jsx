import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { FiEye } from 'react-icons/fi'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { fetchOrders } from '../services/wordpressApi'
import LoadingSpinner from './LoadingSpinner'

const OrderList = () => {
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => fetchOrders({}),
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
    staleTime: 10000
  })

  const getStatusColor = (status) => {
    const colors = {
      'completed': 'bg-green-100 text-green-800',
      'processing': 'bg-blue-100 text-blue-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'cancelled': 'bg-red-100 text-red-800',
      'refunded': 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

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

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="text-red-800">
            <p className="font-medium">Erreur lors du chargement des commandes</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Articles de commandes ({orders?.reduce((total, order) => total + (order.line_items?.length || 0), 0) || 0})
        </h2>
      </div>

      {/* Liste des articles */}
      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  N° Commande
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Commande
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
              {orders?.map((order) => {
                // Récupérer le transporteur une seule fois par commande
                // Essayer plusieurs sources possibles
                let shippingMethod = 'Transport non spécifié'
                
                // Priorité 1: shipping_lines (méthode de transport choisie par le client)
                if (order.shipping_lines && order.shipping_lines.length > 0) {
                  const methodTitle = order.shipping_lines[0].method_title || ''
                  
                  // Si c'est "livraison gratuite" et que l'adresse est en France
                  if (methodTitle.toLowerCase().includes('livraison gratuite') || methodTitle.toLowerCase().includes('free shipping')) {
                    if (order.billing?.country === 'FR') {
                      shippingMethod = `${methodTitle} (UPS)`
                    } else {
                      shippingMethod = `${methodTitle} (DHL)`
                    }
                  } else {
                    shippingMethod = methodTitle
                  }
                }
                // Priorité 2: shipping_method_title (fallback)
                else if (order.shipping_method_title) {
                  shippingMethod = order.shipping_method_title
                }
                // Priorité 3: shipping_method (fallback)
                else if (order.shipping_method) {
                  shippingMethod = order.shipping_method
                }
                // Priorité 4: meta_data (dernier recours)
                else {
                  const metaShipping = order.meta_data?.find(meta => 
                    meta.key === '_shipping_method' || 
                    meta.key === 'shipping_method' ||
                    meta.key === '_shipping_method_title' ||
                    meta.key === 'shipping_method_title'
                  )?.value
                  if (metaShipping) {
                    shippingMethod = metaShipping
                  }
                }
                
                return order.line_items?.map((item, itemIndex) => {
                  const productionType = getProductionType(item.name)
                  
                  // Extraction de la taille et des options depuis les meta_data
                  const size = item.meta_data?.find(meta => 
                    meta.key?.toLowerCase().includes('taille') || 
                    meta.key?.toLowerCase().includes('size')
                  )?.value || 'N/A'
                  
                  const options = item.meta_data?.filter(meta => 
                    !meta.key?.toLowerCase().includes('taille') && 
                    !meta.key?.toLowerCase().includes('size') &&
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
                  ).map(meta => `${meta.key}: ${meta.value}`).join(', ') || 'Aucune'
                  
                  return (
                    <tr key={`${order.id}-${item.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">#{order.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(new Date(order.date_created), 'dd/MM/yyyy', { locale: fr })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {order.billing?.first_name} {order.billing?.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{order.billing?.email}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          📞 {order.billing?.phone || 'Téléphone non renseigné'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          📍 {order.billing?.address_1}
                          {order.billing?.address_2 && `, ${order.billing.address_2}`}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {order.billing?.postcode && order.billing?.city && `${order.billing.postcode} ${order.billing.city}`}
                          {order.billing?.country && `, ${order.billing.country}`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {order.customer_note ? (
                          <div className="text-sm text-gray-900 max-w-xs">
                            <div className="mt-1 p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                              "{order.customer_note}"
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 italic">Aucune note</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.permalink ? (
                          <a
                            href={item.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:underline"
                            title="Ouvrir la fiche produit"
                          >
                            {item.name}
                          </a>
                        ) : (
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        )}
                        {size !== 'N/A' && (
                          <div className="text-xs text-gray-500 mt-1">
                            Taille: {size}
                          </div>
                        )}
                        {options !== 'Aucune' && (
                          <div className="text-xs text-gray-600 mt-1 max-w-xs" title={options}>
                            {options}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Qté: {item.quantity}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          🚚 {shippingMethod}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${productionType.color}`}>
                          {productionType.type}
                        </span>
                      </td>
                    </tr>
                  )
                }) || []
              })}
            </tbody>
          </table>
        </div>
        
        {!orders?.length && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucune commande trouvée</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrderList