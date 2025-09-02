import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import imageService from '../../../services/imageService'
import delaiService from '../../../services/delaiService'
import { assignmentsService } from '../../../services/mongodbService'

// Hook: encapsule les états, effets et helpers d'ArticleCard
const useArticleCard = ({ article, assignment, onAssignmentUpdate, tricoteusesProp, productionType, isEnRetard, isAfterDateLimite }) => {
  const [copiedText, setCopiedText] = useState('')
  const [isNoteOpen, setIsNoteOpen] = useState(false)
  const [editingNote, setEditingNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [imageUrl, setImageUrl] = useState(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [isFromCache, setIsFromCache] = useState(false)

  const [showTricoteuseModal, setShowTricoteuseModal] = useState(false)
  const [tricoteuses, setTricoteuses] = useState([])
  const [isLoadingTricoteuses, setIsLoadingTricoteuses] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [localAssignment, setLocalAssignment] = useState(assignment)
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(true)

  const [dateLimite, setDateLimite] = useState(null)
  const [translatedData, setTranslatedData] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [confettiPosition, setConfettiPosition] = useState({ x: 0, y: 0 })
  const [isRemoved, setIsRemoved] = useState(false)
  const [localUrgent, setLocalUrgent] = useState(false)

  const noteBtnRef = useRef(null)
  const notePopoverRef = useRef(null)

  useEffect(() => {
    const handleGlobalClose = () => setIsNoteOpen(false)
    window.addEventListener('mc-close-notes', handleGlobalClose)
    return () => window.removeEventListener('mc-close-notes', handleGlobalClose)
  }, [])

  useEffect(() => {
    if (!isNoteOpen) return
    const handleClickOutside = (event) => {
      const btn = noteBtnRef.current
      const pop = notePopoverRef.current
      if (pop && pop.contains(event.target)) return
      if (btn && btn.contains(event.target)) return
      setIsNoteOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside, true)
    return () => document.removeEventListener('mousedown', handleClickOutside, true)
  }, [isNoteOpen])

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 2500)
      return () => clearTimeout(timer)
    }
  }, [showConfetti])

  const handleCopy = useCallback(async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(label)
      setTimeout(() => setCopiedText(''), 2000)
    } catch {}
  }, [])

  const memoizedImageUrl = useMemo(() => article.image_url, [article.image_url])
  const memoizedProductId = useMemo(() => article.product_id, [article.product_id])

  const uniqueAssignmentId = useMemo(() => {
    return article.line_item_id || `${article.product_id}_${article.orderNumber}_${article.customer}`
  }, [article.line_item_id, article.product_id, article.orderNumber, article.customer])

  useEffect(() => {
    if (memoizedProductId) {
      const cachedImageUrl = localStorage.getItem(`image_${memoizedProductId}`)
      if (cachedImageUrl) {
        setImageUrl(cachedImageUrl)
        setIsImageLoading(false)
        setIsFromCache(true)
        return
      }
    }

    if (memoizedImageUrl) {
      setImageUrl(memoizedImageUrl)
      setIsImageLoading(false)
    } else if (memoizedProductId) {
      setIsImageLoading(true)
      const url = imageService.getImage(memoizedProductId)
      setImageUrl(url)
      setIsImageLoading(false)
    }
  }, [memoizedImageUrl, memoizedProductId, productionType])

  // Plus de localStorage - tout est en BDD maintenant

  useEffect(() => {
    const loadDateLimite = async () => {
      try {
        const response = await delaiService.getDelai()
        if (response.success && response.data && response.data.dateLimite) {
          const dateLimiteStr = response.data.dateLimite.split('T')[0]
          setDateLimite(dateLimiteStr)
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la date limite:', error)
      }
    }
    if (!dateLimite) {
      loadDateLimite()
    }
  }, [dateLimite])

  const doitAvoirTraitRouge = isEnRetard
  const estApresDateLimite = isAfterDateLimite

  const getImageUrl = () => {
    if (imageUrl) return imageUrl
    if (memoizedProductId) {
      const cachedUrl = localStorage.getItem(`image_${memoizedProductId}`)
      if (cachedUrl) {
        return cachedUrl
      }
    }
    return null
  }

  const displayImageUrl = getImageUrl()

  useEffect(() => {
    if (displayImageUrl && memoizedProductId && !displayImageUrl.startsWith('data:')) {
      localStorage.setItem(`image_${memoizedProductId}`, displayImageUrl)
    }
  }, [displayImageUrl, memoizedProductId])

  const loadExistingAssignment = useCallback(async () => {
    if (assignment) {
      setIsLoadingAssignment(true)
      try {
        if (tricoteuses && assignment.tricoteuse_id) {
          const tricoteuse = tricoteuses.find(t => t._id === assignment.tricoteuse_id)
          if (tricoteuse) {
            const enrichedAssignment = {
              ...assignment,
              tricoteuse_photo: tricoteuse.photoUrl,
              tricoteuse_color: tricoteuse.color,
              tricoteuse_name: tricoteuse.firstName
            }
            setLocalAssignment(enrichedAssignment)
          } else {
            setLocalAssignment(assignment)
          }
        } else {
          setLocalAssignment(assignment)
        }
      } catch {
        setLocalAssignment(assignment)
      } finally {
        setIsLoadingAssignment(false)
      }
      return
    }
    setLocalAssignment(null)
    setIsLoadingAssignment(false)
  }, [assignment, tricoteuses])

  useEffect(() => {
    loadExistingAssignment()
  }, [loadExistingAssignment])

  const loadTricoteuses = useCallback(() => {
    setTricoteuses(tricoteusesProp || [])
    setIsLoadingTricoteuses(false)
  }, [tricoteusesProp])

  useEffect(() => {
    if (tricoteusesProp && tricoteusesProp.length > 0) {
      setTricoteuses(tricoteusesProp)
      setIsLoadingTricoteuses(false)
    }
  }, [tricoteusesProp])

  const openTricoteuseModal = useCallback(() => {
    loadTricoteuses()
    setShowTricoteuseModal(true)
  }, [loadTricoteuses])

  const closeTricoteuseModal = useCallback(() => {
    setShowTricoteuseModal(false)
  }, [])

  const removeAssignment = useCallback(async () => {
    try {
      await assignmentsService.deleteAssignment(uniqueAssignmentId)
      setLocalAssignment(null)
      if (onAssignmentUpdate) {
        onAssignmentUpdate()
      }
      closeTricoteuseModal()
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'assignation:', error)
    }
  }, [uniqueAssignmentId, onAssignmentUpdate, closeTricoteuseModal])

  const handleTranslation = useCallback((data) => {
    if (data === null) {
      setTranslatedData(null)
    } else {
      setTranslatedData(data)
    }
  }, [])

  const isValidPhotoUrl = useCallback((url) => {
    if (!url || typeof url !== 'string') return false
    if (url.startsWith('blob:')) return false
    if (url.trim() === '' || url.length < 10) return false
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/')
  }, [])

  return {
    copiedText, setCopiedText,
    isNoteOpen, setIsNoteOpen,
    editingNote, setEditingNote,
    isSavingNote, setIsSavingNote,
    imageUrl, setImageUrl,
    isImageLoading, setIsImageLoading,
    isFromCache, setIsFromCache,
    showTricoteuseModal, openTricoteuseModal, closeTricoteuseModal,
    tricoteuses, isLoadingTricoteuses, isAssigning, setIsAssigning,
    localAssignment, setLocalAssignment,
    isLoadingAssignment,
    dateLimite,
    translatedData, setTranslatedData,
    showConfetti, setShowConfetti,
    confettiPosition, setConfettiPosition,
    isRemoved, setIsRemoved,
    localUrgent, setLocalUrgent,
    noteBtnRef, notePopoverRef,
    memoizedImageUrl, memoizedProductId, uniqueAssignmentId,
    displayImageUrl,
    handleCopy,
    loadExistingAssignment,
    loadTricoteuses,
    removeAssignment,
    handleTranslation,
    isValidPhotoUrl,
    doitAvoirTraitRouge,
    estApresDateLimite,
  }
}

export default useArticleCard


