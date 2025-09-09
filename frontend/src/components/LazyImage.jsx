import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ImageOptimizationService } from '../services/imageOptimizationService'

/**
 * Composant d'image avec lazy loading intelligent
 * Optimisé pour des performances maximales sur Render
 */
const LazyImage = ({ 
  src, 
  alt, 
  className = '', 
  placeholder = null,
  priority = false,
  onLoad = null,
  onError = null,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef(null)
  const observerRef = useRef(null)

  // Intersection Observer pour le lazy loading
  useEffect(() => {
    if (priority) {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
      observerRef.current = observer
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [priority])

  // Chargement de l'image
  useEffect(() => {
    if (!isInView || !src) return

    const loadImage = async () => {
      try {
        await ImageOptimizationService.preloadImage(src, priority)
        setIsLoaded(true)
        if (onLoad) onLoad()
      } catch (error) {
        console.warn('Erreur chargement image:', error)
        setHasError(true)
        if (onError) onError(error)
      }
    }

    loadImage()
  }, [isInView, src, priority, onLoad, onError])

  // Placeholder personnalisé ou par défaut
  const renderPlaceholder = () => {
    if (placeholder) return placeholder
    
    return (
      <div className={`bg-gray-200 animate-pulse flex items-center justify-center ${className}`}>
        <div className="w-8 h-8 bg-gray-300 rounded-full animate-bounce"></div>
      </div>
    )
  }

  // Image d'erreur
  const renderError = () => (
    <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
      <span className="text-gray-400 text-sm">🖼️</span>
    </div>
  )

  return (
    <div ref={imgRef} className="relative">
      {hasError ? (
        renderError()
      ) : isLoaded ? (
        <img
          src={src}
          alt={alt}
          className={`transition-opacity duration-300 ${className}`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...props}
        />
      ) : (
        renderPlaceholder()
      )}
    </div>
  )
}

export default LazyImage
