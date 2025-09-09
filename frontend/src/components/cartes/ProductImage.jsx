import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { getBackendUrl } from '../../config/api.js'

// Cache global pour les images déjà chargées
const imageCache = new Map()

// Composant pour afficher l'image du produit
const ProductImage = ({ productId, productName, permalink }) => {
  const [imageUrl, setImageUrl] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorDetails, setErrorDetails] = useState('')
  const abortControllerRef = useRef(null)
  
  // URL mémorisée pour éviter les re-calculs
  const backendUrl = useMemo(() => {
    if (!productId) return null
    const baseUrl = getBackendUrl()
    return `${baseUrl}/api/images/${productId}`
  }, [productId])

  useEffect(() => {
    if (productId && backendUrl) {
      // Vérifier d'abord le cache
      if (imageCache.has(productId)) {
        setImageUrl(imageCache.get(productId))
        setHasError(false)
        setErrorDetails('')
        return
      }

      // Reset l'état
      setImageUrl(null)
      setHasError(false)
      setErrorDetails('')
      
      // Annuler la requête précédente si elle existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Créer un nouveau contrôleur d'annulation
      abortControllerRef.current = new AbortController()
      
      fetchProductImage(productId, abortControllerRef.current.signal)
    }

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [productId, backendUrl, fetchProductImage])

  const fetchProductImage = useCallback(async (id, signal) => {
    if (!id || !backendUrl) {
      setHasError(true)
      setErrorDetails('Pas d\'ID')
      return
    }

    setIsLoading(true)
    setHasError(false)
    setErrorDetails('')
    
    try {
      // Timeout ultra-rapide pour les images
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)
      
      const resp = await fetch(backendUrl, { 
        method: 'GET', 
        signal: controller.signal,
        // Headers pour optimiser le chargement
        headers: {
          'Accept': 'image/avif,image/webp,image/jpeg,image/png,*/*',
          'Cache-Control': 'max-age=86400'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (resp.ok) {
        // Mettre en cache l'URL
        imageCache.set(id, backendUrl)
        setImageUrl(backendUrl)
      } else if (resp.status === 502) {
        setHasError(true)
        setErrorDetails('Service indisponible')
      } else {
        setHasError(true)
        setErrorDetails('Image non trouvée')
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        // Timeout - afficher une image par défaut
        setHasError(true)
        setErrorDetails('Timeout')
        return
      }
      setHasError(true)
      setErrorDetails('Erreur image')
    } finally {
      setIsLoading(false)
    }
  }, [backendUrl])

  if (isLoading) {
    return (
      <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
        <div className="w-3 h-3 bg-gray-300 rounded"></div>
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
          loading="eager"
          decoding="async"
          onError={() => {
            // En cas d'erreur de chargement, retirer du cache et afficher l'erreur
            imageCache.delete(productId)
            setHasError(true)
            setErrorDetails('Erreur de chargement')
          }}
        />
      </div>
    </a>
  )
}

export default ProductImage
