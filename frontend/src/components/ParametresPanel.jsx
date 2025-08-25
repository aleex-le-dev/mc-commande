import React, { useState } from 'react'
import { FiSave, FiCheckCircle, FiEye, FiEyeOff, FiInfo, FiEdit3, FiDatabase } from 'react-icons/fi'

const ParametresPanel = () => {
  const [activeTab, setActiveTab] = useState('configuration')
  const [config, setConfig] = useState({
    wordpressUrl: '',
    consumerKey: '',
    consumerSecret: '',
    version: 'wc/v3'
  })
  const [showSecrets, setShowSecrets] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [isEnvConfig, setIsEnvConfig] = useState(false)

  // Onglets disponibles
  const tabs = [
    { id: 'configuration', label: 'Configuration WordPress', icon: '⚙️' },
    { id: 'modification', label: 'Modification des Commandes', icon: '✏️' }
  ]

  // Configuration WordPress (ancien OrderForm)
  const ConfigurationTab = () => {
    React.useEffect(() => {
      // Vérifier si la configuration vient des variables d'environnement
      const envConfig = {
        wordpressUrl: import.meta.env.VITE_WORDPRESS_URL,
        consumerKey: import.meta.env.VITE_WORDPRESS_CONSUMER_KEY,
        consumerSecret: import.meta.env.VITE_WORDPRESS_CONSUMER_SECRET,
        version: import.meta.env.VITE_WORDPRESS_API_VERSION || 'wc/v3'
      }

      if (envConfig.wordpressUrl && envConfig.consumerKey && envConfig.consumerSecret) {
        setIsEnvConfig(true)
        setConfig(envConfig)
        setMessage({ 
          type: 'success', 
          text: 'Configuration chargée depuis les variables d\'environnement (.env)' 
        })
      } else {
        // Charger la configuration depuis le localStorage
        const savedConfig = localStorage.getItem('wordpressConfig')
        if (savedConfig) {
          setConfig(JSON.parse(savedConfig))
        }
      }
    }, [])

    const handleInputChange = (key, value) => {
      setConfig(prev => ({ ...prev, [key]: value }))
    }

    const saveConfig = () => {
      setIsLoading(true)
      setMessage({ type: '', text: '' })
      
      try {
        localStorage.setItem('wordpressConfig', JSON.stringify(config))
        setMessage({ type: 'success', text: 'Configuration sauvegardée avec succès' })
      } catch (error) {
        setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' })
      } finally {
        setIsLoading(false)
      }
    }

    const testConnection = async () => {
      setIsLoading(true)
      setMessage({ type: '', text: '' })
      
      try {
        const response = await fetch(`${config.wordpressUrl}/wp-json/wc/v3/products?consumer_key=${config.consumerKey}&consumer_secret=${config.consumerSecret}`)
        
        if (response.ok) {
          setMessage({ type: 'success', text: 'Connexion réussie ! L\'API WordPress est accessible.' })
        } else {
          setMessage({ type: 'error', text: `Erreur de connexion: ${response.status} ${response.statusText}` })
        }
      } catch (error) {
        setMessage({ type: 'error', text: `Erreur de connexion: ${error.message}` })
      } finally {
        setIsLoading(false)
      }
    }

    const generateKeys = () => {
      const instructions = `
Pour générer vos clés d'API WooCommerce :

1. Connectez-vous à votre WordPress
2. Allez dans WooCommerce > Paramètres > Avancé > API REST
3. Cliquez sur "Ajouter une clé"
4. Donnez un nom à votre clé (ex: "Maisoncléo App")
5. Sélectionnez les permissions "Lecture/Écriture"
6. Cliquez sur "Générer une clé"
7. Copiez la clé consommateur et le secret consommateur
8. Collez-les dans ce formulaire

Votre URL WordPress doit être l'URL de votre site (ex: https://monsite.com)
      `
      alert(instructions)
    }

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuration WordPress</h2>
            <p className="text-gray-600">
              Configurez la connexion à votre site WordPress pour récupérer les commandes WooCommerce.
            </p>
            
            {isEnvConfig && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center">
                  <FiInfo className="text-blue-600 mr-2" />
                  <span className="text-blue-800 text-sm">
                    Configuration chargée depuis le fichier .env
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* URL WordPress */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL de votre site WordPress
              </label>
              <input
                type="url"
                value={config.wordpressUrl}
                onChange={(e) => handleInputChange('wordpressUrl', e.target.value)}
                placeholder="https://monsite.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                L'URL complète de votre site WordPress (sans / à la fin)
              </p>
            </div>

            {/* Clé consommateur */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clé consommateur
              </label>
              <div className="relative">
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={config.consumerKey}
                  onChange={(e) => handleInputChange('consumerKey', e.target.value)}
                  placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showSecrets ? <FiEyeOff className="h-5 w-5 text-gray-400" /> : <FiEye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
            </div>

            {/* Secret consommateur */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secret consommateur
              </label>
              <div className="relative">
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={config.consumerSecret}
                  onChange={(e) => handleInputChange('consumerSecret', e.target.value)}
                  placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showSecrets ? <FiEyeOff className="h-5 w-5 text-gray-400" /> : <FiEye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
            </div>

            {/* Version API */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Version de l'API
              </label>
              <select
                value={config.version}
                onChange={(e) => handleInputChange('version', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="wc/v3">WooCommerce v3 (recommandé)</option>
                <option value="wc/v2">WooCommerce v2</option>
              </select>
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

            {/* Boutons d'action */}
            <div className="flex space-x-4 pt-4">
              <button
                onClick={saveConfig}
                disabled={isLoading || !config.wordpressUrl || !config.consumerKey || !config.consumerSecret || isEnvConfig}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSave className="mr-2" />
                Sauvegarder
              </button>
              
              <button
                onClick={testConnection}
                disabled={isLoading || !config.wordpressUrl || !config.consumerKey || !config.consumerSecret}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiCheckCircle className="mr-2" />
                Tester la connexion
              </button>
            </div>

            {isEnvConfig && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center">
                  <FiInfo className="text-yellow-600 mr-2" />
                  <span className="text-yellow-800 text-sm">
                    Pour modifier la configuration, éditez le fichier .env et redémarrez l'application
                  </span>
                </div>
              </div>
            )}

            {/* Aide */}
            <div className="pt-6 border-t border-gray-200">
              <button
                onClick={generateKeys}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Comment générer mes clés d'API ?
              </button>
            </div>
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
                      Type de production actuel
                    </label>
                    <input
                      type="text"
                      value={selectedItem.production_status?.production_type || 'Non défini'}
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
      {activeTab === 'configuration' && <ConfigurationTab />}
      {activeTab === 'modification' && <ModificationTab />}
    </div>
  )
}

export default ParametresPanel
