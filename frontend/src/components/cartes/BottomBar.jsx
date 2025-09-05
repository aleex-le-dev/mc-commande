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
  compact = false
}) => {
  return (
    <div className={`absolute bottom-1 left-0 right-0 ${compact ? 'h-10' : 'h-16'} z-10 ${compact ? 'px-2 pt-2' : 'px-3 pt-3'} ${localAssignment ? (compact ? 'pb-3' : 'pb-5') : (compact ? 'pb-2' : 'pb-3')}`}>
      <div className="flex items-center justify-between">
        {/* Date et heure */}
        <div className={`flex items-center ${compact ? 'space-x-1 text-[10px]' : 'space-x-2 text-xs'} text-gray-500 font-medium ${localAssignment ? (compact ? 'translate-y-[-4px]' : 'translate-y-[-6px]') : ''}`}>
          <span className={`bg-gray-100 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'} rounded-md align-middle`}>
            {article.orderDate ? format(new Date(article.orderDate), 'dd/MM', { locale: fr }) : 'N/A'}
          </span>
          <span className={`bg-gray-100 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'} rounded-md align-middle`}>
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
        <div className="flex items-center">
          {isLoadingAssignment ? (
            <div className={`${compact ? 'w-10 h-10' : 'w-14 h-14'} rounded-full bg-gray-200 animate-pulse flex items-center justify-center` }>
              <div className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} border-2 border-gray-400 border-t-transparent rounded-full animate-spin`}></div>
            </div>
          ) : (localAssignment && localAssignment.tricoteuse_id && localAssignment.tricoteuse_id !== 'unassigned') || (article.status === 'en_cours' && article.assigned_to) ? (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenAssignModal(); }}
              className={`group relative ${compact ? 'w-10 h-10 translate-y-[-6px]' : 'w-14 h-14 translate-y-[-10px]'} rounded-full overflow-hidden border-2 border-white shadow-md hover:shadow-xl transition-all duration-300 hover:scale-110 cursor-pointer`}
              title={`Modifier l'assignation (${localAssignment?.tricoteuse_name || article.assigned_to})`}
              aria-label={`Modifier l'assignation (${localAssignment?.tricoteuse_name || article.assigned_to})`}
            >
              {localAssignment?.tricoteuse_photo ? (
                <img src={localAssignment.tricoteuse_photo} alt={`Photo de ${localAssignment.tricoteuse_name || article.assigned_to}`} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-white ${compact ? 'text-base' : 'text-2xl'} font-bold`} style={{ backgroundColor: localAssignment?.tricoteuse_color || '#6b7280' }}>
                  {(localAssignment?.tricoteuse_name || article.assigned_to)?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenAssignModal(); }}
              className={`group relative ${compact ? 'px-2 py-1 space-x-1 text-[10px]' : 'px-3 py-2 space-x-2 text-xs'} rounded-xl flex items-center transition-all duration-300 shadow-md hover:shadow-xl bg-gradient-to-r from-rose-400 to-pink-500 text-white hover:from-rose-500 hover:to-pink-600 mb-1`}
              title="Assigner à une couturière"
              aria-label="Assigner à une couturière"
            >
              <span className="font-semibold">Assigner</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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


