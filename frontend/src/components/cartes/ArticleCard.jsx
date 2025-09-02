import { useState, useEffect, useCallback, useMemo, useRef, forwardRef } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import ImageLoader from './ImageLoader'
import TopBadges from './TopBadges'
import BottomBar from './BottomBar'
import ClientOverlay from './ClientOverlay'
import NotePopover from './NotePopover'
import AssignModal from './AssignModal'
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

      {/* Image de fond avec overlay moderne */}
      <div className="relative h-60 overflow-hidden rounded-t-3xl">
        {/* Image de base */}
        {displayImageUrl ? (
          <div className="relative">
            <ImageLoader 
              src={displayImageUrl} 
              alt={article.product_name}
              className="w-full h-full object-cover"
              fallback="📦"
              maxRetries={3}
              retryDelay={1000}
              onLoad={() => {
                // Marquer l'image comme chargée avec succès
                setIsImageLoading(false)
              }}
              onError={(retryCount) => {
                if (retryCount >= 3) {
                  // Après 3 tentatives, essayer de recharger l'image
                  setTimeout(() => {
                    if (memoizedProductId) {
                      const retryImage = imageService.getImage(memoizedProductId)
                      setImageUrl(retryImage)
                    }
                  }, 1000)
                }
              }}
            />
            
            {/* Indicateur de cache */}
            {isFromCache && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full shadow-lg z-10">
                ⚡ Cache
              </div>
            )}
            
            {/* Indicateur d'image par défaut */}
            {imageUrl && imageUrl.startsWith('data:image/') && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full shadow-lg z-10">
                🎨 Par défaut
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center">
            {isImageLoading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-transparent"></div>
            ) : (
              <div className="text-center">
                <div className="text-4xl text-slate-500 mb-2">📦</div>
                <div className="text-sm text-slate-600">Aucune image</div>
              </div>
            )}
          </div>
        )}

        <TopBadges showRetard={doitAvoirTraitRouge} showUrgent={!!localAssignment?.urgent} />
        


        {/* Lien vers la fiche produit - uniquement sur l'image */}
        <a
          href={article.permalink || '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => { if (!article.permalink) e.preventDefault() }}
          className="absolute inset-0 z-5 cursor-pointer"
          title="Voir la fiche produit"
          aria-label="Voir la fiche produit"
        />
        
        {/* Bouton lien vers la commande complète */}
        <a
          href={`https://maisoncleo.com/wp-admin/post.php?post=${article.orderNumber}&action=edit`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 z-5 inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/40 bg-black/30 text-white/90 hover:bg-black/50 hover:border-white/60 backdrop-blur-sm"
          title="Voir la commande complète"
          aria-label="Voir la commande complète"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 3h7v7" />
            <path d="M10 14L21 3" />
            <path d="M21 14v7h-7" />
            <path d="M3 10l11 11" />
          </svg>
        </a>
        
        {/* Overlay gradient moderne */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none"></div>
        
        {/* Numéro de commande - bien visible en haut à gauche */}
        <div className="absolute top-4 left-4 px-4 py-2 rounded-lg bg-black/25 backdrop-blur-sm text-white text-lg font-bold z-5">
          #{article.orderNumber}
        </div>
        
        {/* Icône d'information client sur le bord gauche */}
        <div className="absolute left-4 top-20 z-5 pointer-events-auto">
          <button
            onClick={handleOverlayToggle}
            className={`w-10 h-10 rounded-full flex items-center justify-center border border-white/30 bg-transparent text-white/90 hover:bg-white/90 hover:text-black hover:border-white focus:outline-none focus:ring-2 focus:ring-white/40 transition-all duration-200 ${
              isOverlayOpen ? 'bg-white/90 text-black border-white ring-2 ring-white/60' : ''
            }`}
            aria-label="Informations client"
            title="Informations client"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="w-5 h-5"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>

        {/* Icône de traduction sur le bord gauche */}
        <div className="absolute left-4 top-32 z-5 pointer-events-auto">
          <TranslationIcon 
            article={article} 
            onTranslate={handleTranslation}
            isTranslated={!!translatedData}
          />
        </div>
      </div>

      {/* Zone d'informations dynamique en bas (réserve l'espace de la barre inférieure) */}
      <div className="h-24 bg-white backdrop-blur-md transition-all duration-300 relative">
        <div className="p-3 pt-2 pb-16">
          {/* Informations principales pour tricoteuses */}
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-900 leading-tight">
              {highlightText(translatedData?.product_name || article.product_name, searchTerm)}
            </h3>
            <div className="grid gap-3 text-base text-gray-700" style={{ 
              gridTemplateColumns: `repeat(${[
                'quantity',
                (getArticleSize && getArticleSize(article.meta_data)) || (article.meta_data?.find(item => item.key === 'pa_taille')?.value) ? 'size' : null,
                (getArticleColor && getArticleColor(article.meta_data)) || (article.meta_data?.find(item => item.key === 'pa_couleur')?.value) ? 'color' : null
              ].filter(Boolean).length}, 1fr)`
            }}>
              <div className="text-center">
                <div className="text-sm text-gray-500">Quantité</div>
                <div className="text-lg font-semibold">{article.quantity}</div>
              </div>
              
              {((getArticleSize && getArticleSize(article.meta_data)) || (article.meta_data?.find(item => item.key === 'pa_taille')?.value)) && (
                <div className="text-center mb-6">
                  <div className="text-sm text-gray-500">Taille</div>
                  <div className="text-lg font-semibold">
                    {(getArticleSize && getArticleSize(article.meta_data)) || (article.meta_data?.find(item => item.key === 'pa_taille')?.value) || 'N/A'}
                  </div>
                </div>
              )}
              
              {((getArticleColor && getArticleColor(article.meta_data)) || (article.meta_data?.find(item => item.key === 'pa_couleur')?.value)) && (
                <div className="text-center">
                  <div className="text-sm text-gray-500">Couleur</div>
                  <div className="text-lg font-semibold">
                    {(getArticleColor && getArticleColor(article.meta_data)) || (article.meta_data?.find(item => item.key === 'pa_couleur')?.value) || 'N/A'}
                  </div>
                </div>
              )}
            </div>
            
            {/* Indicateur d'assignation */}

          </div>
        </div>
      </div>

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
