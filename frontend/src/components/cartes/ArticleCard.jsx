import { useState, useEffect, useCallback, useMemo, useRef, forwardRef } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import ImageLoader from './ImageLoader'
import imageService from '../../services/imageService'
import { tricoteusesService, assignmentsService, updateArticleStatus, updateOrderNote } from '../../services/mongodbService'
import { RiStickyNoteAddLine, RiStickyNoteFill } from 'react-icons/ri'
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

        {/* Badge rouge pour article en retard */}
        {doitAvoirTraitRouge && (
          <div className="absolute top-0 left-0 right-0 h-2 bg-red-500 z-5 flex items-center justify-center">
            <span className="text-white text-xs font-bold px-2 py-1 bg-red-500 rounded-full clignoter mt-2">
              ⚠️ EN RETARD
            </span>
          </div>
        )}
        
        {/* Badge URGENT si flag dans l'assignation */}
        {localAssignment?.urgent && (
          <div className="absolute top-0 left-0 right-0 h-2 bg-amber-500 z-5 flex items-center justify-center" style={{ marginTop: doitAvoirTraitRouge ? '14px' : '0' }}>
            <span className="text-white text-xs font-bold px-2 py-1 bg-amber-500 rounded-full mt-2">
              🚨 URGENT
            </span>
          </div>
        )}
        


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

            {/* Date / heure / note */}
      <div className={`absolute bottom-1 left-0 right-0 h-16 z-10 px-3 pt-3 ${localAssignment ? 'pb-5' : 'pb-3'}`}>
        <div className="flex items-center justify-between">
          {/* Date et heure à gauche - position fixe */}
          <div className={`flex items-center space-x-2 text-xs text-gray-500 font-medium ${localAssignment ? 'translate-y-[-6px]' : ''}`}>
            <span className="bg-gray-100 px-2 py-1 rounded-md align-middle">
              {article.orderDate ? format(new Date(article.orderDate), 'dd/MM', { locale: fr }) : 'N/A'}
            </span>
            <span className="bg-gray-100 px-2 py-1 rounded-md align-middle">
              {article.orderDate ? format(new Date(article.orderDate), 'HH:mm', { locale: fr }) : 'N/A'}
            </span>
            {/* Bouton URGENT retiré pour l'instant (seule la bannière reste) */}
            {true && (
              <>
                <button
                  type="button"
                  onClick={() => { 
                    window.dispatchEvent(new Event('mc-close-notes'));
                    setEditingNote(translatedData?.customerNote || article.customerNote || '');
                    setIsNoteOpen(v => !v);
                  }}
                  ref={noteBtnRef}
                  className={`inline-flex items-center cursor-pointer ${ (translatedData?.customerNote || article.customerNote) ? 'px-2 py-1 rounded-md border note-btn' : '' }`}
                  style={{ 
                    backgroundColor: (translatedData?.customerNote || article.customerNote) ? '#fbbf24' : 'transparent',
                    color: (translatedData?.customerNote || article.customerNote) ? '#78350f' : '#374151',
                    border: (translatedData?.customerNote || article.customerNote) ? '1px solid #fcd34d' : 'none',
                    padding: (translatedData?.customerNote || article.customerNote) ? undefined : 0
                  }}
                  aria-haspopup="dialog"
                  aria-expanded={isNoteOpen}
                  aria-label={(translatedData?.customerNote || article.customerNote) ? 'Lire la note' : 'Ajouter une note'}
                  title={(translatedData?.customerNote || article.customerNote) ? 'Lire la note' : 'Ajouter une note'}
                >
                  { (translatedData?.customerNote || article.customerNote) ? (
                    <>
                      <RiStickyNoteFill size={16} className="mr-1" />
                      <span>Note</span>
                    </>
                  ) : (
                    <RiStickyNoteAddLine size={18} className="cursor-pointer" />
                  ) }
                </button>
              </>
            )}
          </div>
          
          {/* Avatar de la tricoteuse ou bouton d'assignation - aligné en bas */}
          <div className="flex items-center gap-2">
            {isLoadingAssignment ? (
              /* Indicateur de chargement */
              <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : localAssignment ? (
              /* Avatar cliquable pour modifier l'assignation */
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openTricoteuseModal()
                }}
                className="group relative w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-md hover:shadow-xl transition-all duration-300 hover:scale-110 translate-y-[-10px]"
                title={`Modifier l'assignation (${localAssignment.tricoteuse_name})`}
                aria-label={`Modifier l'assignation (${localAssignment.tricoteuse_name})`}
              >
                {localAssignment.tricoteuse_photo && isValidPhotoUrl(localAssignment.tricoteuse_photo) ? (
                  <ImageLoader 
                    src={localAssignment.tricoteuse_photo} 
                    alt={`Photo de ${localAssignment.tricoteuse_name}`}
                    className="w-full h-full object-cover"
                    fallback="👤"
                    maxRetries={1}
                    retryDelay={300}
                  />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center text-white text-2xl font-bold"
                    style={{ backgroundColor: localAssignment.tricoteuse_color || '#6b7280' }}
                  >
                    {localAssignment.tricoteuse_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                {/* Indicateur de modification au survol */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10,17 15,12 10,7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                </div>
                

              </button>
            ) : (
              /* Bouton d'assignation par défaut */
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openTricoteuseModal()
                }}
                className="group relative px-3 py-2 rounded-xl flex items-center space-x-2 transition-all duration-300 shadow-md hover:shadow-xl bg-gradient-to-r from-rose-400 to-pink-500 text-white hover:from-rose-500 hover:to-pink-600 mb-1"
                title="Assigner à une tricoteuse"
                aria-label="Assigner à une tricoteuse"
              >
                <div className="w-2 h-2 bg-white rounded-full assigner-dot"></div>
                <span className="text-xs font-semibold">Assigner</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overlay client affiché instantanément sans transition */}
      {isOverlayOpen && (
        <div 
          className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative h-full p-6 flex flex-col">
            <button
              onClick={handleOverlayToggle}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-4xl font-light hover:font-bold w-8 h-8 flex items-center justify-center"
              aria-label="Fermer"
              title="Fermer"
            >
              ×
            </button>
            
            {/* Feedback de copie */}
            {copiedText && (
              <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm font-medium text-center">
                {copiedText}
              </div>
            )}
            
            <div className="space-y-4 pr-16 -ml-2">
              <div className="flex items-center space-x-3 w-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-7 h-7 text-gray-700 flex-shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20a8 8 0 0 1 16 0" />
                </svg>
                <div 
                  className="flex-1 min-w-0 text-base font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                  onClick={() => handleCopy(article.customer, 'Client copié !')}
                  title="Cliquer pour copier"
                >
                  {highlightText(article.customer, searchTerm)}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 w-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-7 h-7 text-gray-700 flex-shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                <div 
                  className="flex-1 min-w-0 text-base font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                  onClick={() => handleCopy(format(new Date(article.orderDate), 'dd/MM/yyyy', { locale: fr }), 'Date copiée !')}
                  title="Cliquer pour copier"
                >
                  {highlightText(format(new Date(article.orderDate), 'dd/MM/yyyy', { locale: fr }), searchTerm)}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 w-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-7 h-7 text-gray-800 flex-shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                  <path d="M3 19l6-6" />
                  <path d="M21 19l-6-6" />
                </svg>
                <div 
                  className="flex-1 min-w-0 text-base font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                  onClick={() => handleCopy(article.customerEmail || 'Non renseigné', 'Email copié !')}
                  title="Cliquer pour copier"
                >
                  {highlightText(article.customerEmail || 'Non renseigné', searchTerm)}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 w-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-7 h-7 text-gray-700 flex-shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4 1.1h2a2 2 0 0 1 2 1.72c.12.9.33 1.77.61 2.61a2 2 0 0 1-.45 2.11L7 8.09a16 16 0 0 0 6 6l.55-.76a2 2 0 0 1 2.11-.45c.84.28 1.71.49 2.61.61A2 2 0 0 1 22 16.92z" />
                </svg>
                <div 
                  className="flex-1 min-w-0 text-base font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                  onClick={() => handleCopy(article.customerPhone || 'Non renseigné', 'Téléphone copié !')}
                  title="Cliquer pour copier"
                >
                  {highlightText(article.customerPhone || 'Non renseigné', searchTerm)}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 w-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-7 h-7 text-gray-700 flex-shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 10.5L12 3l9 7.5" />
                  <path d="M5 10v10h14V10" />
                  <path d="M9 20v-6h6v6" />
                </svg>
                <div 
                  className="flex-1 min-w-0 text-base font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                  onClick={() => handleCopy(article.customerAddress || 'Non renseignée', 'Adresse copiée !')}
                  title="Cliquer pour copier"
                >
                  {renderFormattedAddress(article.customerAddress)}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 w-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-7 h-7 text-gray-700 flex-shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7h11v8H3z" />
                  <path d="M14 10h4l3 3v2h-7z" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
                <div 
                  className="flex-1 min-w-0 text-base font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors whitespace-nowrap"
                  onClick={() => handleCopy(article.shippingMethod || 'Non renseigné', 'Transporteur copié !')}
                  title="Cliquer pour copier"
                >
                  {(() => {
                    const title = (article.shippingMethod || '').toLowerCase()
                    const isFree = title.includes('gratuit') || title.includes('free')
                    if (isFree) {
                      const carrier = article.shippingCarrier || ((article.customerCountry || '').toUpperCase() === 'FR' ? 'UPS' : 'DHL')
                      return highlightText(`Livraison gratuite (${carrier})`, searchTerm)
                    }
                    return highlightText(article.shippingMethod || 'Non renseigné', searchTerm)
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Effet de brillance au survol */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform -skew-x-12 -translate-x-full group-hover:translate-x-full pointer-events-none"></div>

      {/* Popover global de note, pleine largeur de la carte */}
      {isNoteOpen && (translatedData?.customerNote || article.customerNote || true) && (
        <>
          <div className="absolute left-0 right-0 bottom-20 px-3 z-5">
            <div ref={notePopoverRef} className="w-full max-h-96 overflow-auto bg-amber-50 border border-amber-200 rounded-xl shadow-xl p-4 pt-9 text-amber-900 transform -rotate-1">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 text-2xl select-none drop-shadow-sm">📌</div>
              <div className="flex items-start justify-end mb-2 relative">
                <button
                  type="button"
                  onClick={() => setIsNoteOpen(false)}
                  className="text-4xl absolute -top-8 -right-2 text-amber-500 hover:text-amber-700"
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>
              <div className="text-sm leading-relaxed break-words">
                <textarea
                  value={editingNote}
                  onChange={(e) => setEditingNote(e.target.value)}
                  className="w-full p-3 rounded-lg border border-amber-300 bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  rows={5}
                  placeholder="Ajouter une note..."
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={() => { setIsNoteOpen(false); setEditingNote(article.customerNote || '') }}
                    className="px-3 py-1.5 text-sm border border-amber-300 rounded-lg hover:bg-amber-100"
                  >
                    Annuler
                  </button>
                  <button
                    disabled={isSavingNote}
                    onClick={async () => {
                      try {
                        setIsSavingNote(true)
                        const content = (editingNote || '').trim()
                        const ok = await updateOrderNote(article.orderId, content)
                        if (ok) {
                          // Refléter directement en mémoire locale
                          article.customerNote = content
                          setIsNoteOpen(false)
                        }
                      } finally {
                        setIsSavingNote(false)
                      }
                    }}
                    className="px-3 py-1.5 text-sm rounded-lg text-white"
                    style={{ backgroundColor: '#d97706' }}
                  >
                    {isSavingNote ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </div>
              {/* Indicateur de traduction */}
              {translatedData?.customerNote && (
                <div className="mt-3 pt-2 border-t border-amber-200 text-xs text-amber-600 text-center">
                  ✨ Traduit en français
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal d'assignation simple et élégante */}
      {showTricoteuseModal && (
        <div 
          className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-20"
          onClick={closeTricoteuseModal}
        >
          <div 
            className="bg-white rounded-2xl p-4 w-full max-w-full mx-3 shadow-2xl"
            style={{ maxHeight: '100%', overflowY: 'auto', overflowX: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête simple */}
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Choisir une tricoteuse
              </h3>
              <p className="text-sm text-gray-600">
                {localAssignment 
                  ? `Article assigné à ${localAssignment.tricoteuse_name}`
                  : 'Sélectionnez la tricoteuse responsable de cet article'
                }
              </p>
              {isAssigning && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-blue-700">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
                    <span className="text-sm font-medium">Assignation en cours...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Grille 3 par ligne, icônes compactes */}
            <div className="grid grid-cols-3 gap-3">
              {/* Option de retrait si déjà assigné */}
              {localAssignment && (
                <button
                  onClick={removeAssignment}
                  className="group p-3 rounded-xl border-2 border-red-200 hover:border-red-400 hover:bg-red-50 transition-all duration-200"
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-base shadow-md">
                      ✕
                    </div>
                    <p className="font-semibold text-red-700 text-center text-xs">
                      Retirer
                    </p>
                  </div>
                </button>
              )}

              {/* Indicateur de chargement */}
              {isLoadingTricoteuses && (
                <div className="col-span-2 p-6 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-rose-400 border-t-transparent mx-auto mb-3"></div>
                  <p className="text-gray-600 text-sm">Chargement des tricoteuses...</p>
                </div>
              )}

              {/* Liste des tricoteuses */}
              {!isLoadingTricoteuses && tricoteuses.length > 0 && tricoteuses
                .filter(tricoteuse => !localAssignment || tricoteuse._id !== localAssignment.tricoteuse_id)
                .map((tricoteuse) => (
                <button
                  key={tricoteuse._id}
                  onClick={async () => {
                    if (isAssigning) return // Éviter les clics multiples
                    
                    setIsAssigning(true)
                    const assignmentData = {
                      article_id: uniqueAssignmentId, // Identifiant unique pour éviter les conflits
                      tricoteuse_id: tricoteuse._id,
                      tricoteuse_name: tricoteuse.firstName,
                      status: 'en_cours'
                    }
                    
                    try {
                      const savedAssignment = await assignmentsService.createOrUpdateAssignment(assignmentData)
                      
                      // Enrichir immédiatement l'assignation locale avec les données complètes
                      const enrichedAssignment = {
                        ...assignmentData,
                        tricoteuse_photo: tricoteuse.photoUrl,
                        tricoteuse_color: tricoteuse.color,
                        tricoteuse_name: tricoteuse.firstName
                      }
                      setLocalAssignment(enrichedAssignment)
                      
                      if (onAssignmentUpdate) {
                        onAssignmentUpdate(uniqueAssignmentId, enrichedAssignment)
                      }
                      closeTricoteuseModal()
                    } catch (error) {
                      console.error('Erreur lors de la sauvegarde:', error)
                      alert('Erreur lors de l\'assignation. Veuillez réessayer.')
                    } finally {
                      setIsAssigning(false)
                    }
                  }}
                  className={`group p-2 rounded-xl transition-all duration-200 ${
                    isAssigning 
                      ? 'bg-gray-100 cursor-not-allowed opacity-50' 
                      : 'hover:bg-rose-50'
                  }`}
                  disabled={isAssigning}
                >
                  <div className="flex flex-col items-center space-y-2">
                    {/* Photo de la tricoteuse */}
                    {isValidPhotoUrl(tricoteuse.photoUrl) ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm">
                        <ImageLoader 
                          src={tricoteuse.photoUrl} 
                          alt={`Photo de ${tricoteuse.firstName}`}
                          className="w-full h-full object-cover"
                          fallback="👤"
                          maxRetries={1}
                          retryDelay={300}
                          onError={() => {
                            // En cas d'erreur, on pourrait logguer ou gérer l'erreur
                            console.warn(`Impossible de charger la photo de ${tricoteuse.firstName}`)
                          }}
                        />
                      </div>
                    ) : (
                      /* Fallback avec initiale si pas de photo ou URL invalide */
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm"
                        style={{ backgroundColor: tricoteuse.color || '#6b7280' }}
                      >
                        <span>{tricoteuse.firstName.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    
                    {/* Nom seulement */}
                    <p className="font-semibold text-gray-900 text-center text-[11px] leading-none">
                      {isAssigning ? 'Assignation...' : tricoteuse.firstName}
                    </p>
                    
                    {/* Indicateur de chargement */}
                    {isAssigning && (
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-rose-400 border-t-transparent"></div>
                    )}
                  </div>
                </button>
              ))}

              {/* Message si aucune tricoteuse */}
              {!isLoadingTricoteuses && tricoteuses.length === 0 && (
                <div className="col-span-2 p-6 text-center text-gray-500">
                  <p className="text-sm">Aucune tricoteuse disponible</p>
                </div>
              )}

              {/* Section changer le statut si déjà assigné */}
              {localAssignment && !isLoadingTricoteuses && (
                <>
                  
                  <div className="col-span-3 border-t border-gray-200 pt-3 mt-3">
                    <h4 className="text-xs font-semibold text-gray-700 text-center mb-2">
                      Changer le statut
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                       <button
                         onClick={() => {
                           const updatedAssignment = { ...localAssignment, status: 'en_cours' }
                           assignmentsService.createOrUpdateAssignment(updatedAssignment)
                             .then(() => {
                               setLocalAssignment(updatedAssignment)
                               if (onAssignmentUpdate) {
                                 onAssignmentUpdate()
                               }
                               // Fermer la modal après la mise à jour
                               closeTricoteuseModal()
                             })
                             .catch((error) => {
                               console.error('Erreur lors de la mise à jour du statut:', error)
                             })
                         }}
                         className={`p-2 rounded-lg border-2 transition-all duration-300 cursor-pointer hover:shadow-lg hover:bg-yellow-200 ${
                           localAssignment.status === 'en_cours'
                             ? 'text-black shadow-lg'
                             : 'text-black hover:shadow-md'
                         }`}
                                                   style={{
                            backgroundColor: localAssignment.status === 'en_cours' 
                              ? 'var(--couture-en-cours)' 
                              : 'var(--couture-en-cours-hover)',
                            borderColor: localAssignment.status === 'en_cours' 
                              ? 'var(--couture-en-cours-selected-border)' 
                              : 'var(--couture-en-cours-border)'
                          }}
                       >
                         <div className="text-center">
                           <p className="text-xs font-medium">En cours</p>
                         </div>
                       </button>

                       <button
                         onClick={() => {
                           const updatedAssignment = { ...localAssignment, status: 'en_pause' }
                           assignmentsService.createOrUpdateAssignment(updatedAssignment)
                             .then(() => {
                               setLocalAssignment(updatedAssignment)
                               if (onAssignmentUpdate) {
                                 onAssignmentUpdate()
                               }
                               // Fermer la modal après la mise à jour
                               closeTricoteuseModal()
                             })
                             .catch((error) => {
                               console.error('Erreur lors de la mise à jour du statut:', error)
                             })
                         }}
                         className={`p-2 rounded-lg border-2 transition-all duration-300 cursor-pointer hover:shadow-lg hover:bg-orange-200 ${
                           localAssignment.status === 'en_pause'
                             ? 'text-white shadow-lg'
                             : 'text-white hover:shadow-md'
                         }`}
                                                   style={{
                            backgroundColor: localAssignment.status === 'en_pause' 
                              ? 'var(--couture-en-pause)' 
                              : 'var(--couture-en-pause-hover)',
                            borderColor: localAssignment.status === 'en_pause' 
                              ? 'var(--couture-en-pause-selected-border)' 
                              : 'var(--couture-en-pause-border)'
                          }}
                       >
                         <div className="text-center">
                           <p className="text-xs font-medium">En pause</p>
                         </div>
                       </button>

                       <button
                          onClick={(e) => {
                            // Obtenir la position du bouton pour les confettis
                            const rect = e.currentTarget.getBoundingClientRect()
                            setConfettiPosition({ 
                              x: rect.left + rect.width / 2, 
                              y: rect.top + rect.height / 2 
                            })
                            setShowConfetti(true)
                            
                           const updatedAssignment = { ...localAssignment, status: 'termine' }
                            // 1) Persister le statut côté backend (commande/line_item)
                            updateArticleStatus(article.orderId, article.line_item_id, 'termine')
                              .catch(() => {})
                            // 2) Mettre à jour aussi l'assignation locale (si utilisée)
                           assignmentsService.createOrUpdateAssignment(updatedAssignment)
                             .then(() => {
                               setLocalAssignment(updatedAssignment)
                                // Attendre la fin des confettis avant de mettre à jour la liste et fermer
                                setTimeout(() => {
                               if (onAssignmentUpdate) {
                                 onAssignmentUpdate()
                               }
                                  // Retirer visuellement la carte immédiatement côté client
                                  setIsRemoved(true)
                                  // Fermer la modal après l’animation
                               closeTricoteuseModal()
                                }, 3000)
                             })
                             .catch((error) => {
                               console.error('Erreur lors de la mise à jour du statut:', error)
                             })
                         }}
                         className={`p-2 rounded-lg border-2 transition-all duration-300 cursor-pointer hover:shadow-lg hover:bg-green-200 ${
                           localAssignment.status === 'termine'
                             ? 'text-white shadow-lg'
                             : 'text-white hover:shadow-md'
                         }`}
                                                   style={{
                            backgroundColor: localAssignment.status === 'termine' 
                              ? 'var(--couture-termine)' 
                              : 'var(--couture-termine-hover)',
                            borderColor: localAssignment.status === 'termine' 
                              ? 'var(--couture-termine-selected-border)' 
                              : 'var(--couture-termine-border)'
                          }}
                       >
                         <div className="text-center">
                           <p className="text-xs font-medium">Terminé</p>
                         </div>
                       </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bouton de fermeture */}
            <div className="text-center mt-4">
              <button
                onClick={closeTricoteuseModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg border border-gray-300 hover:bg-blue-100 hover:shadow-lg transition-all duration-300 text-sm cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Composant Confetti */}
      <Confetti isActive={showConfetti} position={confettiPosition} />
    </div>
  )
})

export default ArticleCard
