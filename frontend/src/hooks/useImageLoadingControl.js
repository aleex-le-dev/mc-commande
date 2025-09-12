import { useState, useEffect, useCallback } from 'react'

// État global pour contrôler le chargement des images
let globalImageLoadingEnabled = false
const imageLoadingListeners = new Set()

// Hook pour contrôler le chargement des images
export const useImageLoadingControl = () => {
  const [isImageLoadingEnabled, setIsImageLoadingEnabled] = useState(globalImageLoadingEnabled)

  const enableImageLoading = useCallback(() => {
    globalImageLoadingEnabled = true
    setIsImageLoadingEnabled(true)
    // Notifier tous les listeners
    imageLoadingListeners.forEach(listener => listener(true))
  }, [])

  const disableImageLoading = useCallback(() => {
    globalImageLoadingEnabled = false
    setIsImageLoadingEnabled(false)
    // Notifier tous les listeners
    imageLoadingListeners.forEach(listener => listener(false))
  }, [])

  // Écouter les changements d'état global
  useEffect(() => {
    const listener = (enabled) => {
      setIsImageLoadingEnabled(enabled)
    }
    
    imageLoadingListeners.add(listener)
    
    return () => {
      imageLoadingListeners.delete(listener)
    }
  }, [])

  return {
    isImageLoadingEnabled,
    enableImageLoading,
    disableImageLoading
  }
}

// Fonction utilitaire pour vérifier si le chargement d'images est activé
export const isImageLoadingEnabled = () => globalImageLoadingEnabled

// Fonction pour activer le chargement d'images après le chargement de la page
export const enableImageLoadingAfterPageLoad = () => {
  // Attendre que la page soit complètement chargée
  if (document.readyState === 'complete') {
    // La page est déjà chargée, activer immédiatement
    console.log('🖼️ [IMAGE] Page déjà chargée, activation immédiate')
    globalImageLoadingEnabled = true
    imageLoadingListeners.forEach(listener => listener(true))
  } else {
    // Attendre que la page soit chargée
    console.log('🖼️ [IMAGE] Attente du chargement de la page...')
    window.addEventListener('load', () => {
      console.log('🖼️ [IMAGE] Événement load détecté, activation dans 500ms...')
      // Délai supplémentaire pour s'assurer que tout est prêt
      setTimeout(() => {
        globalImageLoadingEnabled = true
        imageLoadingListeners.forEach(listener => listener(true))
        console.log('🖼️ [IMAGE] Chargement des images activé après chargement de la page')
      }, 500) // 500ms de délai pour laisser le temps aux composants de se stabiliser
    })
  }
}

export default useImageLoadingControl
