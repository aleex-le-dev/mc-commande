import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import imageService from '../../../services/imageService'
import delaiService from '../../../services/delaiService'
import { ApiService } from '../../../services/apiService'

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

  // Synchroniser localAssignment uniquement si assignment est défini
  useEffect(() => {
    if (assignment != null) {
      setLocalAssignment(assignment)
    }
  }, [assignment])
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(true)

  const [dateLimite, setDateLimite] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [confettiPosition, setConfettiPosition] = useState({ x: 0, y: 0 })
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
    // Priorité absolue: miniatures via backend par productId
    if (memoizedProductId) {
      // Vérifier le cache localStorage mais purger les URL WordPress non compressées
      const cachedImageUrl = localStorage.getItem(`image_${memoizedProductId}`)
      if (cachedImageUrl && cachedImageUrl.includes('wp-content')) {
        try { localStorage.removeItem(`image_${memoizedProductId}`) } catch {}
      }
      if (cachedImageUrl && !cachedImageUrl.includes('cache-bust') && cachedImageUrl.includes('/api/images/')) {
        setImageUrl(cachedImageUrl)
        setIsImageLoading(false)
        setIsFromCache(true)
        return
      }
      setIsImageLoading(true)
      const url = imageService.getImage(memoizedProductId)
      setImageUrl(url)
      setIsImageLoading(false)
      return
    }

    // Fallback uniquement si pas de productId: utiliser l'URL existante
    if (memoizedImageUrl) {
      setImageUrl(memoizedImageUrl)
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

  // Calcul local du retard si non fourni: compare orderDate à dateLimite (inclusif)
  const computeIsEnRetardLocal = () => {
    try {
      if (!dateLimite || !article?.orderDate) return false
      const dateCommande = new Date(article.orderDate)
      const dateLimiteObj = new Date(dateLimite)
      const dc = new Date(dateCommande.getFullYear(), dateCommande.getMonth(), dateCommande.getDate())
      const dl = new Date(dateLimiteObj.getFullYear(), dateLimiteObj.getMonth(), dateLimiteObj.getDate())
      return dc <= dl
    } catch {
      return false
    }
  }

  const doitAvoirTraitRouge = Boolean(isEnRetard || computeIsEnRetardLocal())
  const estApresDateLimite = isAfterDateLimite

  const getImageUrl = () => {
    if (imageUrl) return imageUrl
    if (memoizedProductId) {
      const cachedUrl = localStorage.getItem(`image_${memoizedProductId}`)
      if (cachedUrl && !cachedUrl.includes('cache-bust') && cachedUrl.includes('/api/images/')) {
        return cachedUrl
      }
    }
    return null
  }

  const displayImageUrl = getImageUrl()

  useEffect(() => {
    if (displayImageUrl && memoizedProductId && !displayImageUrl.startsWith('data:') && displayImageUrl.includes('/api/images/')) {
      // Nettoyer l'URL des timestamps existants et ajouter un seul timestamp
      const cleanUrl = displayImageUrl.split('?')[0]
      const cacheBustedUrl = `${cleanUrl}?t=${Date.now()}`
      try { localStorage.setItem(`image_${memoizedProductId}`, cacheBustedUrl) } catch {}
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
    // Fallback: si aucun assignment mais l'article est en cours avec assigned_to, créer une assignation virtuelle
    if (article && article.status && article.status !== 'a_faire' && article.assigned_to) {
      const virtual = {
        article_id: uniqueAssignmentId,
        tricoteuse_id: 'virtual',
        tricoteuse_name: article.assigned_to,
        status: article.status,
        urgent: Boolean(isEnRetard) // conserver l'info d'urgence locale si besoin
      }
      // Enrichir depuis la liste des tricoteuses si dispo
      if (tricoteuses && tricoteuses.length > 0) {
        const t = tricoteuses.find(x => x.firstName === article.assigned_to)
        if (t) {
          virtual.tricoteuse_photo = t.photoUrl
          virtual.tricoteuse_color = t.color
        }
      }
      setLocalAssignment(virtual)
      setIsLoadingAssignment(false)
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
      await ApiService.assignments.deleteAssignment(uniqueAssignmentId)
      // Mettre immédiatement le statut à "a_faire" côté BDD et UI
      try {
        await ApiService.production.updateArticleStatus(article.orderId, article.line_item_id, 'a_faire')
      } catch {}
      setLocalAssignment(null)
      if (onAssignmentUpdate) {
        onAssignmentUpdate()
      }
      closeTricoteuseModal()
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'assignation:', error)
    }
  }, [uniqueAssignmentId, onAssignmentUpdate, closeTricoteuseModal])

  const handleTranslation = useCallback(() => {}, [])

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
    showConfetti, setShowConfetti,
    confettiPosition, setConfettiPosition,
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


