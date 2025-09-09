import React from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { RiStickyNoteAddLine, RiStickyNoteFill } from 'react-icons/ri'

// Barre inférieure: date, heure, bouton note, avatar/assignation
const BottomBar = ({
  article,
  translatedData,
  isNoteOpen,
  onToggleNote,
  noteBtnRef,
  hasNote,
  localAssignment,
  isLoadingAssignment,
  onOpenAssignModal,
  isHighlightedDate = false,
  compact = false,
  disableAssignmentModal = false
}) => {
  // Coller la barre à la bordure inférieure
  const bottomClass = 'bottom-0'

  return (
    <div className={`absolute left-0 right-0 z-10 ${bottomClass} ${compact ? 'px-2 pt-2' : 'px-3 pt-3'} pb-2 sm:pb-3`}>
      <div className="flex items-end justify-between">
        {/* Date et heure (heure masquée en mobile) */}
        <div className={`flex items-end ${compact ? 'space-x-1 text-[10px]' : 'space-x-2 text-xs'} text-gray-500 font-medium`}>
          <span className={`bg-gray-100 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'} rounded-md align-middle`}>
            {article.orderDate ? format(new Date(article.orderDate), 'dd/MM', { locale: fr }) : 'N/A'}
          </span>
          <span className={`hidden sm:inline-block bg-gray-100 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'} rounded-md align-middle`}>
            {article.orderDate ? format(new Date(article.orderDate), 'HH:mm', { locale: fr }) : 'N/A'}
          </span>
          {/* Bouton note: style différent si note présente */}
          <button
            type="button"
            onClick={onToggleNote}
            ref={noteBtnRef}
            className={`inline-flex items-center ${ hasNote ? (compact ? 'px-1.5 py-0.5' : 'px-2 py-1') + ' rounded-md border note-btn' : '' }`}
            style={{
              backgroundColor: hasNote ? '#fbbf24' : 'transparent',
              color: hasNote ? '#78350f' : '#374151',
              border: hasNote ? '1px solid #fcd34d' : 'none',
              padding: hasNote ? undefined : 0
            }}
            aria-haspopup="dialog"
            aria-expanded={isNoteOpen}
            aria-label={hasNote ? 'Lire la note' : 'Ajouter une note'}
            title={hasNote ? 'Lire la note' : 'Ajouter une note'}
          >
            {hasNote ? (<><RiStickyNoteFill size={compact ? 12 : 16} className="mr-1" /><span className={compact ? 'text-[10px]' : ''}>Note</span></>) : (<RiStickyNoteAddLine size={compact ? 14 : 18} className="cursor-pointer" />)}
          </button>
        </div>

        {/* Avatar assignation / bouton assigner */}
        <div className="flex items-end">
          {isLoadingAssignment ? (
            <div className={`w-8 h-8 ${compact ? 'sm:w-10 sm:h-10' : 'sm:w-14 sm:h-14'} rounded-full bg-gray-200 animate-pulse flex items-center justify-center`}>
              <div className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} border-2 border-gray-400 border-t-transparent rounded-full animate-spin`}></div>
            </div>
          ) : (localAssignment && localAssignment.tricoteuse_id && localAssignment.tricoteuse_id !== 'unassigned') || (article.status === 'en_cours' && article.assigned_to) ? (
            <button
              onClick={disableAssignmentModal ? undefined : (e) => { e.stopPropagation(); onOpenAssignModal(); }}
              className={`group relative w-8 h-8 ${compact ? 'sm:w-10 sm:h-10' : 'sm:w-14 sm:h-14'} rounded-full overflow-hidden border-2 border-white shadow-md ${disableAssignmentModal ? 'cursor-default' : 'hover:shadow-xl transition-all duration-300 hover:scale-110 cursor-pointer'}`}
              title={disableAssignmentModal ? `${localAssignment?.tricoteuse_name || article.assigned_to} (assigné)` : `Modifier l'assignation (${localAssignment?.tricoteuse_name || article.assigned_to})`}
              aria-label={disableAssignmentModal ? `${localAssignment?.tricoteuse_name || article.assigned_to} (assigné)` : `Modifier l'assignation (${localAssignment?.tricoteuse_name || article.assigned_to})`}
            >
              {localAssignment?.tricoteuse_photo ? (
                <img src={localAssignment.tricoteuse_photo} alt={`Photo de ${localAssignment.tricoteuse_name || article.assigned_to}`} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-white ${compact ? 'text-xs sm:text-base' : 'text-sm sm:text-2xl'} font-bold`} style={{ backgroundColor: localAssignment?.tricoteuse_color || '#6b7280' }}>
                  {(localAssignment?.tricoteuse_name || article.assigned_to)?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={disableAssignmentModal ? undefined : (e) => { e.stopPropagation(); onOpenAssignModal(); }}
              className={`group relative transition-all duration-300 shadow-md ${disableAssignmentModal ? 'cursor-default' : 'hover:shadow-xl'} bg-gradient-to-r from-rose-400 to-pink-500 text-white ${disableAssignmentModal ? '' : 'hover:from-rose-500 hover:to-pink-600'}
                w-8 h-8 rounded-full flex items-center justify-center border-2 border-white
                sm:w-auto sm:h-auto sm:rounded-xl sm:flex sm:items-center sm:justify-start ${compact ? 'sm:px-2 sm:py-1 sm:space-x-1 sm:text-[10px]' : 'sm:px-3 sm:py-2 sm:space-x-2 sm:text-xs'}`}
              title={disableAssignmentModal ? "Assignation désactivée" : "Assigner à une couturière"}
              aria-label={disableAssignmentModal ? "Assignation désactivée" : "Assigner à une couturière"}
            >
              <span className="hidden sm:inline font-semibold">Assigner</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`w-3 h-3 ${compact ? 'sm:w-2.5 sm:h-2.5' : 'sm:w-3 sm:h-3'}`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default BottomBar


