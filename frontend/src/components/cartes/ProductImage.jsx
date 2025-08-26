import React, { useState, useEffect } from 'react'

// Composant pour afficher l'image du produit
const ProductImage = ({ productId, productName, permalink }) => {
  const [imageUrl, setImageUrl] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorDetails, setErrorDetails] = useState('')

  useEffect(() => {
    if (productId) {
      // Reset l'état quand l'ID change
      setImageUrl(null)
      setHasError(false)
      setErrorDetails('')
      fetchProductImage(productId)
    }
  }, [productId])

  const fetchProductImage = async (id) => {
    if (!id) {
      // Pas d'ID de produit fourni
      setHasError(true)
      setErrorDetails('Pas d\'ID')
      return
    }

    setIsLoading(true)
    setHasError(false)
    setErrorDetails('')
    
    try {
      // Charger depuis le backend (image stockée en BDD) pour éviter CORS
      const backendUrl = 'http://localhost:3001/api/images/' + id
      const resp = await fetch(backendUrl, { method: 'GET', signal: AbortSignal.timeout(8000) })
      if (resp.ok) {
        // Utiliser l'URL directe de l'endpoint comme src
        setImageUrl(backendUrl)
      } else {
        // Fallback silencieux: garder l'icône placeholder
        setHasError(true)
        setErrorDetails('Image non trouvée')
      }
    } catch (error) {
      setHasError(true)
      setErrorDetails('Erreur image')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
      </div>
    )
  }

  if (hasError || !imageUrl) {
    return (
      <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center group relative">
        <span className="text-xs text-gray-500">🖼️</span>
        {errorDetails && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            {errorDetails}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
          </div>
        )}
      </div>
    )
  }

  return (
    <a
      href={permalink || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block"
      title="Voir l'image du produit"
    >
      <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden hover:bg-gray-200 transition-colors">
        <img 
          src={imageUrl} 
          alt={productName}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      </div>
    </a>
  )
}

export default ProductImage
