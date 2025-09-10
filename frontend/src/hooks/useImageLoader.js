/**
 * Hook spécialisé pour la gestion des images
 * Responsabilité unique: chargement et cache des images
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import imageService from '../services/imageService'

export const useImageLoader = (article) => {
  const [imageUrl, setImageUrl] = useState(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [isFromCache, setIsFromCache] = useState(false)

  // Mémoriser les valeurs pour éviter les re-calculs
  const memoizedImageUrl = useMemo(() => article?.image_url, [article?.image_url])
  const memoizedProductId = useMemo(() => article?.product_id, [article?.product_id])

  // Charger l'image avec priorité au backend
  useEffect(() => {
    if (!memoizedProductId) {
      // Fallback: utiliser l'URL existante si pas de productId
      if (memoizedImageUrl) {
        setImageUrl(memoizedImageUrl)
        setIsImageLoading(false)
      }
      return
    }

    // Vérifier le cache localStorage
    const cachedImageUrl = localStorage.getItem(`image_${memoizedProductId}`)
    if (cachedImageUrl && !cachedImageUrl.includes('cache-bust') && cachedImageUrl.includes('/api/images/')) {
      setImageUrl(cachedImageUrl)
      setIsImageLoading(false)
      setIsFromCache(true)
      return
    }

    // Charger depuis le service d'images
    setIsImageLoading(true)
    const url = imageService.getImage(memoizedProductId)
    setImageUrl(url)
    setIsImageLoading(false)
  }, [memoizedImageUrl, memoizedProductId])

  // Obtenir l'URL d'affichage avec cache
  const getImageUrl = useCallback(() => {
    if (imageUrl) return imageUrl
    if (memoizedProductId) {
      const cachedUrl = localStorage.getItem(`image_${memoizedProductId}`)
      if (cachedUrl && !cachedUrl.includes('cache-bust') && cachedUrl.includes('/api/images/')) {
        return cachedUrl
      }
    }
    return null
  }, [imageUrl, memoizedProductId])

  const displayImageUrl = getImageUrl()

  // Mettre en cache l'URL avec timestamp
  useEffect(() => {
    if (displayImageUrl && memoizedProductId && !displayImageUrl.startsWith('data:') && displayImageUrl.includes('/api/images/')) {
      const cleanUrl = displayImageUrl.split('?')[0]
      const cacheBustedUrl = `${cleanUrl}?t=${Date.now()}`
      try { 
        localStorage.setItem(`image_${memoizedProductId}`, cacheBustedUrl) 
      } catch (error) {
        console.warn('Impossible de mettre en cache l\'image:', error)
      }
    }
  }, [displayImageUrl, memoizedProductId])

  return {
    imageUrl,
    setImageUrl,
    displayImageUrl,
    isImageLoading,
    setIsImageLoading,
    isFromCache,
    memoizedImageUrl,
    memoizedProductId
  }
}

export default useImageLoader
