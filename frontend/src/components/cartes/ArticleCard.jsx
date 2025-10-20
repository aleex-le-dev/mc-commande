import { useState, useEffect, useCallback, useMemo, useRef, forwardRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import TopBadges from './TopBadges'
import BottomBar from './BottomBar'
import ClientOverlay from './ClientOverlay'
import NotePopover from './NotePopover'
import NoteExpander from './NoteExpander'
import AssignModal from './AssignModal'
import HeaderMedia from './HeaderMedia'
import InfoSection from './InfoSection'
import useArticleCard from './card/useArticleCard'
import { highlightText, renderFormattedAddress } from '../../utils/textUtils.jsx'
import { ApiService } from '../../services/apiService'
import statusService from '../../services/statusService'
// Icônes utilisées dans BottomBar uniquement; ArticleCard n'en a plus besoin
import delaiService from '../../services/delaiService'
 
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
  isEnRetard = false, // Nouvelle prop pour indiquer si l'article est en retard
  disableStatusBorder = false, // Désactive la bordure de statut (pour affichages spéciaux)
  hideInfoSection = false, // Masque la section d'infos (nom, options)
  compact = false, // Mode compact: hauteur réduite (utilisé en Terminé)
  disableAssignmentModal = false, // Désactive l'ouverture de la modal d'assignation
  clientOverlayCompact = false // Mode compact pour l'overlay client
}, ref) => {
  const queryClient = useQueryClient()
  // Gestion du long-press mobile pour ouvrir le menu contextuel
  // Utilise des refs pour éviter des re-rendus inutiles
  const longPressTimerRef = useRef(null)
  const touchStartPositionRef = useRef({ x: 0, y: 0 })
  const lastTouchPositionRef = useRef({ x: 0, y: 0 })
  const longPressTriggeredRef = useRef(false)
  const {
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
    noteBtnRef, notePopoverRef,
    memoizedImageUrl, memoizedProductId, uniqueAssignmentId,
    displayImageUrl,
    handleCopy,
    loadExistingAssignment,
    loadTricoteuses,
    removeAssignment,
    assignArticle,
    changeStatus,
    handleTranslation,
    isValidPhotoUrl,
    doitAvoirTraitRouge,
    estApresDateLimite,
    localUrgent, setLocalUrgent,
    toggleNoteEditor,
    saveNote,
    closeNoteEditor,
    openNoteEditor
  } = useArticleCard({ article, assignment, onAssignmentUpdate, tricoteusesProp, productionType, isEnRetard, isAfterDateLimite })
  
  // État pour forcer le re-render
  const [forceUpdate, setForceUpdate] = useState(0)
  
  
  // Écouter les mises à jour d'assignation pour forcer le re-render
  useEffect(() => {
    const handleAssignmentUpdate = () => {
      setForceUpdate(prev => prev + 1)
    }
    
    window.addEventListener('mc-assignment-updated', handleAssignmentUpdate)
    return () => window.removeEventListener('mc-assignment-updated', handleAssignmentUpdate)
  }, [])
  
  // Fonction utilitaire: dispatcher l'événement de menu contextuel
  const dispatchContextMenu = useCallback((clientX, clientY) => {
    try {
      // Essayer de récupérer tous les articles de la commande
      let allArticlesOfOrder = [article]
      
      if (window.mcAllArticles && Array.isArray(window.mcAllArticles)) {
        allArticlesOfOrder = window.mcAllArticles.filter(a => 
          a.orderNumber === article.orderNumber || a.orderId === article.orderId
        )
      }
      
      // Si pas d'articles trouvés, utiliser l'article actuel
      if (allArticlesOfOrder.length === 0) {
        allArticlesOfOrder = [article]
      }
      
      const isOrderUrgent = Array.isArray(allArticlesOfOrder) && allArticlesOfOrder.some(a => a?.production_status?.urgent === true)
      const detail = {
        x: clientX,
        y: clientY,
        uniqueAssignmentId,
        hasAssignment: Boolean(localAssignment),
        currentUrgent: Boolean(isOrderUrgent || article?.production_status?.urgent === true),
        hasNote: Boolean(article.customerNote),
        currentProductionType: article.productionType,
        orderNumber: article.orderNumber,
        orderId: article.orderId,
        articles: allArticlesOfOrder,
      }
      window.dispatchEvent(new CustomEvent('mc-context', { detail }))
    } catch (error) {
      console.error('Erreur dispatchContextMenu:', error)
    }
  }, [article, localAssignment, uniqueAssignmentId])

  // Handlers long-press mobile → clic droit simulé
  const handleTouchStart = useCallback((e) => {
    if (!e.touches || e.touches.length === 0) return
    const t = e.touches[0]
    touchStartPositionRef.current = { x: t.clientX, y: t.clientY }
    lastTouchPositionRef.current = { x: t.clientX, y: t.clientY }
    longPressTriggeredRef.current = false
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current) }
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true
      dispatchContextMenu(lastTouchPositionRef.current.x, lastTouchPositionRef.current.y)
    }, 600)
  }, [dispatchContextMenu])

  const handleTouchMove = useCallback((e) => {
    if (!e.touches || e.touches.length === 0) return
    const t = e.touches[0]
    lastTouchPositionRef.current = { x: t.clientX, y: t.clientY }
    // Annuler le long-press si le doigt bouge trop (scroll ou glissé)
    const dx = lastTouchPositionRef.current.x - touchStartPositionRef.current.x
    const dy = lastTouchPositionRef.current.y - touchStartPositionRef.current.y
    const movedDistance = Math.sqrt(dx * dx + dy * dy)
    if (movedDistance > 12 && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const endTouch = useCallback((e) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (longPressTriggeredRef.current) {
      // Empêcher les clics/presses suivants quand le menu a été ouvert
      try { e.preventDefault() } catch {}
      try { e.stopPropagation() } catch {}
      longPressTriggeredRef.current = false
    }
  }, [])

  const [localOverlayOpen, setLocalOverlayOpen] = useState(false)
  const actualOverlayOpen = isOverlayOpen !== undefined ? isOverlayOpen : localOverlayOpen

  const handleOverlayToggle = useCallback((e) => {
    e.stopPropagation()
    if (isOverlayOpen !== undefined) {
      // État géré en externe
      onOverlayOpen && onOverlayOpen()
    } else {
      // État géré localement
      setLocalOverlayOpen(prev => !prev)
    }
  }, [onOverlayOpen, isOverlayOpen])

  useEffect(() => {
    const handleMarkUrgent = async (ev) => {
      const { uniqueAssignmentId: targetId, urgent } = ev.detail || {}
      if (targetId !== uniqueAssignmentId) return
      try {
        await ApiService.production.setArticleUrgent(article.orderId, article.line_item_id, urgent)
        // Override local urgent and mirror on article.production_status for instant UI
        setLocalUrgent(Boolean(urgent))
        try {
          // Mettre à jour l'objet article directement
          article.urgent = Boolean(urgent)
          if (!article.production_status) {
            article.production_status = {}
          }
          article.production_status.urgent = Boolean(urgent)
          console.log('🔄 Article urgent mis à jour:', { orderId: article.orderId, lineItemId: article.line_item_id, urgent: Boolean(urgent) })
        } catch {}
        // notifier tri + mise à jour locale des données unifiées
        window.dispatchEvent(new Event('mc-mark-urgent'))
        window.dispatchEvent(new CustomEvent('mc-article-urgent-updated', { detail: { orderId: article.orderId, lineItemId: article.line_item_id, urgent: Boolean(urgent) } }))
        // Forcer le re-render et le re-tri après changement urgent
        setTimeout(() => {
          window.dispatchEvent(new Event('mc-refresh-data'))
          window.dispatchEvent(new Event('mc-data-updated'))
          // Forcer un re-calcul complet des articles
          window.dispatchEvent(new Event('mc-sync-completed'))
        }, 100)
      } catch (e) {
        setLocalUrgent(Boolean(urgent))
        try {
          // Mettre à jour l'objet article directement
          article.urgent = Boolean(urgent)
          if (!article.production_status) {
            article.production_status = {}
          }
          article.production_status.urgent = Boolean(urgent)
          console.log('🔄 Article urgent mis à jour (fallback):', { orderId: article.orderId, lineItemId: article.line_item_id, urgent: Boolean(urgent) })
        } catch {}
        window.dispatchEvent(new Event('mc-mark-urgent'))
        window.dispatchEvent(new CustomEvent('mc-article-urgent-updated', { detail: { orderId: article.orderId, lineItemId: article.line_item_id, urgent: Boolean(urgent) } }))
        // Forcer le re-render et le re-tri après changement urgent
        setTimeout(() => {
          window.dispatchEvent(new Event('mc-refresh-data'))
          window.dispatchEvent(new Event('mc-data-updated'))
          // Forcer un re-calcul complet des articles
          window.dispatchEvent(new Event('mc-sync-completed'))
        }, 100)
      }
    }
    window.addEventListener('mc-mark-urgent', handleMarkUrgent, true)
    const handleOpenClientOverlay = (ev) => {
      const { uniqueAssignmentId: targetId } = ev.detail || {}
      if (targetId !== uniqueAssignmentId) return
      // Simule un clic sur le bouton overlay
      onOverlayOpen && onOverlayOpen()
    }
    window.addEventListener('mc-open-client-overlay', handleOpenClientOverlay, true)
    
    const handleMoveProduction = async (ev) => {
      const { uniqueAssignmentId: targetId, newType } = ev.detail || {}
      if (targetId !== uniqueAssignmentId) return
      
      try {
        // Appeler l'API pour changer le type de production
        const base = (import.meta.env.DEV ? 'http://localhost:3001' : 'https://maisoncleo-commande.onrender.com')
        const response = await fetch(`${base}/api/production-status/${article.line_item_id}/type`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ production_type: newType })
        })
        
        if (response.ok) {
          // OPTIMISATION: Timeout avec cleanup
          const refreshTimeoutId = setTimeout(() => {
            // Rafraîchir les données
            window.dispatchEvent(new Event('mc-refresh-data'))
            // Déclencher le re-tri pour les articles urgents
            window.dispatchEvent(new Event('mc-mark-urgent'))
          }, 500)
          
          // Cleanup du timeout si le composant est démonté
          return () => clearTimeout(refreshTimeoutId)
        } else {
          console.error('Erreur lors du déplacement:', response.statusText)
        }
      } catch (error) {
        console.error('Erreur lors du déplacement:', error)
      }
    }
    
    const handleChangeStatus = async (ev) => {
      const { uniqueAssignmentId: targetId, newStatus } = ev.detail || {}
      if (targetId !== uniqueAssignmentId) return
      try {
        if (localAssignment) {
          const updated = { ...localAssignment, status: newStatus }
          
          // Synchroniser le status avec production_status en BDD
          try { 
            await ApiService.production.updateArticleStatus(article.orderId, article.line_item_id, newStatus) 
          } catch (error) {
            console.error('❌ Erreur synchronisation status en BDD:', error)
          }
          
          await ApiService.assignments.createAssignment(updated)
          setLocalAssignment(updated)
          if (onAssignmentUpdate) { onAssignmentUpdate(uniqueAssignmentId, updated) }
          
          // OPTIMISATION: Timeout avec cleanup
          const refreshTimeoutId = setTimeout(() => {
            window.dispatchEvent(new Event('mc-refresh-data'))
          }, 500)
          
          // Déclencher des confettis quand terminé
          if (newStatus === 'termine') {
            try {
              const rect = document.body.getBoundingClientRect()
              setConfettiPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
              setShowConfetti(true)
            } catch {}
          }
          
          // Cleanup du timeout si le composant est démonté
          return () => clearTimeout(refreshTimeoutId)
        }
      } catch (e) {
        console.error('Erreur changement statut:', e)
      }
    }

    const handleEditNote = (ev) => {
      const { uniqueAssignmentId: targetId } = ev.detail || {}
      if (targetId !== uniqueAssignmentId) return
      
      // Utiliser openNoteEditor si disponible, sinon fallback manuel
      if (typeof openNoteEditor === 'function') {
        openNoteEditor()
      } else {
        window.dispatchEvent(new Event('mc-close-notes'))
        setEditingNote(article.customerNote || article.production_status?.notes || '')
        if (typeof setIsNoteOpen === 'function') {
          setIsNoteOpen(true)
        } else {
          console.error('setIsNoteOpen n\'est pas une fonction:', setIsNoteOpen)
        }
      }
    }
    const handleOpenAssign = (ev) => {
      const { uniqueAssignmentId: targetId } = ev.detail || {}
      if (targetId !== uniqueAssignmentId) return
      openTricoteuseModal()
    }
    window.addEventListener('mc-edit-note', handleEditNote, true)
    window.addEventListener('mc-open-assign', handleOpenAssign, true)
    window.addEventListener('mc-move-production', handleMoveProduction, true)
    window.addEventListener('mc-change-status', handleChangeStatus, true)
    return () => {
      window.removeEventListener('mc-mark-urgent', handleMarkUrgent, true)
      window.removeEventListener('mc-open-client-overlay', handleOpenClientOverlay, true)
      window.removeEventListener('mc-edit-note', handleEditNote, true)
      window.removeEventListener('mc-open-assign', handleOpenAssign, true)
      window.removeEventListener('mc-move-production', handleMoveProduction, true)
      window.removeEventListener('mc-change-status', handleChangeStatus, true)
    }
  }, [localAssignment, uniqueAssignmentId])

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

  // Logiques extraites dans useArticleCard

  // Si retiré localement, ne plus afficher la carte
  if (isRemoved) {
    return null
  }

  // Debug ciblé désactivé

  return (
    <div 
      className={`group relative rounded-3xl overflow-hidden shadow-lg ${compact ? 'h-[300px] sm:h-[340px]' : 'h-[360px] sm:h-[480px]'} max-w-full ${
        isHighlighted && !disableStatusBorder ? 'border-2 border-accent animate-pink-blink' : ''
      } ${
        disableStatusBorder
          ? ''
          : (
            localAssignment ? 
              (localAssignment.status === 'en_cours' ? 'border-status-en-cours' :
               localAssignment.status === 'en_pause' ? 'border-status-en-pause' :
               localAssignment.status === 'termine' ? 'border-status-termine' :
               'border-status-retard') :
            // Fallback: utiliser le statut depuis l'article si pas d'assignation locale
            (article.globalStatus === 'en_cours' ? 'border-status-en-cours' :
             article.globalStatus === 'en_pause' ? 'border-status-en-pause' :
             article.globalStatus === 'termine' ? 'border-status-termine' :
             doitAvoirTraitRouge ? 'border-status-retard' : '')
          )
      }`}
      data-debug-assignment={localAssignment ? `${localAssignment.status}-${localAssignment.tricoteuse_name}` : `fallback-${article.status}`}

             style={{ 
         backgroundColor: 'white'
       }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dispatchContextMenu(e.clientX, e.clientY);
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={endTouch}
      onTouchCancel={endTouch}
    >

      {/* Badges supérieurs pour retard et urgent */}
      <TopBadges 
        showRetard={isEnRetard && showRetardIndicator}
        showUrgent={Boolean(article?.production_status?.urgent === true || localUrgent)}
      />

      <HeaderMedia
        article={article}
        displayImageUrl={displayImageUrl}
        isImageLoading={isImageLoading}
        isFromCache={isFromCache}
        imageUrl={imageUrl}
        memoizedProductId={memoizedProductId}
        setIsImageLoading={setIsImageLoading}
        setImageUrl={setImageUrl}
        doitAvoirTraitRouge={doitAvoirTraitRouge}
        isUrgent={Boolean(article?.production_status?.urgent === true || localUrgent)}
        handleOverlayToggle={handleOverlayToggle}
        isOverlayOpen={actualOverlayOpen}
        compact={compact}
        
        
      />

      {!hideInfoSection && (
        <InfoSection
          article={article}
          compact={compact}
          searchTerm={searchTerm}
        />
      )}

      {/* Affichage du cadre de note retiré à la demande: la note n'est plus affichée dans la carte */}

            {/* Date / heure / note / assignation */}
      <BottomBar
        article={article}
        compact={compact}
        isNoteOpen={Boolean(isNoteOpen)}
        onToggleNote={toggleNoteEditor}
        noteBtnRef={noteBtnRef}
        hasNote={Boolean(article.production_status?.notes || article.customerNote)}
        displayNote={article.production_status?.notes || article.customerNote || ''}
        localAssignment={localAssignment}
        isLoadingAssignment={isLoadingAssignment}
        onOpenAssignModal={disableAssignmentModal ? () => {} : () => openTricoteuseModal()}
        disableAssignmentModal={disableAssignmentModal}
      />

      {/* Overlay client affiché instantanément sans transition */}
      <ClientOverlay
        isOpen={actualOverlayOpen}
        onClose={handleOverlayToggle}
        article={article}
        searchTerm={searchTerm}
        copiedText={copiedText}
        onCopy={handleCopy}
        renderFormattedAddress={renderFormattedAddress}
        highlightText={highlightText}
        compact={clientOverlayCompact}
      />

      {/* Effet de brillance au survol */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform -skew-x-12 -translate-x-full group-hover:translate-x-full pointer-events-none"></div>

      {/* Popover global de note, pleine largeur de la carte */}
      <NotePopover
        isOpen={isNoteOpen}
        notePopoverRef={notePopoverRef}
                initialValue={editingNote}
                saving={isSavingNote}
                onClose={closeNoteEditor}
                onSave={saveNote}
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
        onPick={assignArticle}
        onChangeStatus={changeStatus}
        isValidPhotoUrl={isValidPhotoUrl}
      />
      
      {/* Composant Confetti */}
      <Confetti isActive={showConfetti} position={confettiPosition} />
    </div>
  )
})

export default ArticleCard
