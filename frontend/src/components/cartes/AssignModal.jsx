import React from 'react'
import ImageLoader from './ImageLoader'

// Modal d'assignation: grille, retrait, changement de statut
const AssignModal = ({
  isOpen,
  onClose,
  isAssigning,
  isLoadingTricoteuses,
  tricoteuses,
  localAssignment,
  onRemove,
  onPick,
  onChangeStatus,
  isValidPhotoUrl
}) => {
  if (!isOpen) return null
  return (
    <div 
      className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-20"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl p-4 w-full max-w-full mx-3 shadow-2xl"
        style={{ maxHeight: '100%', overflowY: 'auto', overflowX: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Choisir une couturière</h3>
          <p className="text-sm text-gray-600">
            {localAssignment 
              ? `Article assigné à ${localAssignment.tricoteuse_name}`
              : 'Sélectionnez la tricoteuse responsable de cet article'}
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

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {localAssignment && (
            <button onClick={onRemove} className="group p-3 rounded-xl border-2 border-red-200 hover:border-red-400 hover:bg-red-50 transition-all duration-200">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-base shadow-md">✕</div>
                <p className="font-semibold text-red-700 text-center text-xs">Retirer</p>
              </div>
            </button>
          )}

          {isLoadingTricoteuses && (
            <div className="col-span-2 sm:col-span-3 p-6 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-rose-400 border-t-transparent mx-auto mb-3"></div>
              <p className="text-gray-600 text-sm">Chargement des tricoteuses...</p>
            </div>
          )}

          {!isLoadingTricoteuses && tricoteuses.length > 0 && tricoteuses
            .filter(t => !localAssignment || t._id !== localAssignment.tricoteuse_id)
            .map((t) => (
              <button key={t._id} onClick={() => onPick(t)} className={`group p-2 rounded-xl transition-all duration-200 ${isAssigning ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'hover:bg-rose-50'}`} disabled={isAssigning}>
                <div className="flex flex-col items-center space-y-2">
                  {isValidPhotoUrl(t.photoUrl) ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm">
                      <ImageLoader src={t.photoUrl} alt={`Photo de ${t.firstName}`} className="w-full h-full object-cover" fallback="👤" maxRetries={1} retryDelay={300} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm" style={{ backgroundColor: t.color || '#6b7280' }}>
                      <span>{t.firstName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <p className="font-semibold text-gray-900 text-center text-[11px] leading-none">{isAssigning ? 'Assignation...' : t.firstName}</p>
                  {isAssigning && (<div className="animate-spin rounded-full h-3 w-3 border-2 border-rose-400 border-t-transparent"></div>)}
                </div>
              </button>
            ))}

          {!isLoadingTricoteuses && tricoteuses.length === 0 && (
            <div className="col-span-2 sm:col-span-3 p-6 text-center text-gray-500">
              <p className="text-sm">Aucune tricoteuse disponible</p>
            </div>
          )}

          {localAssignment && !isLoadingTricoteuses && (
            <div className="col-span-3 border-t border-gray-200 pt-3 mt-3">
              <h4 className="text-xs font-semibold text-gray-700 text-center mb-2">Changer le statut</h4>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => onChangeStatus('en_cours')} className={`p-2 rounded-lg border-2 transition-all duration-300 cursor-pointer hover:shadow-lg hover:bg-yellow-200 ${localAssignment.status === 'en_cours' ? 'text-black shadow-lg' : 'text-black hover:shadow-md'}`} style={{ backgroundColor: localAssignment.status === 'en_cours' ? 'var(--couture-en-cours)' : 'var(--couture-en-cours-hover)', borderColor: localAssignment.status === 'en_cours' ? 'var(--couture-en-cours-selected-border)' : 'var(--couture-en-cours-border)' }}>
                  <div className="text-center"><p className="text-xs font-medium">En cours</p></div>
                </button>
                <button onClick={() => onChangeStatus('en_pause')} className={`p-2 rounded-lg border-2 transition-all duration-300 cursor-pointer hover:shadow-lg hover:bg-orange-200 ${localAssignment.status === 'en_pause' ? 'text-white shadow-lg' : 'text-white hover:shadow-md'}`} style={{ backgroundColor: localAssignment.status === 'en_pause' ? 'var(--couture-en-pause)' : 'var(--couture-en-pause-hover)', borderColor: localAssignment.status === 'en_pause' ? 'var(--couture-en-pause-selected-border)' : 'var(--couture-en-pause-border)' }}>
                  <div className="text-center"><p className="text-xs font-medium">En pause</p></div>
                </button>
                <button onClick={() => onChangeStatus('termine')} className={`p-2 rounded-lg border-2 transition-all duration-300 cursor-pointer hover:shadow-lg hover:bg-green-200 ${localAssignment.status === 'termine' ? 'text-white shadow-lg' : 'text-white hover:shadow-md'}`} style={{ backgroundColor: localAssignment.status === 'termine' ? 'var(--couture-termine)' : 'var(--couture-termine-hover)', borderColor: localAssignment.status === 'termine' ? 'var(--couture-termine-selected-border)' : 'var(--couture-termine-border)' }}>
                  <div className="text-center"><p className="text-xs font-medium">Terminé</p></div>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-4">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg border border-gray-300 hover:bg-blue-100 hover:shadow-lg transition-all duration-300 text-sm cursor-pointer">Fermer</button>
        </div>
      </div>
    </div>
  )
}

export default AssignModal


