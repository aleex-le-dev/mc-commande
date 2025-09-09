import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { getBackendUrl } from '../../config/api.js'
import LazyImage from '../LazyImage.jsx'

// Cache global ultra-optimisé pour les images
const imageCache = new Map()
const preloadQueue = new Set()
const loadingPromises = new Map()

// Service de préchargement intelligent
const ImagePreloader = {
  // Précharger une image en arrière-plan
  preload: (url) => {
    if (imageCache.has(url) || preloadQueue.has(url)) return Promise.resolve()
    
    preloadQueue.add(url)
    const promise = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        imageCache.set(url, url)
        preloadQueue.delete(url)
        loadingPromises.delete(url)
        resolve(url)
      }
      img.onerror = () => {
        preloadQueue.delete(url)
        loadingPromises.delete(url)
        reject(new Error('Failed to preload image'))
      }
      img.src = url
    })
    
    loadingPromises.set(url, promise)
    return promise
  },
  
  // Précharger plusieurs images en parallèle
  preloadBatch: (urls) => {
    return Promise.allSettled(urls.map(url => ImagePreloader.preload(url)))
  }
}

// Composant ultra-optimisé pour afficher l'image du produit
const ProductImage = ({ productId, productName, permalink, priority = false }) => {
  const [imageUrl, setImageUrl] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorDetails, setErrorDetails] = useState('')
  const abortControllerRef = useRef(null)
  
  // URL optimisée avec cache intelligent et persistance
  const backendUrl = useMemo(() => {
    if (!productId) return null
    const baseUrl = getBackendUrl()
    // Cache intelligent - pas de timestamp pour les images déjà chargées
    const cacheKey = `${baseUrl}/api/images/${productId}?w=256&q=75&f=webp`
    return cacheKey
  }, [productId])

  useEffect(() => {
    if (productId && backendUrl) {
      // Vérifier d'abord le cache global
      if (imageCache.has(backendUrl)) {
        setImageUrl(imageCache.get(backendUrl))
        setHasError(false)
        setErrorDetails('')
        return
      }

      // Si l'image est en cours de chargement, attendre
      if (loadingPromises.has(backendUrl)) {
        loadingPromises.get(backendUrl).then(() => {
          if (imageCache.has(backendUrl)) {
            setImageUrl(imageCache.get(backendUrl))
            setHasError(false)
            setErrorDetails('')
          }
        }).catch(() => {
          setHasError(true)
          setErrorDetails('Erreur de chargement')
        })
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
      
      // Chargement immédiat pour les images prioritaires
      if (priority) {
        fetchProductImage(productId, abortControllerRef.current.signal)
      } else {
        // Préchargement en arrière-plan pour les autres
        ImagePreloader.preload(backendUrl).then(() => {
          if (imageCache.has(backendUrl)) {
            setImageUrl(imageCache.get(backendUrl))
            setHasError(false)
            setErrorDetails('')
          }
        }).catch(() => {
          setHasError(true)
          setErrorDetails('Erreur de préchargement')
        })
      }
    }

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [productId, backendUrl, priority])

  const fetchProductImage = useCallback(async (id, signal) => {
    if (!id || !backendUrl) {
      setHasError(true)
      setErrorDetails('Pas d\'ID')
      return
    }

    console.log(`🖼️ Chargement prioritaire image ${id}: ${backendUrl}`)
    setIsLoading(true)
    setHasError(false)
    setErrorDetails('')
    
    try {
      // Timeout ultra-rapide pour les images (2 secondes)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)
      
      const resp = await fetch(backendUrl, { 
        method: 'GET', 
        signal: controller.signal,
        // Headers optimisés pour Render (maintenant autorisés par CORS)
        headers: {
          'Accept': 'image/avif,image/webp,image/jpeg,image/png,*/*',
          'Cache-Control': 'max-age=86400',
          'Connection': 'keep-alive'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (resp.ok) {
        // Mettre en cache l'URL
        imageCache.set(backendUrl, backendUrl)
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
      <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center animate-pulse">
        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
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
      className="inline-block group"
      title="Voir l'image du produit"
    >
      <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden hover:bg-gray-200 transition-all duration-150 hover:scale-105">
        <LazyImage
          src={imageUrl}
          alt={productName}
          className="w-full h-full object-cover transition-transform duration-150 group-hover:scale-110"
          priority={priority}
          onError={() => {
            imageCache.delete(backendUrl)
            setHasError(true)
            setErrorDetails('Erreur de chargement')
          }}
        />
      </div>
    </a>
  )
}

// Export du service de préchargement pour utilisation externe
export { ImagePreloader }

export default ProductImage
