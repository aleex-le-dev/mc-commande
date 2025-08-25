import React, { useState } from 'react'
import { FiSave, FiCheckCircle, FiEye, FiEyeOff, FiInfo, FiEdit3, FiDatabase } from 'react-icons/fi'

const ParametresPanel = () => {
  const [activeTab, setActiveTab] = useState('status')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Onglets disponibles
  const tabs = [
    { id: 'status', label: 'Status & Tests', icon: '📊' },
    { id: 'modification', label: 'Modification des Commandes', icon: '✏️' }
  ]

  // Onglet Status & Tests
  const StatusTab = () => {
    const [statusData, setStatusData] = useState(null)

    const checkAllStatus = async () => {
      setIsLoading(true)
      setMessage({ type: '', text: '' })

      try {
        // Vérifier la connexion MongoDB
        const mongoResponse = await fetch('http://localhost:3001/api/debug/status')
        const mongoData = await mongoResponse.ok ? await mongoResponse.json() : null

        // Vérifier la connexion WordPress (si configuré)
        let wordpressStatus = null
        const envConfig = {
          wordpressUrl: import.meta.env.VITE_WORDPRESS_URL,
          consumerKey: import.meta.env.VITE_WORDPRESS_CONSUMER_KEY,
          consumerSecret: import.meta.env.VITE_WORDPRESS_CONSUMER_SECRET
        }

        if (envConfig.wordpressUrl && envConfig.consumerKey && envConfig.consumerSecret) {
          try {
            const wpResponse = await fetch(`${envConfig.wordpressUrl}/wp-json/wc/v3/products?consumer_key=${envConfig.consumerKey}&consumer_secret=${envConfig.consumerSecret}&per_page=1`)
            wordpressStatus = {
              connected: wpResponse.ok,
              status: wpResponse.status,
              statusText: wpResponse.statusText
            }
          } catch (error) {
            wordpressStatus = {
              connected: false,
              error: error.message
            }
          }
        }

        // Vérifier la synchronisation
        const syncResponse = await fetch('http://localhost:3001/api/sync/logs')
        const syncData = await syncResponse.ok ? await syncResponse.json() : null

        setStatusData({
          mongo: mongoData,
          wordpress: wordpressStatus,
          sync: syncData,
          timestamp: new Date().toLocaleString()
        })

        setMessage({ type: 'success', text: 'Status vérifié avec succès' })
      } catch (error) {
        setMessage({ type: 'error', text: `Erreur lors de la vérification: ${error.message}` })
      } finally {
        setIsLoading(false)
      }
    }

    const testWordPressConnection = async () => {
      setIsLoading(true)
      setMessage({ type: '', text: '' })

      try {
        const envConfig = {
          wordpressUrl: import.meta.env.VITE_WORDPRESS_URL,
          consumerKey: import.meta.env.VITE_WORDPRESS_CONSUMER_KEY,
          consumerSecret: import.meta.env.VITE_WORDPRESS_CONSUMER_SECRET
        }

        if (!envConfig.wordpressUrl || !envConfig.consumerKey || !envConfig.consumerSecret) {
          setMessage({ type: 'error', text: 'Configuration WordPress manquante dans le fichier .env' })
          return
        }

        const response = await fetch(`${envConfig.wordpressUrl}/wp-json/wc/v3/products?consumer_key=${envConfig.consumerKey}&consumer_secret=${envConfig.consumerSecret}&per_page=1`)
        
        if (response.ok) {
          setMessage({ type: 'success', text: '✅ Connexion WordPress réussie ! L\'API est accessible.' })
        } else {
          setMessage({ type: 'error', text: `❌ Erreur WordPress: ${response.status} ${response.statusText}` })
        }
      } catch (error) {
        setMessage({ type: 'error', text: `❌ Erreur de connexion WordPress: ${error.message}` })
      } finally {
        setIsLoading(false)
      }
    }

    const testMongoConnection = async () => {
      setIsLoading(true)
      setMessage({ type: '', text: '' })

      try {
        const response = await fetch('http://localhost:3001/api/debug/status')
        
        if (response.ok) {
          const data = await response.json()
          setMessage({ type: 'success', text: `✅ Connexion MongoDB réussie ! Base accessible avec ${data.debug.totalOrders} commandes.` })
        } else {
          setMessage({ type: 'error', text: `❌ Erreur MongoDB: ${response.status} ${response.statusText}` })
        }
      } catch (error) {
        setMessage({ type: 'error', text: `❌ Erreur de connexion MongoDB: ${error.message}` })
      } finally {
        setIsLoading(false)
      }
    }

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Status & Tests</h2>
            <p className="text-gray-600">
              Vérifiez l'état de toutes les connexions API et du système.
            </p>
          </div>

          <div className="space-y-6">
            {/* Boutons de test */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={checkAllStatus}
                disabled={isLoading}
                className="px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? '🔄 Vérification...' : '📊 Vérifier tout le status'}
              </button>
              
              <button
                onClick={testWordPressConnection}
                disabled={isLoading}
                className="px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? '🔄 Test...' : '🌐 Tester WordPress'}
              </button>
              
              <button
                onClick={testMongoConnection}
                disabled={isLoading}
                className="px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {isLoading ? '🔄 Test...' : '🗄️ Tester MongoDB'}
              </button>
            </div>

            {/* Message de statut */}
            {message.text && (
              <div className={`p-4 rounded-md ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {message.text}
              </div>
            )}

            {/* Affichage du status */}
            {statusData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* MongoDB Status */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">🗄️ MongoDB Status</h3>
                  {statusData.mongo ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Commandes:</span>
                        <span className="text-2xl font-bold text-blue-600">{statusData.mongo.debug.totalOrders}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Articles:</span>
                        <span className="text-2xl font-bold text-green-600">{statusData.mongo.debug.totalItems}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Statuts:</span>
                        <span className="text-2xl font-bold text-purple-600">{statusData.mongo.debug.totalStatuses}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Sans statut:</span>
                        <span className="text-2xl font-bold text-orange-600">{statusData.mongo.debug.itemsWithoutStatus}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-red-600">❌ Connexion MongoDB échouée</div>
                  )}
                </div>

                {/* WordPress Status */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">🌐 WordPress Status</h3>
                  {statusData.wordpress ? (
                    <div className="space-y-2">
                      {statusData.wordpress.connected ? (
                        <div className="text-green-600">✅ Connexion WordPress réussie</div>
                      ) : (
                        <div className="text-red-600">
                          ❌ Connexion WordPress échouée
                          {statusData.wordpress.error && <div className="text-sm mt-1">{statusData.wordpress.error}</div>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500">⚠️ Configuration WordPress non trouvée</div>
                  )}
                </div>

                {/* Sync Status */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">🔄 Synchronisation Status</h3>
                  {statusData.sync ? (
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">Dernier log:</span>
                        <div className="text-sm text-gray-600 mt-1">
                          {statusData.sync.hasLog ? statusData.sync.log?.message || 'Aucun message' : 'Aucun log disponible'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-red-600">❌ Impossible de récupérer les logs de synchronisation</div>
                  )}
                </div>
              </div>
            )}

            {/* Timestamp */}
            {statusData && (
              <div className="text-xs text-gray-500 text-center mt-4">
                Dernière vérification: {statusData.timestamp}
              </div>
            )}

            {/* Instructions */}
            {!statusData && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center">
                  <span className="text-yellow-800 text-sm">
                    💡 Cliquez sur "Vérifier tout le status" pour commencer les tests de connexion.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Onglet Modification des Commandes
  const ModificationTab = () => {
    const [searchOrderNumber, setSearchOrderNumber] = useState('')
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [selectedItem, setSelectedItem] = useState(null)
    const [newProductionType, setNewProductionType] = useState('couture')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })

    const searchOrder = async () => {
      if (!searchOrderNumber.trim()) {
        setMessage({ type: 'error', text: 'Veuillez saisir un numéro de commande' })
        return
      }

      setIsLoading(true)
      setMessage({ type: '', text: '' })

      try {
        // Rechercher la commande par numéro
        const response = await fetch(`http://localhost:3001/api/orders/search/${searchOrderNumber}`)
        if (response.ok) {
          const data = await response.json()
          if (data.order) {
            setSelectedOrder(data.order)
            setSelectedItem(null) // Reset l'article sélectionné
            setMessage({ type: 'success', text: 'Commande trouvée' })
          } else {
            setMessage({ type: 'error', text: 'Commande non trouvée' })
            setSelectedOrder(null)
            setSelectedItem(null)
          }
        } else {
          setMessage({ type: 'error', text: 'Erreur lors de la recherche' })
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Erreur de connexion' })
      } finally {
        setIsLoading(false)
      }
    }

    const selectItem = (item) => {
      setSelectedItem(item)
      // Récupérer le type de production actuel de cet article
      const currentType = item.production_status?.production_type || 'couture'
      setNewProductionType(currentType)
    }

    const redispatchOrder = async () => {
      if (!selectedItem) {
        setMessage({ type: 'error', text: 'Aucun article sélectionné' })
        return
      }

      setIsLoading(true)
      setMessage({ type: '', text: '' })

      try {
        // Redispatch l'article vers le nouveau type de production
        const response = await fetch('http://localhost:3001/api/production/redispatch', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: selectedOrder.order_id,
            line_item_id: selectedItem.line_item_id,
            new_production_type: newProductionType
          })
        })

        if (response.ok) {
          const data = await response.json()
          setMessage({ type: 'success', text: `Article redispatché vers ${newProductionType}` })
          // Mettre à jour l'article sélectionné
          setSelectedItem(prev => ({
            ...prev,
            production_status: {
              ...prev.production_status,
              production_type: newProductionType
            }
          }))
        } else {
          setMessage({ type: 'error', text: 'Erreur lors du redispatch' })
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Erreur de connexion' })
      } finally {
        setIsLoading(false)
      }
    }

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Modification des Commandes</h2>
            <p className="text-gray-600">
              Recherchez une commande par numéro et modifiez son type de production.
            </p>
          </div>

          <div className="space-y-6">
            {/* Section de recherche */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-3">🔍 Rechercher une commande</h3>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de commande
                  </label>
                  <input
                    type="text"
                    value={searchOrderNumber}
                    onChange={(e) => setSearchOrderNumber(e.target.value)}
                    placeholder="WC-123456"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={searchOrder}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? '🔍 Recherche...' : '🔍 Rechercher'}
                  </button>
                </div>
              </div>
            </div>

            {/* Message de statut */}
            {message.text && (
              <div className={`p-4 rounded-md ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {message.text}
              </div>
            )}

            {/* Liste des articles de la commande */}
            {selectedOrder && (
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">📋 Articles de la commande</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Cliquez sur un article pour modifier son type de production
                  </p>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {selectedOrder.items && selectedOrder.items.map((item, index) => (
                    <div 
                      key={item.line_item_id || index}
                      onClick={() => selectItem(item)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedItem?.line_item_id === item.line_item_id 
                          ? 'bg-blue-50 border-l-4 border-blue-500' 
                          : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {item.product_name || 'Nom du produit'}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Quantité: {item.quantity || 1}
                          </p>
                          <div className="mt-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.production_status?.production_type === 'maille'
                                ? 'bg-purple-100 text-purple-800'
                                : item.production_status?.production_type === 'couture'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {item.production_status?.production_type || 'Non défini'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            {item.production_status?.status || 'Aucun statut'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section de modification */}
            {selectedItem && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-blue-900 mb-3">✏️ Modifier le type de production</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      Article sélectionné
                    </label>
                    <input
                      type="text"
                      value={selectedItem.product_name || ''}
                      disabled
                      className="w-full px-3 py-2 border border-blue-300 rounded-md bg-blue-100 text-blue-800"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      Nouveau type de production
                    </label>
                    <select 
                      value={newProductionType}
                      onChange={(e) => setNewProductionType(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="couture">Couture</option>
                      <option value="maille">Maille</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-4">
                  <button 
                    onClick={redispatchOrder}
                    disabled={isLoading || selectedItem.production_status?.production_type === newProductionType}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? '🔄 Redispatch...' : '🔄 Redispatch'}
                  </button>
                </div>
              </div>
            )}

            {/* Instructions */}
            {!selectedOrder && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center">
                  <span className="text-yellow-800 text-sm">
                    💡 Saisissez un numéro de commande et cliquez sur "Rechercher" pour commencer.
                  </span>
                </div>
              </div>
            )}
            
            {selectedOrder && !selectedItem && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <span className="text-blue-800 text-sm">
                    💡 Cliquez sur un article dans la liste ci-dessus pour modifier son type de production.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Navigation des onglets */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'status' && <StatusTab />}
      {activeTab === 'modification' && <ModificationTab />}
    </div>
  )
}

export default ParametresPanel
