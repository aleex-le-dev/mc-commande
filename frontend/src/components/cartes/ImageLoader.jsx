import React, { useState, useEffect, useCallback } from 'react'

/**
 * Composant ImageLoader optimisé pour gérer les erreurs HTTP/2
 * et les problèmes de protocole avec retry automatique
 */
const ImageLoader = React.memo(({ 
  src, 
  alt, 
  className = '', 
  fallback = '📦',
  maxRetries = 3,
  retryDelay = 1000,
  onLoad,
  onError 
}) => {
  const [imageSrc, setImageSrc] = useState(src)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  // Réinitialiser l'état quand la source change
  useEffect(() => {
    setImageSrc(src)
    setHasError(false)
    setRetryCount(0)
    
    // Vérifier si l'image est déjà en cache
    if (src) {
      const img = new Image()
      img.onload = () => {
        // Image déjà en cache, affichage immédiat
        setIsLoading(false)
        onLoad?.()
      }
      img.onerror = () => {
        // Image pas en cache, afficher le loading
        setIsLoading(true)
      }
      img.src = src
    } else {
      setIsLoading(false)
    }
  }, [src, onLoad])

  // Gestion d'erreur avec retry automatique
  const handleError = useCallback(() => {
    setHasError(true)
    setIsLoading(false)
    
    // Si c'est une image base64 ou par défaut, pas de retry nécessaire
    if (src && (src.startsWith('data:image/') || src.includes('default'))) {
      console.debug('Image par défaut en erreur, pas de retry')
      return
    }
    
    if (retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * retryDelay
      setTimeout(() => {
        setRetryCount(prev => prev + 1)
        setHasError(false)
        setIsLoading(true)
        
        // Ajouter un timestamp pour éviter le cache et les erreurs HTTP/2
        const newSrc = src.includes('?') ? `${src}&retry=${Date.now()}` : `${src}?retry=${Date.now()}`
        setImageSrc(newSrc)
      }, delay)
    }
    
    onError?.(retryCount + 1)
  }, [retryCount, maxRetries, retryDelay, src, onError])

  // Gestion du succès
  const handleLoad = useCallback(() => {
    setIsLoading(false)
    setHasError(false)
    onLoad?.()
  }, [onLoad])

  // Retry manuel
  const handleRetry = useCallback(() => {
    setRetryCount(0)
    setHasError(false)
    setIsLoading(true)
    const newSrc = src.includes('?') ? `${src}&retry=${Date.now()}` : `${src}?retry=${Date.now()}`
    setImageSrc(newSrc)
  }, [src])

  // Si pas d'image ou erreur après tous les retries
  if (!src || (hasError && retryCount >= maxRetries)) {
    return (
      <div className={`w-full h-full bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-4xl text-slate-500 mb-2">{fallback}</div>
          <div className="text-sm text-gray-600">
            {!src ? 'Aucune image' : 'Image non disponible'}
          </div>
          {src && retryCount < maxRetries && (
            <button 
              onClick={handleRetry}
              className="mt-2 px-3 py-1 text-xs bg-slate-300 hover:bg-slate-400 rounded-md transition-colors"
            >
              Réessayer
            </button>
          )}
        </div>
      </div>
    )
  }

  // Affichage de l'image
  return (
    <>
      {isLoading && (
        <div className={`absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center ${className}`}>
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-transparent"></div>
        </div>
      )}
      
      <img 
        src={imageSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
        style={{ 
          // Optimisations pour améliorer la compatibilité
          imageRendering: 'auto',
          decoding: 'async',
          loading: 'lazy'
        }}
      />
    </>
  )
})

ImageLoader.displayName = 'ImageLoader'

export default ImageLoader
