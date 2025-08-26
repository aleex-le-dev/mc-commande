import React, { useState } from 'react'
import { getOrderByNumber, updateOrderStatus } from '../../services/mongodbService'

const ModificationTab = () => {
  const [searchOrderNumber, setSearchOrderNumber] = useState('')
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const searchOrder = async (e) => {
    e.preventDefault()
    if (!searchOrderNumber.trim()) {
      setMessage({ type: 'error', text: 'Veuillez entrer un numéro de commande.' })
      return
    }

    setIsLoading(true)
    try {
      const orderNumber = searchOrderNumber.replace('#', '')
      const result = await getOrderByNumber(orderNumber)
      if (result) {
        setOrder(result)
        setMessage({ type: 'success', text: 'Commande trouvée !' })
      } else {
        setOrder(null)
        setMessage({ type: 'error', text: 'Aucune commande trouvée avec ce numéro.' })
      }
    } catch (error) {
      setOrder(null)
      setMessage({ type: 'error', text: `Erreur: ${error.message}` })
    }
    setIsLoading(false)
  }

  const updateOrderStatus = async (newStatus) => {
    if (!order) return

    setIsLoading(true)
    try {
      await updateOrderStatus(order._id, newStatus)
      setOrder(prev => ({ ...prev, status: newStatus }))
      setMessage({ type: 'success', text: 'Statut mis à jour avec succès !' })
    } catch (error) {
      setMessage({ type: 'error', text: `Erreur lors de la mise à jour: ${error.message}` })
    }
    setIsLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">✏️ Modification des commandes</h2>
          <p className="text-gray-600">
            Recherchez et modifiez le statut des commandes par numéro.
          </p>
        </div>

        {/* Formulaire de recherche */}
        <form onSubmit={searchOrder} className="mb-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de commande
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">#</span>
                <input
                  type="text"
                  id="orderNumber"
                  value={searchOrderNumber}
                  onChange={(e) => setSearchOrderNumber(e.target.value)}
                  placeholder="390019"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--rose-clair-text)]"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-[var(--rose-clair-text)] text-white rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? 'Recherche...' : 'Rechercher'}
              </button>
            </div>
          </div>
        </form>

        {/* Messages */}
        {message.text && (
          <div className={`p-4 rounded-md mb-4 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Détails de la commande */}
        {order && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Détails de la commande #{order.order_number}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Client:</span>
                <p className="text-gray-900">{order.customer_name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Produit:</span>
                <p className="text-gray-900">{order.product_name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Quantité:</span>
                <p className="text-gray-900">{order.quantity}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Statut actuel:</span>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  order.status === 'completed' ? 'bg-green-100 text-green-800' :
                  order.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {order.status === 'completed' ? 'Terminée' :
                   order.status === 'in_progress' ? 'En cours' : 'En attente'}
                </span>
              </div>
            </div>

            {/* Modification du statut */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Modifier le statut:</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => updateOrderStatus('pending')}
                  disabled={isLoading || order.status === 'pending'}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    order.status === 'pending'
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  En attente
                </button>
                <button
                  onClick={() => updateOrderStatus('in_progress')}
                  disabled={isLoading || order.status === 'in_progress'}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    order.status === 'in_progress'
                      ? 'bg-yellow-200 text-yellow-700 cursor-not-allowed'
                      : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  }`}
                >
                  En cours
                </button>
                <button
                  onClick={() => updateOrderStatus('completed')}
                  disabled={isLoading || order.status === 'completed'}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    order.status === 'completed'
                      ? 'bg-green-200 text-green-700 cursor-not-allowed'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  Terminée
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ModificationTab
