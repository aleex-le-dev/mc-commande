import { useState, useEffect, useCallback, useMemo, useRef, forwardRef } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import ImageLoader from './ImageLoader'
import TopBadges from './TopBadges'
import BottomBar from './BottomBar'
import ClientOverlay from './ClientOverlay'
import NotePopover from './NotePopover'
import AssignModal from './AssignModal'
import HeaderMedia from './HeaderMedia'
import InfoSection from './InfoSection'
import imageService from '../../services/imageService'
import { tricoteusesService, assignmentsService, updateArticleStatus, updateOrderNote } from '../../services/mongodbService'
// Icônes utilisées dans BottomBar uniquement; ArticleCard n'en a plus besoin
import delaiService from '../../services/delaiService'
import TranslationIcon from './TranslationIcon'
import Confetti from '../Confetti'

// Composant carte d'article moderne optimisé
const ArticleCard = forwardRef(({ 
  article, 
  index, 
  onOverlayOpen, 
  isOverlayOpen, 
  isHighlighted, 
  searchTerm,
  productionType, // Ajouter le type de production
  assignment, // Nouvelle prop pour l'assignation
  onAssignmentUpdate, // Fonction pour rafraîchir les assignations
  getArticleSize, // Fonction pour obtenir la taille de l'article
  getArticleColor, // Fonction pour obtenir la couleur de l'article
  getArticleOptions, // Fonction pour obtenir les options de l'article
  showDateLimiteSeparator = false, // Nouvelle prop pour afficher le trait de séparation
  isAfterDateLimite = false, // Indique si l'article est après la date limite
  isLastArticleOfDateLimite = false, // Indique si c'est le dernier article de la date limite
  tricoteusesProp = [], // Prop pour les tricoteuses
  showRetardIndicator = true, // Nouvelle prop pour contrôler l'affichage de l'indicateur de retard
  isEnRetard = false // Nouvelle prop pour indiquer si l'article est en retard
}, ref) => {
  const [copiedText, setCopiedText] = useState('')
  const [isNoteOpen, setIsNoteOpen] = useState(false)
  const [editingNote, setEditingNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [imageUrl, setImageUrl] = useState(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [isFromCache, setIsFromCache] = useState(false)
  
  // États pour le modal de tricoteuse
  const [showTricoteuseModal, setShowTricoteuseModal] = useState(false)
  const [tricoteuses, setTricoteuses] = useState([])
  const [isLoadingTricoteuses, setIsLoadingTricoteuses] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false) // État pour l'assignation en cours
  // État local pour l'assignation (pour mise à jour immédiate)
  const [localAssignment, setLocalAssignment] = useState(assignment)
  // État de chargement de l'assignation
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(true)
  // État pour la date limite
  const [dateLimite, setDateLimite] = useState(null)
  // État pour les traductions
  const [translatedData, setTranslatedData] = useState(null)
  // État pour les confettis
  const [showConfetti, setShowConfetti] = useState(false)
  const [confettiPosition, setConfettiPosition] = useState({ x: 0, y: 0 })
  // Retrait visuel local de la carte après confettis
  const [isRemoved, setIsRemoved] = useState(false)
  // Supprimé: const [selectedTricoteuse, setSelectedTricoteuse] = useState(null)
  // Supprimé: const [isLoading, setIsLoading] = useState(false)

  
  const noteBtnRef = useRef(null)
  const notePopoverRef = useRef(null)

  // Fermer la note sur demande globale (pour garantir une seule note ouverte)
  useEffect(() => {
    const handleGlobalClose = () => setIsNoteOpen(false)
    window.addEventListener('mc-close-notes', handleGlobalClose)
    return () => window.removeEventListener('mc-close-notes', handleGlobalClose)
  }, [])

  // Fermer la note si clic en dehors (n'importe où dans le document)
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

  // Réinitialiser les confettis après l'animation
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => {
        setShowConfetti(false)
      }, 2500) // Durée totale de l'animation des confettis
      return () => clearTimeout(timer)
    }
  }, [showConfetti])

  const handleCopy = useCallback(async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(label)
      setTimeout(() => setCopiedText(''), 2000)
    } catch (err) {
      // Erreur silencieuse lors de la copie
    }
  }, [])

  const handleOverlayToggle = useCallback((e) => {
    e.stopPropagation()
    onOverlayOpen && onOverlayOpen()
  }, [onOverlayOpen])

  // Mémoriser l'image URL pour éviter les re-renders
  const memoizedImageUrl = useMemo(() => article.image_url, [article.image_url])
  const memoizedProductId = useMemo(() => article.product_id, [article.product_id])
  
  // Créer un identifiant unique pour l'assignation (utiliser line_item_id pour la cohérence)
  const uniqueAssignmentId = useMemo(() => {
    return article.line_item_id || `${article.product_id}_${article.orderNumber}_${article.customer}`
  }, [article.line_item_id, article.product_id, article.orderNumber, article.customer])

  // Charger l'image quand les props changent OU quand le type de production change
  useEffect(() => {
    // Vérifier d'abord si l'image est déjà en localStorage (priorité absolue)
    if (memoizedProductId) {
      const cachedImageUrl = localStorage.getItem(`image_${memoizedProductId}`)
      
      if (cachedImageUrl) {
        setImageUrl(cachedImageUrl)
        setIsImageLoading(false)
        return // Sortir immédiatement si l'image est en cache
      }
    }

    // Si pas en cache, charger l'image via le service
    if (memoizedImageUrl) {
      setImageUrl(memoizedImageUrl)
      setIsImageLoading(false)
    } else if (memoizedProductId) {
      setIsImageLoading(true)
      const imageUrl = imageService.getImage(memoizedProductId)
      setImageUrl(imageUrl)
      setIsImageLoading(false)
    }
  }, [memoizedImageUrl, memoizedProductId, productionType])

  // Charger la date limite pour déterminer si l'article doit avoir un trait rouge
  useEffect(() => {
    const loadDateLimite = async () => {
      try {
        // Utiliser le service centralisé qui gère le cache
        const response = await delaiService.getDelai()
        if (response.success && response.data && response.data.dateLimite) {
          const dateLimiteStr = response.data.dateLimite.split('T')[0]
          setDateLimite(dateLimiteStr)
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la date limite:', error)
      }
    }
    
    // Charger seulement si pas déjà chargé
    if (!dateLimite) {
      loadDateLimite()
    }
  }, [dateLimite])

  // Utiliser les props passées depuis InfiniteScrollGrid pour la logique de retard
  const doitAvoirTraitRouge = isEnRetard
  const estApresDateLimite = isAfterDateLimite

  // Fonction pour obtenir l'URL de l'image (priorité au cache)
  const getImageUrl = () => {
    if (imageUrl) return imageUrl
    
    // Si pas d'URL en état, essayer le cache
    if (memoizedProductId) {
      const cachedUrl = localStorage.getItem(`image_${memoizedProductId}`)
      if (cachedUrl) {
        return cachedUrl
      }
    }
    
    return null
  }

  // URL de l'image à utiliser
  const displayImageUrl = getImageUrl()

  // Sauvegarder l'URL de l'image en localStorage quand elle change
  useEffect(() => {
    if (displayImageUrl && memoizedProductId && !displayImageUrl.startsWith('data:')) {
      localStorage.setItem(`image_${memoizedProductId}`, displayImageUrl)
    }
  }, [displayImageUrl, memoizedProductId])

  // Formatte proprement l'adresse en mettant le code postal + ville à la ligne
  const renderFormattedAddress = (address) => {
    if (!address || typeof address !== 'string') {
      return 'Non renseignée'
    }
    const parts = address.split(',').map(p => p.trim()).filter(Boolean)
    if (parts.length >= 2) {
      const streetPart = parts.slice(0, -1).join(', ')
      const zipCityPart = parts[parts.length - 1]
      return (
        <span>
          <span>{highlightText(streetPart, searchTerm)}</span>
          <br />
          <span>{highlightText(zipCityPart, searchTerm)}</span>
        </span>
      )
    }
    return <span>{highlightText(address, searchTerm)}</span>
  }

  // Fonction simple de surlignage
  const highlightText = (text, searchTerm) => {
    if (!searchTerm || !text) {
      return text
    }
    
    const term = searchTerm.toLowerCase().trim()
    const source = text.toLowerCase()
    
    if (source.includes(term)) {
      const parts = text.split(new RegExp(`(${term})`, 'gi'))
      return parts.map((part, i) => 
        part.toLowerCase() === term ? 
          <mark key={i} className="bg-yellow-200 px-1 rounded">{part}</mark> : 
          part
      )
    }
    
    return text
  }

  // Charger l'assignation existante et l'enrichir avec les données de la tricoteuse
  const loadExistingAssignment = useCallback(async () => {
    // Si l'assignation est fournie par le parent et/ou la liste des tricoteuses aussi,
    // enrichir localement sans appels réseau
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
      } catch (error) {
        setLocalAssignment(assignment)
      } finally {
        setIsLoadingAssignment(false)
      }
      return
    }

    // Fallback sans appel réseau: si aucune assignation n'est fournie, considérer non assigné
    setLocalAssignment(null)
    setIsLoadingAssignment(false)
  }, [uniqueAssignmentId, assignment, tricoteuses])

  useEffect(() => {
    loadExistingAssignment()
  }, [loadExistingAssignment])

  // Charger la liste des tricoteuses depuis les props (plus d'appel réseau)
  const loadTricoteuses = useCallback(() => {
    // Les tricoteuses sont déjà fournies par SimpleFlexGrid
    setTricoteuses(tricoteusesProp || [])
    setIsLoadingTricoteuses(false)
  }, [tricoteusesProp])

  // Initialiser les tricoteuses quand la prop change
  useEffect(() => {
    if (tricoteusesProp && tricoteusesProp.length > 0) {
      setTricoteuses(tricoteusesProp)
      setIsLoadingTricoteuses(false)
    }
  }, [tricoteusesProp])

  // Ouvrir le modal de sélection de tricoteuse
  const openTricoteuseModal = useCallback(() => {
    loadTricoteuses()
    setShowTricoteuseModal(true)
  }, [loadTricoteuses])

  // Fermer le modal
  const closeTricoteuseModal = useCallback(() => {
    setShowTricoteuseModal(false)
    // Supprimé: setSelectedTricoteuse(null)
  }, [])

  // Fonction pour retirer l'assignation
  const removeAssignment = useCallback(async () => {
      try {
      // L’API attend l’identifiant d’article (article_id), pas _id
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

  // Supprimé: saveTricoteuseSelection function (plus nécessaire)

  // Fonction pour gérer la traduction
  const handleTranslation = useCallback((translatedData) => {
    if (translatedData === null) {
      // Retour au texte original
      setTranslatedData(null)
    } else {
      // Mise à jour avec la traduction
      setTranslatedData(translatedData)
    }
  }, [])

  // Fonction pour valider les URLs des photos
  const isValidPhotoUrl = useCallback((url) => {
    if (!url || typeof url !== 'string') return false
    
    // Rejeter les URLs blob (temporaires)
    if (url.startsWith('blob:')) return false
    
    // Rejeter les URLs vides ou trop courtes
    if (url.trim() === '' || url.length < 10) return false
    
    // Accepter les URLs HTTP/HTTPS et data URLs
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/')
  }, [])

  // Si retiré localement, ne plus afficher la carte
  if (isRemoved) {
    return null
  }

  return (
    <div 
      className={`group relative rounded-3xl overflow-hidden shadow-lg h-[450px] max-w-full ${isHighlighted ? `border-2 border-accent animate-pink-blink` : ''} ${
        localAssignment ? 
          (localAssignment.status === 'en_cours' ? 'border-status-en-cours' :
           localAssignment.status === 'en_pause' ? 'border-status-en-pause' :
           localAssignment.status === 'termine' ? 'border-status-termine' :
           'border-status-retard') :
        doitAvoirTraitRouge ? 'border-status-retard' : ''
      }`}
             style={{ 
         backgroundColor: 'white'
       }}
    >

      <HeaderMedia
        article={article}
        displayImageUrl={displayImageUrl}
        isImageLoading={isImageLoading}
        isFromCache={isFromCache}
        imageUrl={imageUrl}
        memoizedProductId={memoizedProductId}
        setIsImageLoading={setIsImageLoading}
        setImageUrl={setImageUrl}
        imageService={imageService}
        doitAvoirTraitRouge={doitAvoirTraitRouge}
        localAssignment={localAssignment}
        handleOverlayToggle={handleOverlayToggle}
        isOverlayOpen={isOverlayOpen}
        handleTranslation={handleTranslation}
        translatedData={translatedData}
      />

      <InfoSection
        article={article}
        translatedData={translatedData}
        searchTerm={searchTerm}
        getArticleSize={getArticleSize}
        getArticleColor={getArticleColor}
      />

            {/* Date / heure / note / assignation */}
      <BottomBar
        article={article}
        translatedData={translatedData}
        isNoteOpen={isNoteOpen}
        onToggleNote={() => { 
          window.dispatchEvent(new Event('mc-close-notes')); 
          setEditingNote(translatedData?.customerNote || article.customerNote || ''); 
          setIsNoteOpen(v => !v);
        }}
        noteBtnRef={noteBtnRef}
        hasNote={Boolean(translatedData?.customerNote || article.customerNote)}
        localAssignment={localAssignment}
        isLoadingAssignment={isLoadingAssignment}
        onOpenAssignModal={() => openTricoteuseModal()}
      />

      {/* Overlay client affiché instantanément sans transition */}
      <ClientOverlay
        isOpen={isOverlayOpen}
        onClose={handleOverlayToggle}
        article={article}
        searchTerm={searchTerm}
        copiedText={copiedText}
        onCopy={handleCopy}
        renderFormattedAddress={renderFormattedAddress}
        highlightText={highlightText}
      />

      {/* Effet de brillance au survol */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform -skew-x-12 -translate-x-full group-hover:translate-x-full pointer-events-none"></div>

      {/* Popover global de note, pleine largeur de la carte */}
      <NotePopover
        isOpen={isNoteOpen}
        notePopoverRef={notePopoverRef}
        initialValue={editingNote}
        saving={isSavingNote}
        onClose={() => { setIsNoteOpen(false); setEditingNote(article.customerNote || '') }}
        onSave={async (content) => {
          try {
            setIsSavingNote(true)
            const ok = await updateOrderNote(article.orderId, content)
            if (ok) {
              article.customerNote = content
              setIsNoteOpen(false)
            }
          } finally {
            setIsSavingNote(false)
          }
        }}
        isTranslated={Boolean(translatedData?.customerNote)}
      />

      {/* Modal d'assignation simple et élégante */}
      <AssignModal
        isOpen={showTricoteuseModal}
        onClose={closeTricoteuseModal}
        isAssigning={isAssigning}
        isLoadingTricoteuses={isLoadingTricoteuses}
        tricoteuses={tricoteuses}
        localAssignment={localAssignment}
        onRemove={removeAssignment}
        onPick={async (tricoteuse) => {
          if (isAssigning) return
          setIsAssigning(true)
          const assignmentData = { article_id: uniqueAssignmentId, tricoteuse_id: tricoteuse._id, tricoteuse_name: tricoteuse.firstName, status: 'en_cours' }
          try {
            await assignmentsService.createOrUpdateAssignment(assignmentData)
            const enrichedAssignment = { ...assignmentData, tricoteuse_photo: tricoteuse.photoUrl, tricoteuse_color: tricoteuse.color, tricoteuse_name: tricoteuse.firstName }
            setLocalAssignment(enrichedAssignment)
            if (onAssignmentUpdate) { onAssignmentUpdate(uniqueAssignmentId, enrichedAssignment) }
            closeTricoteuseModal()
          } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error)
            alert('Erreur lors de l\'assignation. Veuillez réessayer.')
          } finally {
            setIsAssigning(false)
          }
        }}
        onChangeStatus={async (status) => {
          const updatedAssignment = { ...localAssignment, status }
          if (status === 'termine') {
            try { await updateArticleStatus(article.orderId, article.line_item_id, 'termine') } catch {}
            const rect = document.body.getBoundingClientRect()
            setConfettiPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
            setShowConfetti(true)
          }
          try {
            await assignmentsService.createOrUpdateAssignment(updatedAssignment)
            setLocalAssignment(updatedAssignment)
            if (onAssignmentUpdate) { onAssignmentUpdate() }
            closeTricoteuseModal()
            if (status === 'termine') {
              setTimeout(() => { setIsRemoved(true) }, 3000)
            }
          } catch (error) {
            console.error('Erreur lors de la mise à jour du statut:', error)
          }
        }}
        isValidPhotoUrl={isValidPhotoUrl}
      />
      
      {/* Composant Confetti */}
      <Confetti isActive={showConfetti} position={confettiPosition} />
    </div>
  )
})

export default ArticleCard
