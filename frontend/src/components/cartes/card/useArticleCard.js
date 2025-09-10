import { useState, useCallback } from 'react'
import { ApiService } from '../../../services/apiService'
import useImageLoader from '../../../hooks/useImageLoader'
import useNoteEditor from '../../../hooks/useNoteEditor'
import useConfetti from '../../../hooks/useConfetti'
import useAssignmentManager from '../../../hooks/useAssignmentManager'
import useDelaiManager from '../../../hooks/useDelaiManager'

// Hook refactorisé: utilise des hooks spécialisés pour chaque responsabilité
const useArticleCard = ({ article, assignment, onAssignmentUpdate, tricoteusesProp, productionType, isEnRetard, isAfterDateLimite }) => {
  const [copiedText, setCopiedText] = useState('')
  const [isRemoved, setIsRemoved] = useState(false)
  const [translatedData, setTranslatedData] = useState(null)
  const [localUrgent, setLocalUrgent] = useState(false)

  // Hooks spécialisés pour chaque responsabilité
  const imageData = useImageLoader(article)
  const noteData = useNoteEditor(article)
  const confettiData = useConfetti()
  const assignmentData = useAssignmentManager({ article, assignment, onAssignmentUpdate, tricoteusesProp })
  const delaiData = useDelaiManager(article)

  // Fonction de copie
  const handleCopy = useCallback(async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(label)
      setTimeout(() => setCopiedText(''), 2000)
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

  return {
    // État local
    copiedText, setCopiedText,
    isRemoved, setIsRemoved,
    translatedData, setTranslatedData,
    localUrgent, setLocalUrgent,
    
    // Données des hooks spécialisés
    ...imageData,
    ...noteData,
    ...confettiData,
    ...assignmentData,
    ...delaiData,
    
    // Fonctions utilitaires
    handleCopy,
    handleTranslation,
    isValidPhotoUrl,
    
    // Calculs
    doitAvoirTraitRouge,
    estApresDateLimite,
  }
}

export default useArticleCard


