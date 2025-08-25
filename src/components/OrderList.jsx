import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { FiEye } from 'react-icons/fi'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { fetchOrders } from '../services/wordpressApi'

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
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
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
                  Article
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Production
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders?.map((order) => 
                order.line_items?.map((item, itemIndex) => {
                  const productionType = getProductionType(item.name)
                  
                  // Debug: afficher les meta_data dans la console
                  console.log(`Article: ${item.name}`, item.meta_data)
                  
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
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
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
                          Prix: {parseFloat(item.price).toFixed(2)} €
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          🚚 Transport
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${productionType.color}`}>
                          {productionType.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">
                          <FiEye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                }) || []
              )}
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