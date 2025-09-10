import React, { useState, useEffect } from 'react'
import { FiSave, FiCheckCircle, FiEye, FiEyeOff, FiInfo } from 'react-icons/fi'

const OrderForm = () => {
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

  useEffect(() => {
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
      // OPTIMISATION: Test de connexion léger au lieu de charger tous les produits
      const response = await fetch(`${config.wordpressUrl}/wp-json/wc/v3/products?consumer_key=${config.consumerKey}&consumer_secret=${config.consumerSecret}&per_page=1&_fields=id`, {
        signal: AbortSignal.timeout(10000) // 10s timeout
      })
      
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

export default OrderForm
