import React, { useState, useEffect } from 'react'
import imageService from '../services/imageService'

/**
 * Composant de test ultra-simple pour vérifier l'affichage des images
 * Code ultra-propre - seulement l'essentiel
 */
const ImageTest = () => {
  const [backendStatus, setBackendStatus] = useState('Vérification...')
  const [testImages, setTestImages] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    checkBackendStatus()
    loadTestImages()
  }, [])

  const checkBackendStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/production-status', {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      })
      
      if (response.ok) {
        setBackendStatus('✅ Backend connecté')
      } else {
        setBackendStatus(`❌ Backend erreur: ${response.status}`)
      }
    } catch (error) {
      setBackendStatus(`❌ Backend inaccessible: ${error.message}`)
    }
  }

  const loadTestImages = () => {
    setIsLoading(true)
    
    // Test avec quelques IDs de produits
    const testProductIds = [1, 2, 3, 4, 5]
    const images = testProductIds.map(productId => ({
      productId,
      image: imageService.getImage(productId),
      source: 'MongoDB Direct'
    }))
    
    setTestImages(images)
    setIsLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">🧪 Test des Images Ultra-Propre</h1>
      
      {/* Méthode d'affichage */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-2">📊 Méthode d'Affichage</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-green-50 p-3 rounded">
            <strong className="text-green-800">Méthode:</strong>
            <p className="text-green-600">Direct MongoDB</p>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <strong className="text-blue-800">Performance:</strong>
            <p className="text-blue-600">Ultra-rapide</p>
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <strong className="text-purple-800">Code:</strong>
            <p className="text-purple-600">Ultra-propre</p>
          </div>
        </div>
        
        <div className="mt-4">
          <button 
            onClick={loadTestImages}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isLoading ? 'Chargement...' : 'Actualiser'}
          </button>
        </div>
      </div>
      
      {/* Statut du Backend */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-2">🔌 Statut du Backend</h2>
        <p className="text-sm mb-2">{backendStatus}</p>
        <button 
          onClick={checkBackendStatus}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Vérifier à nouveau
        </button>
      </div>

      {/* Test des Images */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-2">🖼️ Test des Images MongoDB</h2>
        
        {testImages.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testImages.map((item) => (
              <div key={item.productId} className="border rounded p-3">
                <h3 className="font-medium mb-2">Produit {item.productId}</h3>
                <p className="text-sm text-gray-600 mb-2">Source: {item.source}</p>
                <img 
                  src={item.image} 
                  alt={`Produit ${item.productId}`}
                  className="w-full h-32 object-cover rounded"
                  onError={(e) => {
                    e.target.src = imageService.getDefaultPlaceholder()
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Avantages */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">🚀 Code Ultra-Propre</h2>
        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-green-500">✅</span>
            <span><strong>2 fonctions seulement:</strong> getImage + placeholder</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✅</span>
            <span><strong>25 lignes de code:</strong> Service ultra-minimal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✅</span>
            <span><strong>Zéro complexité:</strong> Affichage direct</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✅</span>
            <span><strong>Performance maximale:</strong> Pas d'intermédiaire</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageTest
