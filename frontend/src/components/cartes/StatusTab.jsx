import React, { useState, useEffect } from 'react'
import { testConnection, testSync, getProductionStats } from '../../services/mongodbService'

const StatusTab = () => {
  const [status, setStatus] = useState('')
  const [testResults, setTestResults] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const testWordPressConnection = async () => {
    setIsLoading(true)
    try {
      const result = await testConnection()
      setTestResults(prev => ({ ...prev, wordpress: result }))
      setStatus('Connexion WordPress testée avec succès')
    } catch (error) {
      setTestResults(prev => ({ ...prev, wordpress: { success: false, error: error.message } }))
      setStatus('Erreur de connexion WordPress')
    }
    setIsLoading(false)
  }

  const testDatabaseConnection = async () => {
    setIsLoading(true)
    try {
      const result = await testSync()
      setTestResults(prev => ({ ...prev, database: result }))
      setStatus('Connexion base de données testée avec succès')
    } catch (error) {
      setTestResults(prev => ({ ...prev, database: { success: false, error: error.message } }))
      setStatus('Erreur de connexion base de données')
    }
    setIsLoading(false)
  }

  const testDatabaseStats = async () => {
    setIsLoading(true)
    try {
      const result = await getProductionStats()
      setTestResults(prev => ({ ...prev, stats: { success: true, data: result } }))
      setStatus('Statistiques de la base récupérées avec succès')
    } catch (error) {
      setTestResults(prev => ({ ...prev, stats: { success: false, error: error.message } }))
      setStatus('Erreur lors de la récupération des statistiques')
    }
    setIsLoading(false)
  }

  const testAll = async () => {
    setIsLoading(true)
    setStatus('Tests en cours...')
    
    // Tests séquentiels
    await testWordPressConnection()
    await testDatabaseConnection()
    await testDatabaseStats()
    
    setStatus('Tous les tests terminés')
    setIsLoading(false)
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

        <div className="space-y-6">
          {/* Tests de connexion */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Tests de connexion</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={testWordPressConnection}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Test en cours...' : 'Tester WordPress'}
              </button>
              <button
                onClick={testDatabaseConnection}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Test en cours...' : 'Tester Base de données'}
              </button>
            </div>
          </div>

          {/* Tests de fonctionnalités */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Tests de fonctionnalités</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={testDatabaseStats}
                disabled={isLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {isLoading ? 'Test en cours...' : 'Statistiques DB'}
              </button>
              <button
                onClick={testAll}
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {isLoading ? 'Tests en cours...' : 'Tester Tout'}
              </button>
            </div>
          </div>

          {/* Résultats des tests */}
          {Object.keys(testResults).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Résultats des tests</h3>
              <div className="space-y-3">
                {testResults.wordpress && (
                  <div className={`p-3 rounded-md ${testResults.wordpress.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Connexion WordPress</span>
                      <span className={`text-sm ${testResults.wordpress.success ? 'text-green-800' : 'text-red-800'}`}>
                        {testResults.wordpress.success ? '✅ Succès' : '❌ Échec'}
                      </span>
                    </div>
                    {!testResults.wordpress.success && (
                      <p className="text-sm text-red-700 mt-1">{testResults.wordpress.error}</p>
                    )}
                  </div>
                )}
                {testResults.database && (
                  <div className={`p-3 rounded-md ${testResults.database.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Connexion Base de données</span>
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
                  <div className={`p-3 rounded-md ${testResults.stats.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Statistiques Base de données</span>
                      <span className={`text-sm ${testResults.stats.success ? 'text-green-800' : 'text-red-800'}`}>
                        {testResults.stats.success ? '✅ Succès' : '❌ Échec'}
                      </span>
                    </div>
                    {testResults.stats.success && testResults.stats.data && (
                      <div className="mt-2 text-sm text-green-700">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="font-semibold">📊 Commandes: {testResults.stats.data.totalOrders || 0}</p>
                            <p className="font-semibold">📦 Articles: {testResults.stats.data.totalItems || 0}</p>
                            <p className="font-semibold">🏷️ Statuts: {testResults.stats.data.totalStatuses || 0}</p>
                          </div>
                        </div>
                        
                        {/* Statistiques par type de production (filtrées) */}
                        {testResults.stats.data.statusesByType && testResults.stats.data.statusesByType.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-green-200">
                            <p className="font-semibold text-xs text-green-600 mb-1">Par type de production:</p>
                            <div className="flex flex-wrap gap-2">
                              {testResults.stats.data.statusesByType
                                .filter(type => type._id && type._id !== 'pending')
                                .map((type, index) => (
                                  <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                    {type._id}: {type.count}
                                  </span>
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
              </div>
            </div>
          )}

          {/* Status général */}
          {status && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">{status}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StatusTab
