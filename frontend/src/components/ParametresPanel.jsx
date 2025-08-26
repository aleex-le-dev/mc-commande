import React, { useState, useEffect } from 'react'
import imageService from '../services/imageService'

const ParametresPanel = ({ isOpen, onClose }) => {
  const [cacheStats, setCacheStats] = useState({ count: 0, memoryCache: 0, failedUrls: 0 })
  const [isCleaning, setIsCleaning] = useState(false)

  // Charger les statistiques du cache
  useEffect(() => {
    if (isOpen) {
      loadCacheStats()
    }
  }, [isOpen])

  const loadCacheStats = async () => {
    try {
      const stats = await imageService.getCacheStats()
      setCacheStats(stats)
    } catch (error) {
      console.warn('Erreur lors du chargement des stats du cache:', error)
    }
  }

  const handleClearCache = async () => {
    try {
      setIsCleaning(true)
      imageService.clearCache()
      await imageService.cleanLocalDB()
      await loadCacheStats()
    } catch (error) {
      console.warn('Erreur lors du nettoyage du cache:', error)
    } finally {
      setIsCleaning(false)
    }
  }

  const handleConvertAllToBase64 = async () => {
    try {
      setIsCleaning(true)
      // Cette fonction pourrait être ajoutée au service pour convertir toutes les images
      console.log('Conversion de toutes les images en base64...')
      await loadCacheStats()
    } catch (error) {
      console.warn('Erreur lors de la conversion:', error)
    } finally {
      setIsCleaning(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Paramètres</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Section Cache d'images */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3">Cache d'images</h3>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Images en cache:</span>
                <div className="font-semibold text-blue-600">{cacheStats.count}</div>
              </div>
              <div>
                <span className="text-gray-600">Cache mémoire:</span>
                <div className="font-semibold text-green-600">{cacheStats.memoryCache}</div>
              </div>
              <div>
                <span className="text-gray-600">URLs échouées:</span>
                <div className="font-semibold text-red-600">{cacheStats.failedUrls}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleClearCache}
              disabled={isCleaning}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCleaning ? 'Nettoyage...' : 'Vider le cache'}
            </button>
            
            <button
              onClick={handleConvertAllToBase64}
              disabled={isCleaning}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
            >
              Convertir en Base64
            </button>
            
            <button
              onClick={loadCacheStats}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Actualiser
            </button>
          </div>
        </div>

        {/* Autres paramètres peuvent être ajoutés ici */}
        
        <div className="text-xs text-gray-500 mt-6">
          Le cache local améliore les performances en stockant les URLs d'images récupérées depuis WordPress.
        </div>
      </div>
    </div>
  )
}

export default ParametresPanel
