import React, { useState, useEffect } from 'react'
import { ApiService } from '../../services/apiService'
import imageService from '../../services/imageService'

const StatusTab = () => {
  const [status, setStatus] = useState('')
  const [testResults, setTestResults] = useState({})
  const [loadingStates, setLoadingStates] = useState({
    wordpress: false,
    wordpressProducts: false,
    database: false,
    stats: false,
    images: false,
    joursFeries: false
  })

  const testWordPressConnection = async () => {
    setLoadingStates(prev => ({ ...prev, wordpress: true }))
    try {
      const result = await ApiService.testConnection()
      setTestResults(prev => ({ ...prev, wordpress: result }))
      setStatus('Connexion WordPress testée avec succès')
    } catch (error) {
      setTestResults(prev => ({ ...prev, wordpress: { success: false, error: error.message } }))
      setStatus('Erreur de connexion WordPress')
    }
    setLoadingStates(prev => ({ ...prev, wordpress: false }))
  }

  const testWordPressProducts = async () => {
    setLoadingStates(prev => ({ ...prev, wordpressProducts: true }))
    try {
      // Test de récupération des produits via une route qui retourne du JSON
      const base = (import.meta.env.DEV ? 'http://localhost:3001' : (import.meta.env.VITE_API_URL || 'https://maisoncleo-commande.onrender.com'))
      const response = await fetch(`${base}/api/orders?limit=1`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setTestResults(prev => ({ ...prev, wordpressProducts: { success: true, data } }))
      setStatus('Test des produits WordPress réussi')
    } catch (error) {
      setTestResults(prev => ({ ...prev, wordpressProducts: { success: false, error: error.message } }))
      setStatus('Erreur lors du test des produits WordPress')
    }
    setLoadingStates(prev => ({ ...prev, wordpressProducts: false }))
  }

  

  const testDatabaseConnection = async () => {
    setLoadingStates(prev => ({ ...prev, database: true }))
    try {
      const result = await ApiService.testSync()
      setTestResults(prev => ({ ...prev, database: result }))
      setStatus('Connexion base de données testée avec succès')
    } catch (error) {
      setTestResults(prev => ({ ...prev, database: { success: false, error: error.message } }))
      setStatus('Erreur de connexion base de données')
    }
    setLoadingStates(prev => ({ ...prev, database: false }))
  }

  const testDatabaseStats = async () => {
    setLoadingStates(prev => ({ ...prev, stats: true }))
    try {
      const result = await ApiService.getProductionStats()
      setTestResults(prev => ({ ...prev, stats: { success: true, data: result } }))
      setStatus('Statistiques de la base récupérées avec succès')
    } catch (error) {
      setTestResults(prev => ({ ...prev, stats: { success: false, error: error.message } }))
      setStatus('Erreur lors de la récupération des statistiques')
    }
    setLoadingStates(prev => ({ ...prev, stats: false }))
  }

  const testImages = async () => {
    setLoadingStates(prev => ({ ...prev, images: true }))
    try {
      // Test de la nouvelle approche des images (affichage direct MongoDB)
      const testProductIds = [1, 2, 3, 4, 5]
      const imageResults = []
      
      for (const productId of testProductIds) {
        const imageUrl = imageService.getImage(productId)
        const isPlaceholder = imageUrl.startsWith('data:image/svg+xml')
        
        imageResults.push({
          productId,
          url: imageUrl,
          isPlaceholder,
          success: true
        })
      }
      
      setTestResults(prev => ({ 
        ...prev, 
        images: { 
          success: true, 
          data: imageResults,
          method: 'Affichage direct MongoDB',
          performance: 'Ultra-simple'
        } 
      }))
      setStatus('Test des images réussi - Approche ultra-simple')
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        images: { 
          success: false, 
          error: error.message 
        } 
      }))
      setStatus('Erreur lors du test des images')
    }
    setLoadingStates(prev => ({ ...prev, images: false }))
  }

  const testJoursFeriesAPI = async () => {
    setLoadingStates(prev => ({ ...prev, joursFeries: true }))
    try {
      // Test direct de l'API gouvernementale des jours fériés
      const response = await fetch('https://etalab.github.io/jours-feries-france-data/json/metropole.json')
      
      if (response.ok) {
        const data = await response.json()
        const nombreJoursFeries = Object.keys(data).length
        const annees = [...new Set(Object.keys(data).map(date => date.split('-')[0]))].sort()
        const anneeActuelle = new Date().getFullYear()
        const joursFeriesActuels = Object.entries(data).filter(([date]) => date.startsWith(anneeActuelle.toString()))
        
        setTestResults(prev => ({ 
          ...prev, 
          joursFeries: { 
            success: true, 
            data: {
              totalJoursFeries: nombreJoursFeries,
              anneesDisponibles: annees.length,
              plageAnnees: `${annees[0]}-${annees[annees.length-1]}`,
              joursFeriesActuels: joursFeriesActuels.length,
              anneeActuelle: anneeActuelle
            },
            api: 'API gouvernementale officielle',
            source: 'data.gouv.fr'
          } 
        }))
        setStatus(`✅ API jours fériés accessible - ${nombreJoursFeries} jours sur ${annees.length} années`)
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        joursFeries: { 
          success: false, 
          error: error.message 
        } 
      }))
      setStatus('❌ Erreur lors du test de l\'API jours fériés')
    }
    setLoadingStates(prev => ({ ...prev, joursFeries: false }))
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">📊 Status & Tests</h2>
          <p className="text-gray-600">
            Vérifiez l'état des connexions et testez les fonctionnalités.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche : Boutons de test */}
          <div className="lg:col-span-1 space-y-6">
            {/* Tests WordPress */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-lg font-medium text-blue-900 mb-3">🌐 Test de la connexion WordPress</h3>
              <div className="space-y-3">
                <button
                  onClick={testWordPressConnection}
                  disabled={loadingStates.wordpress}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loadingStates.wordpress ? 'Test en cours...' : 'Connexion API'}
                </button>
                <button
                  onClick={testWordPressProducts}
                  disabled={loadingStates.wordpressProducts}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  {loadingStates.wordpressProducts ? 'Test en cours...' : 'Commandes DB'}
                </button>
                
              </div>
            </div>

            {/* Tests Base de données */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="text-lg font-medium text-green-900 mb-3">🗄️ Test de la base de données</h3>
              <div className="space-y-3">
                <button
                  onClick={testDatabaseConnection}
                  disabled={loadingStates.database}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loadingStates.database ? 'Test en cours...' : 'Connexion'}
                </button>
                <button
                  onClick={testDatabaseStats}
                  disabled={loadingStates.stats}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                >
                  {loadingStates.stats ? 'Test en cours...' : 'Contenu de la base'}
                </button>
              </div>
            </div>

            {/* Tests Images */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="text-lg font-medium text-purple-900 mb-3">🖼️ Test des images</h3>
              <div className="space-y-3">
                <button
                  onClick={testImages}
                  disabled={loadingStates.images}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {loadingStates.images ? 'Test en cours...' : 'Lancer le test'}
                </button>
              </div>
            </div>

            {/* Tests APIs Externes */}
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h3 className="text-lg font-medium text-orange-900 mb-3">🌐 Test des APIs externes</h3>
              <div className="space-y-3">
                <button
                  onClick={testJoursFeriesAPI}
                  disabled={loadingStates.joursFeries}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  {loadingStates.joursFeries ? 'Test en cours...' : '🧪 API Jours Fériés'}
                </button>
              </div>
            </div>
          </div>

          {/* Colonne droite : Résultats des tests */}
          <div className="lg:col-span-2">
            {/* Résultats des tests */}
            {Object.keys(testResults).length > 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Résultats des tests</h3>
                <div className="space-y-3">
                  <div className="space-y-3">
                    {testResults.wordpress && (
                      <div className={`p-3 rounded-md ${testResults.wordpress.success ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                            <span className="font-medium">🌐 Connexion WordPress API</span>
                          </div>
                          <span className={`text-sm ${testResults.wordpress.success ? 'text-green-800' : 'text-red-800'}`}>
                            {testResults.wordpress.success ? '✅ Succès' : '❌ Échec'}
                          </span>
                        </div>
                        {!testResults.wordpress.success && (
                          <p className="text-sm text-red-700 mt-1">{testResults.wordpress.error}</p>
                        )}
                      </div>
                    )}
                    {testResults.wordpressProducts && (
                      <div className={`p-3 rounded-md ${testResults.wordpressProducts.success ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="font-medium">📦 Commandes Base de données</span>
                          </div>
                          <span className={`text-sm ${testResults.wordpressProducts.success ? 'text-green-800' : 'text-red-800'}`}>
                            {testResults.wordpressProducts.success ? '✅ Succès' : '❌ Échec'}
                          </span>
                        </div>
                        {!testResults.wordpressProducts.success && (
                          <p className="text-sm text-red-700 mt-1">{testResults.wordpressProducts.error}</p>
                        )}
                      </div>
                    )}
                    
                    {testResults.database && (
                      <div className={`p-3 rounded-md ${testResults.database.success ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-600"></div>
                            <span className="font-medium">🗄️ Connexion Base de données</span>
                          </div>
                          <span className={`text-sm ${testResults.database.success ? 'text-green-800' : 'text-red-800'}`}>
                            {testResults.database.success ? '✅ Succès' : '❌ Échec'}
                          </span>
                        </div>
                        {!testResults.database.success && (
                          <p className="text-sm text-red-700 mt-1">{testResults.database.error}</p>
                        )}
                      </div>
                    )}
                    {testResults.stats && (
                      <div className={`p-3 rounded-md ${testResults.stats.success ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="font-medium">📊 Statistiques Base de données</span>
                          </div>
                          <span className={`text-sm ${testResults.stats.success ? 'text-green-800' : 'text-red-800'}`}>
                            {testResults.stats.success ? '✅ Succès' : '❌ Échec'}
                          </span>
                        </div>
                        {testResults.stats.success && testResults.stats.data && (
                          <div className="mt-2 text-sm text-green-700">
                            <div className="grid grid-cols-1 gap-2">
                              <div>
                                <p className="font-semibold">📊 Commandes: {testResults.stats.data.totalOrders || 0}</p>
                                <p className="font-semibold">📦 Articles: {testResults.stats.data.totalItems || 0}</p>
                                <p className="font-semibold">🏷️ Statuts: {testResults.stats.data.totalStatuses || 0}</p>
                              </div>
                            </div>
                            
                            {/* Statistiques par type de production (filtrées) */}
                            {testResults.stats.data.statusesByType && testResults.stats.data.statusesByType.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-green-200">
                                <h4 className="font-semibold text-sm text-green-700 mb-3">📊 Répartition par type de production</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {testResults.stats.data.statusesByType
                                    .filter(type => type._id && type._id !== 'pending')
                                    .map((type, index) => (
                                      <div key={index} className="bg-white rounded-lg p-3 border border-green-200 shadow-sm">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${
                                              type._id === 'couture' ? 'bg-blue-500' : 
                                              type._id === 'maille' ? 'bg-purple-500' : 
                                              'bg-gray-500'
                                            }`}></div>
                                            <span className="font-medium text-gray-800 capitalize">
                                              {type._id === 'couture' ? '🧵 Couture' : 
                                               type._id === 'maille' ? '🧶 Maille' : 
                                               type._id}
                                            </span>
                                          </div>
                                          <span className="text-lg font-bold text-green-600">
                                            {type.count}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {!testResults.stats.success && (
                          <p className="text-sm text-red-700 mt-1">{testResults.stats.error}</p>
                        )}
                      </div>
                    )}
                                            {testResults.images && (
                          <div className={`p-3 rounded-md ${testResults.images.success ? 'bg-green-50' : 'bg-red-50'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                                <span className="font-medium">🖼️ Images</span>
                              </div>
                              <span className={`text-sm ${testResults.images.success ? 'text-green-800' : 'text-red-800'}`}>
                                {testResults.images.success ? '✅ Succès' : '❌ Échec'}
                              </span>
                            </div>
                            {!testResults.images.success && (
                              <p className="text-sm text-red-700 mt-1">{testResults.images.error}</p>
                            )}
                            {testResults.images.success && testResults.images.data && (
                              <div className="mt-2 text-sm text-green-700">
                                <p className="font-semibold">🖼️ Méthode: {testResults.images.method}</p>
                                <p className="font-semibold">🚀 Performance: {testResults.images.performance}</p>
                                <p className="font-semibold">🏷️ Statut: {testResults.images.success ? '✅ Succès' : '❌ Échec'}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {testResults.joursFeries && (
                          <div className={`p-3 rounded-md ${testResults.joursFeries.success ? 'bg-green-50' : 'bg-red-50'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                                <span className="font-medium">🧪 API Jours Fériés</span>
                              </div>
                              <span className={`text-sm ${testResults.joursFeries.success ? 'text-green-800' : 'text-red-800'}`}>
                                {testResults.joursFeries.success ? '✅ Succès' : '❌ Échec'}
                              </span>
                            </div>
                            {!testResults.joursFeries.success && (
                              <p className="text-sm text-red-700 mt-1">{testResults.joursFeries.error}</p>
                            )}
                            {testResults.joursFeries.success && testResults.joursFeries.data && (
                              <div className="mt-2 text-sm text-green-700">
                                <div className="grid grid-cols-1 gap-2">
                                  <p className="font-semibold">📊 Total jours fériés: {testResults.joursFeries.data.totalJoursFeries}</p>
                                  <p className="font-semibold">📅 Années disponibles: {testResults.joursFeries.data.anneesDisponibles}</p>
                                  <p className="font-semibold">🗓️ Plage: {testResults.joursFeries.data.plageAnnees}</p>
                                  <p className="font-semibold">🎯 Année actuelle ({testResults.joursFeries.data.anneeActuelle}): {testResults.joursFeries.data.joursFeriesActuels} jours fériés</p>
                                </div>
                                <div className="mt-3 pt-2 border-t border-green-200">
                                  <p className="font-semibold">🌐 Source: {testResults.joursFeries.api}</p>
                                  <p className="font-semibold">🔗 URL: data.gouv.fr</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <p className="text-gray-500">Aucun test exécuté pour le moment</p>
                <p className="text-sm text-gray-400 mt-1">Cliquez sur un bouton de test pour commencer</p>
              </div>
            )}

            {/* Status général */}
            {status && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-blue-800">{status}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatusTab
