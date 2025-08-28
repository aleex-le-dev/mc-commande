import React, { useState } from 'react'
import { getOrderByNumber, updateOrderStatus } from '../../services/mongodbService'

// Composant CommandeTab
// Permet de rechercher une commande par numéro et de modifier le type de production des articles
const CommandeTab = () => {
  const [searchOrderNumber, setSearchOrderNumber] = useState('')
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setStatus] = useState({ type: '', text: '' })

  const searchOrder = async (e) => {
    e.preventDefault()
    if (!searchOrderNumber.trim()) {
      setStatus({ type: 'error', text: 'Veuillez entrer un numéro de commande' })
      return
    }

    setIsLoading(true)
    setStatus({ type: '', text: '' })
    setOrder(null)

    try {
      const orderData = await getOrderByNumber(searchOrderNumber.trim())
      if (orderData) {
        setOrder(orderData)
        setStatus({ type: 'success', text: `Commande ${searchOrderNumber} trouvée avec ${orderData.items?.length || 0} article(s)` })
      } else {
        setStatus({ type: 'error', text: `Aucune commande trouvée avec le numéro ${searchOrderNumber}` })
      }
    } catch (error) {
      setStatus({ type: 'error', text: `Erreur: ${error.message}` })
    } finally {
      setIsLoading(false)
    }
  }

  const updateItemProductionType = async (lineItemId, newProductionType) => {
    try {
      const response = await fetch(`http://localhost:3001/api/production-status/${lineItemId}/type`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ production_type: newProductionType })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      await response.json()
      setOrder(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.line_item_id === lineItemId 
            ? { ...item, production_status: { ...item.production_status, production_type: newProductionType } }
            : item
        )
      }))

      setStatus({ type: 'success', text: `Type de production mis à jour pour l'article ${lineItemId}` })
    } catch (error) {
      setStatus({ type: 'error', text: `Erreur lors de la mise à jour: ${error.message}` })
    }
  }

  const getProductionTypeLabel = (type) => {
    switch (type) {
      case 'couture': return '🧵 Couture'
      case 'maille': return '🧶 Maille'
      default: return type || 'Non défini'
    }
  }

  const getProductionTypeColor = (type) => {
    switch (type) {
      case 'couture': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'maille': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Modification des commandes</h2>
          <p className="text-gray-600">Changer le type de production et supprimer des commandes ou des articles.</p>
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
                  placeholder="390023"
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
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
            message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
            'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Détails de la commande */}
        {order && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">📋 Commande #{order.order_id}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Client:</span>
                <p className="text-gray-900">{order.customer_name || 'Non défini'}</p>
                <p className="text-gray-600 text-xs">{order.customer_email}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Date de commande:</span>
                <p className="text-gray-900">
                  {order.order_date ? new Date(order.order_date).toLocaleDateString('fr-FR') : 'Non définie'}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Statut:</span>
                <p className="text-gray-900">{order.status || 'Non défini'}</p>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Total articles:</span>
                <p className="text-gray-900">{order.items ? order.items.length : 0}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Prix total:</span>
                <p className="text-gray-900">{order.total ? `${order.total}€` : 'Non défini'}</p>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={async () => {
                  if (!confirm('Supprimer cette commande et tous ses articles ?')) return
                  try {
                    const res = await fetch(`http://localhost:3001/api/orders/${order.order_id}`, { method: 'DELETE' })
                    if (!res.ok) throw new Error('Suppression échouée')
                    setOrder(null)
                    setStatus({ type: 'success', text: `Commande ${order.order_id} supprimée` })
                  } catch (e) {
                    setStatus({ type: 'error', text: e.message })
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                🗑️ Supprimer la commande
              </button>
            </div>
          </div>
        )}

        {/* Liste des articles */}
        {order && order.items && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">📦 Articles de la commande</h3>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={item.line_item_id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                        <span className="text-sm text-gray-500">(ID: {item.line_item_id})</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Quantité: {item.quantity}</span>
                        <span>Prix: {item.price}€</span>
                        <span>Taille: {item.meta_data?.find(m => m.key === 'pa_size')?.display_value || 'Non définie'}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>Type: {item.production_status?.production_type || 'Non défini'}</span>
                        <span>Statut: {item.production_status?.status || 'Non défini'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Boutons de type de production */}
                      <button
                        onClick={() => updateItemProductionType(item.line_item_id, 'couture')}
                        className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                          item.production_status?.production_type === 'couture'
                            ? 'bg-blue-100 text-blue-800 border-blue-300 cursor-default'
                            : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                        }`}
                        disabled={item.production_status?.production_type === 'couture'}
                      >
                        🧵 Couture
                      </button>
                      
                      <button
                        onClick={() => updateItemProductionType(item.line_item_id, 'maille')}
                        className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                          item.production_status?.production_type === 'maille'
                            ? 'bg-purple-100 text-purple-800 border-purple-300 cursor-default'
                            : 'bg-white text-purple-600 border-blue-300 hover:bg-purple-50'
                        }`}
                        disabled={item.production_status?.production_type === 'maille'}
                      >
                        🧶 Maille
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Supprimer l'article ${item.line_item_id} ?`)) return
                          try {
                            const res = await fetch(`http://localhost:3001/api/orders/${item.order_id}/items/${item.line_item_id}`, { method: 'DELETE' })
                            if (!res.ok) throw new Error('Suppression échouée')
                            setOrder(prev => ({
                              ...prev,
                              items: prev.items.filter(i => i.line_item_id !== item.line_item_id)
                            }))
                            setStatus({ type: 'success', text: `Article ${item.line_item_id} supprimé` })
                          } catch (e) {
                            setStatus({ type: 'error', text: e.message })
                          }
                        }}
                        className="px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 text-sm"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CommandeTab


