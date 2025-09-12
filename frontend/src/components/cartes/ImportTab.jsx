import React, { useState } from 'react'
import { ApiService } from '../../services/apiService'

const ImportTab = () => {
  const [orderNumber, setOrderNumber] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [error, setError] = useState('')

  const handleImport = async () => {
    if (!orderNumber.trim()) {
      setError('Veuillez saisir un numéro de commande')
      return
    }

    const orderId = parseInt(orderNumber.trim())
    if (isNaN(orderId)) {
      setError('Le numéro de commande doit être un nombre')
      return
    }

    setIsImporting(true)
    setError('')
    setImportResult(null)

    try {
      // Appeler l'API d'import
      const response = await fetch('/api/import/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
        credentials: 'include'
      })

      const result = await response.json()

      if (response.ok) {
        setImportResult({
          success: true,
          orderId: result.orderId,
          articlesCount: result.articlesCount,
          message: result.message
        })
        setOrderNumber('')
        
        // Forcer le rechargement des données
        window.dispatchEvent(new Event('mc-data-updated'))
        window.dispatchEvent(new Event('mc-refresh-data'))
      } else {
        setError(result.error || 'Erreur lors de l\'import')
      }
    } catch (error) {
      console.error('Erreur import:', error)
      setError('Erreur de connexion lors de l\'import')
    } finally {
      setIsImporting(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleImport()
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          📥 Importer une commande
        </h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Numéro de commande
            </label>
            <div className="flex space-x-3">
              <input
                type="text"
                id="orderNumber"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ex: 390565"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isImporting}
              />
              <button
                onClick={handleImport}
                disabled={isImporting || !orderNumber.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isImporting ? 'Import...' : 'Importer'}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">❌ {error}</p>
            </div>
          )}

          {importResult && (
            <div className={`p-3 rounded-md ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {importResult.success ? '✅' : '❌'} {importResult.message}
                {importResult.success && importResult.articlesCount && (
                  <span className="block mt-1">
                    📦 {importResult.articlesCount} article(s) importé(s)
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          ℹ️ Comment ça marche ?
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Saisissez le numéro de commande WordPress (ex: 390565)</li>
          <li>• La commande sera récupérée depuis WooCommerce</li>
          <li>• Les articles seront importés dans la base de données</li>
          <li>• La commande apparaîtra automatiquement dans l'application</li>
        </ul>
      </div>
    </div>
  )
}

export default ImportTab
