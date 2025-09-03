import { useState, useEffect, useCallback, useMemo, useRef, forwardRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
import useArticleCard from './card/useArticleCard'
import { highlightText, renderFormattedAddress } from '../../utils/textUtils.jsx'
import imageService from '../../services/imageService'
import { tricoteusesService, assignmentsService, updateArticleStatus, updateOrderNote } from '../../services/mongodbService'
import statusService from '../../services/statusService'
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
  const queryClient = useQueryClient()
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
    handleTranslation,
    isValidPhotoUrl,
    doitAvoirTraitRouge,
    estApresDateLimite,
    localUrgent, setLocalUrgent,
  } = useArticleCard({ article, assignment, onAssignmentUpdate, tricoteusesProp, productionType, isEnRetard, isAfterDateLimite })

  const handleOverlayToggle = useCallback((e) => {
    e.stopPropagation()
    onOverlayOpen && onOverlayOpen()
  }, [onOverlayOpen])

  useEffect(() => {
    const handleMarkUrgent = async (ev) => {
      const { uniqueAssignmentId: targetId, urgent } = ev.detail || {}
      if (targetId !== uniqueAssignmentId) return
      if (localAssignment) {
        const updated = { ...localAssignment, urgent }
        setLocalAssignment(updated)
        try {
          await assignmentsService.createOrUpdateAssignment(updated)
          if (onAssignmentUpdate) {
            onAssignmentUpdate(uniqueAssignmentId, updated)
          }
          // Notifier pour déclencher le re-tri immédiat
          window.dispatchEvent(new Event('mc-mark-urgent'))
        } catch (e) {
          setLocalAssignment(localAssignment)
        }
      } else {
        // Créer/mettre à jour une assignation minimale côté serveur pour persister URGENT
        // Le backend requiert tricoteuse_id et tricoteuse_name
        const minimalAssignment = { 
          article_id: uniqueAssignmentId, 
          tricoteuse_id: 'unassigned', 
          tricoteuse_name: 'Non assigné', 
          status: 'non_assigné',
          urgent 
        }
        try {
          await assignmentsService.createOrUpdateAssignment(minimalAssignment)
          setLocalAssignment(minimalAssignment)
          if (onAssignmentUpdate) {
            onAssignmentUpdate(uniqueAssignmentId, minimalAssignment)
          }
          // Notifier pour déclencher le re-tri immédiat
          window.dispatchEvent(new Event('mc-mark-urgent'))
        } catch (e) {
          // Fallback local si le backend échoue
          setLocalUrgent(urgent)
          // Notifier pour déclencher le re-tri immédiat même en cas d'erreur
          window.dispatchEvent(new Event('mc-mark-urgent'))
        }
      }
    }
    window.addEventListener('mc-mark-urgent', handleMarkUrgent, true)
    
    const handleMoveProduction = async (ev) => {
      const { uniqueAssignmentId: targetId, newType } = ev.detail || {}
      if (targetId !== uniqueAssignmentId) return
      
      try {
        // Appeler l'API pour changer le type de production
        const response = await fetch(`http://localhost:3001/api/production-status/${article.line_item_id}/type`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ production_type: newType })
        })
        
        if (response.ok) {
          // Attendre un peu pour que la base de données se mette à jour
          setTimeout(() => {
            // Rafraîchir les données
            window.dispatchEvent(new Event('mc-refresh-data'))
            // Déclencher le re-tri pour les articles urgents
            window.dispatchEvent(new Event('mc-mark-urgent'))
          }, 500)
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
            await updateArticleStatus(article.orderId, article.line_item_id, newStatus) 
          } catch (error) {
            console.error('❌ Erreur synchronisation status en BDD:', error)
          }
          
          await assignmentsService.createOrUpdateAssignment(updated)
          setLocalAssignment(updated)
          if (onAssignmentUpdate) { onAssignmentUpdate(uniqueAssignmentId, updated) }
          
          // Déclencher le rechargement des données
          setTimeout(() => {
            window.dispatchEvent(new Event('mc-refresh-data'))
          }, 500)
          if (newStatus === 'termine') {
            const rect = document.body.getBoundingClientRect()
            setConfettiPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
            setShowConfetti(true)
          }
        }
      } catch (e) {
        console.error('Erreur changement statut:', e)
      }
    }

    const handleEditNote = (ev) => {
      const { uniqueAssignmentId: targetId } = ev.detail || {}
      if (targetId !== uniqueAssignmentId) return
      window.dispatchEvent(new Event('mc-close-notes'))
      setEditingNote(article.customerNote || '')
      setIsNoteOpen(true)
    }
    window.addEventListener('mc-edit-note', handleEditNote, true)
    window.addEventListener('mc-move-production', handleMoveProduction, true)
    window.addEventListener('mc-change-status', handleChangeStatus, true)
    return () => {
      window.removeEventListener('mc-mark-urgent', handleMarkUrgent, true)
      window.removeEventListener('mc-edit-note', handleEditNote, true)
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

  return (
    <div 
      className={`group relative rounded-3xl overflow-hidden shadow-lg h-[480px] max-w-full ${isHighlighted ? `border-2 border-accent animate-pink-blink` : ''} ${
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
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // Récupérer tous les articles de la même commande
        const allArticlesOfOrder = window.mcAllArticles?.filter(a => a.orderNumber === article.orderNumber) || [article]
        
        const detail = {
          x: e.clientX,
          y: e.clientY,
          uniqueAssignmentId,
          hasAssignment: Boolean(localAssignment),
          currentUrgent: localAssignment ? Boolean(localAssignment?.urgent) : Boolean(localUrgent),
          hasNote: Boolean(article.customerNote),
          currentProductionType: article.productionType,
          orderNumber: article.orderNumber,
          orderId: article.orderId,
          articles: allArticlesOfOrder, // Tous les articles de la commande
        };
        window.dispatchEvent(new CustomEvent('mc-context', { detail }));
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
        isUrgent={localAssignment ? Boolean(localAssignment?.urgent) : Boolean(localUrgent)}
        handleOverlayToggle={handleOverlayToggle}
        isOverlayOpen={isOverlayOpen}
        handleTranslation={handleTranslation}
        translatedData={translatedData}
      />

      <InfoSection
        article={article}
        translatedData={translatedData}
        searchTerm={searchTerm}
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
          // Préserver le statut urgent existant lors du changement d'assignation
          const currentUrgent = localAssignment ? localAssignment.urgent : localUrgent
          const assignmentData = { 
            article_id: uniqueAssignmentId, 
            tricoteuse_id: tricoteuse._id, 
            tricoteuse_name: tricoteuse.firstName, 
            status: 'en_cours',
            urgent: currentUrgent
          }
          try {
            await assignmentsService.createOrUpdateAssignment(assignmentData)
            
            // Synchroniser le status initial avec production_status en BDD
            try { 
              await updateArticleStatus(article.orderId, article.line_item_id, 'en_cours') 
            } catch (error) {
              console.error('❌ Erreur synchronisation status initial en BDD:', error)
            }
            
            const enrichedAssignment = { ...assignmentData, tricoteuse_photo: tricoteuse.photoUrl, tricoteuse_color: tricoteuse.color, tricoteuse_name: tricoteuse.firstName }
            setLocalAssignment(enrichedAssignment)
            if (onAssignmentUpdate) { onAssignmentUpdate(uniqueAssignmentId, enrichedAssignment) }
            closeTricoteuseModal()
            
            // Déclencher le rechargement des données
            setTimeout(() => {
              window.dispatchEvent(new Event('mc-refresh-data'))
            }, 500)
          } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error)
            alert('Erreur lors de l\'assignation. Veuillez réessayer.')
          } finally {
            setIsAssigning(false)
          }
                  }}
        onChangeStatus={async (status) => {
          const updatedAssignment = { ...localAssignment, status }
          
          // Utiliser le service de statut pour une mise à jour temps réel
          try {
            await statusService.updateStatus(article.orderId, article.line_item_id, status)
          } catch (error) {
            console.error('❌ Erreur synchronisation status:', error)
          }
          
          if (status === 'termine') {
            const rect = document.body.getBoundingClientRect()
            setConfettiPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
            setShowConfetti(true)
          }
          
          try {
            await assignmentsService.createOrUpdateAssignment(updatedAssignment)
            setLocalAssignment(updatedAssignment)
            if (onAssignmentUpdate) { onAssignmentUpdate() }
            closeTricoteuseModal()
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
