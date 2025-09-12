import React, { useState, useCallback, useMemo } from 'react'
import { ApiService } from '../../../services/apiService'
import useNoteEditor from '../../../hooks/useNoteEditor'
import useConfetti from '../../../hooks/useConfetti'
import useAssignmentManager from '../../../hooks/useAssignmentManager'
import useDelaiManager from '../../../hooks/useDelaiManager'
import { useImageLoadingControl } from '../../../hooks/useImageLoadingControl'

// Hook refactorisé: utilise des hooks spécialisés pour chaque responsabilité
const useArticleCard = ({ article, assignment, onAssignmentUpdate, tricoteusesProp, productionType, isEnRetard, isAfterDateLimite }) => {
  const [copiedText, setCopiedText] = useState('')
  const [isRemoved, setIsRemoved] = useState(false)
  const [translatedData, setTranslatedData] = useState(null)
  const [localUrgent, setLocalUrgent] = useState(false)

  // Hooks spécialisés pour chaque responsabilité
  const noteData = useNoteEditor(article)
  const confettiData = useConfetti()
  const assignmentData = useAssignmentManager({ article, assignment, onAssignmentUpdate, tricoteusesProp })
  const delaiData = useDelaiManager(article)
  const { isImageLoadingEnabled } = useImageLoadingControl()

  // Fonction de copie
  const handleCopy = useCallback(async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(label)
      
      // OPTIMISATION: Timeout avec cleanup
      const timeoutId = setTimeout(() => setCopiedText(''), 2000)
      
      // Cleanup du timeout si le composant est démonté
      return () => clearTimeout(timeoutId)
    } catch (error) {
      console.warn('Erreur copie:', error)
    }
  }, [])

  // Calculs délégués aux hooks spécialisés
  const doitAvoirTraitRouge = delaiData.doitAvoirTraitRouge(isEnRetard)
  const estApresDateLimite = isAfterDateLimite

  // Fonction de traduction (placeholder)
  const handleTranslation = useCallback(() => {}, [])

  // Validation d'URL de photo
  const isValidPhotoUrl = useCallback((url) => {
    if (!url || typeof url !== 'string') return false
    if (url.startsWith('blob:')) return false
    if (url.trim() === '' || url.length < 10) return false
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/')
  }, [])

  // Gestion des images
  const [imageUrl, setImageUrl] = useState(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [isFromCache, setIsFromCache] = useState(false)

  // Calcul de l'URL d'affichage de l'image
  const displayImageUrl = useMemo(() => {
    if (!isImageLoadingEnabled) {
      if (article?.productId === 389525 || article?.productId === 389503) {
        console.log('🖼️ [IMAGE] useArticleCard - Chargement désactivé pour productId', article?.productId)
      }
      return null
    }

    if (imageUrl) {
      if (article?.productId === 389525 || article?.productId === 389503) {
        console.log('🖼️ [IMAGE] useArticleCard - Image disponible pour productId', article?.productId, 'URL:', imageUrl)
      }
      return imageUrl
    }

    // Si pas d'image chargée mais chargement activé, utiliser l'URL directe
    if (article?.image_url) {
      if (article?.productId === 389525 || article?.productId === 389503) {
        console.log('🖼️ [IMAGE] useArticleCard - Utilisation image_url directe pour productId', article?.productId, 'URL:', article.image_url)
      }
      return article.image_url
    }

    return null
  }, [isImageLoadingEnabled, imageUrl, article?.productId, article?.image_url])

  // Charger l'image via l'API
  const loadImage = useCallback(async () => {
    if (!isImageLoadingEnabled || !article?.productId || imageUrl) return

    if (article?.productId === 389525 || article?.productId === 389503) {
      console.log('🖼️ [IMAGE] useArticleCard - Début chargement image pour productId', article?.productId)
    }

    setIsImageLoading(true)
    try {
      const response = await fetch(`/api/images/${article.productId}?w=256&q=75&f=webp`)
      if (response.ok) {
        const imageBlob = await response.blob()
        const imageObjectUrl = URL.createObjectURL(imageBlob)
        setImageUrl(imageObjectUrl)
        setIsFromCache(false)
        if (article?.productId === 389525 || article?.productId === 389503) {
          console.log('🖼️ [IMAGE] useArticleCard - Image chargée avec succès pour productId', article?.productId)
        }
      } else {
        if (article?.productId === 389525 || article?.productId === 389503) {
          console.log('🖼️ [IMAGE] useArticleCard - Erreur chargement image pour productId', article?.productId, 'Status:', response.status)
        }
      }
    } catch (error) {
      if (article?.productId === 389525 || article?.productId === 389503) {
        console.log('🖼️ [IMAGE] useArticleCard - Erreur chargement image pour productId', article?.productId, 'Error:', error.message)
      }
    } finally {
      setIsImageLoading(false)
    }
  }, [isImageLoadingEnabled, article?.productId, imageUrl])

  // Charger l'image quand le chargement est activé
  React.useEffect(() => {
    if (isImageLoadingEnabled && article?.productId && !imageUrl) {
      loadImage()
    }
  }, [isImageLoadingEnabled, article?.productId, imageUrl, loadImage])

  return {
    // État local
    copiedText, setCopiedText,
    isRemoved, setIsRemoved,
    translatedData, setTranslatedData,
    localUrgent, setLocalUrgent,
    
    // Données des hooks spécialisés
    ...noteData,
    ...confettiData,
    ...assignmentData,
    ...delaiData,
    
    // Gestion des images
    imageUrl, setImageUrl,
    isImageLoading, setIsImageLoading,
    isFromCache, setIsFromCache,
    displayImageUrl,
    
    // Fonctions utilitaires
    handleCopy,
    handleTranslation,
    isValidPhotoUrl,
    
    // Calculs
    doitAvoirTraitRouge,
    estApresDateLimite,
    
    // Fonctions d'assignation (explicitement exportées)
    assignArticle: assignmentData.assignArticle,
    changeStatus: assignmentData.changeStatus
  }
}

export default useArticleCard


