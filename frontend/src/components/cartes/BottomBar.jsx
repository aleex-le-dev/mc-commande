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
  isHighlightedDate = false
}) => {
  return (
    <div className={`absolute bottom-1 left-0 right-0 h-16 z-10 px-3 pt-3 ${localAssignment ? 'pb-5' : 'pb-3'}`}>
      <div className="flex items-center justify-between">
        {/* Date et heure */}
        <div className={`flex items-center space-x-2 text-xs text-gray-500 font-medium ${localAssignment ? 'translate-y-[-6px]' : ''}`}>
          <span className="bg-gray-100 px-2 py-1 rounded-md align-middle">
            {article.orderDate ? format(new Date(article.orderDate), 'dd/MM', { locale: fr }) : 'N/A'}
          </span>
          <span className="bg-gray-100 px-2 py-1 rounded-md align-middle">
            {article.orderDate ? format(new Date(article.orderDate), 'HH:mm', { locale: fr }) : 'N/A'}
          </span>
          {/* Bouton note: style différent si note présente */}
          <button
            type="button"
            onClick={onToggleNote}
            ref={noteBtnRef}
            className={`inline-flex items-center ${ hasNote ? 'px-2 py-1 rounded-md border note-btn' : '' }`}
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
            {hasNote ? (<><RiStickyNoteFill size={16} className="mr-1" /><span>Note</span></>) : (<RiStickyNoteAddLine size={18} className="cursor-pointer" />)}
          </button>
        </div>

        {/* Avatar assignation / bouton assigner */}
        <div className="flex items-center">
          {isLoadingAssignment ? (
            <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : localAssignment ? (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenAssignModal(); }}
              className="group relative w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-md hover:shadow-xl transition-all duration-300 hover:scale-110 translate-y-[-10px]"
              title={`Modifier l'assignation (${localAssignment.tricoteuse_name})`}
              aria-label={`Modifier l'assignation (${localAssignment.tricoteuse_name})`}
            >
              {localAssignment.tricoteuse_photo ? (
                <img src={localAssignment.tricoteuse_photo} alt={`Photo de ${localAssignment.tricoteuse_name}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: localAssignment.tricoteuse_color || '#6b7280' }}>
                  {localAssignment.tricoteuse_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenAssignModal(); }}
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
  )
}

export default BottomBar


