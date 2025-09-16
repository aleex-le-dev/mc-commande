import React from 'react'

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

        <div className="space-y-3">
          {localAssignment && (
            <div className="w-full flex items-center justify-center">
              <button
                onClick={onRemove}
                aria-label="Retirer l'assignation"
                title="Retirer l'assignation"
                className="w-10 h-10 rounded-full bg-red-500 text-white font-bold text-base shadow-md flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer transition-transform duration-150 ease-out hover:scale-105 active:scale-95"
              >
                ✕
              </button>
            </div>
          )}

          {isLoadingTricoteuses && (
            <div className="w-full p-6 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-rose-400 border-t-transparent mx-auto mb-3"></div>
              <p className="text-gray-600 text-sm">Chargement des tricoteuses...</p>
            </div>
          )}

          {!isLoadingTricoteuses && tricoteuses.length > 0 && (
            <div className="flex flex-wrap -mx-1">
              {tricoteuses
                .filter(t => !localAssignment || t._id !== localAssignment.tricoteuse_id)
                .map((t) => (
                  <button
                    key={t._id}
                    onClick={() => onPick(t)}
                    className={`px-1 w-1/2 md:w-1/3 mb-2 cursor-pointer transition-transform duration-150 ease-out ${isAssigning ? '' : 'hover:scale-105 active:scale-95'}`}
                    disabled={isAssigning}
                  >
                    <div className={`w-full p-2 rounded-xl transition-all duration-200 ${isAssigning ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'hover:bg-rose-50'}`}>
                      <div className="flex flex-col items-center justify-center">
                        {isValidPhotoUrl(t.photoUrl) ? (
                          <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm">
                            <img src={t.photoUrl} alt={`Photo de ${t.firstName}`} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm" style={{ backgroundColor: t.color || '#6b7280' }}>
                            <span>{t.firstName.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <span className="hidden min-[500px]:block text-[11px] font-semibold text-gray-900 mt-1 text-center">{t.firstName}</span>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}

          {!isLoadingTricoteuses && tricoteuses.length === 0 && (
            <div className="w-full p-6 text-center text-gray-500">
              <p className="text-sm">Aucune tricoteuse disponible</p>
            </div>
          )}

          {localAssignment && !isLoadingTricoteuses && (
            <div className="w-full border-t border-gray-200 pt-3 mt-3">
              <h4 className="text-xs font-semibold text-gray-700 text-center mb-2">Changer le statut</h4>
              <div
                className="flex items-center justify-center gap-3 mt-1"
                role="group"
                aria-label="Changer le statut"
              >
                <button
                  onClick={() => onChangeStatus('en_cours')}
                  className="h-10 w-10 rounded-full border-0 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-200 bg-yellow-400 transition-transform duration-150 ease-out hover:scale-105 active:scale-95"
                  aria-label="En cours"
                  title="En cours"
                >
                  <span className="sr-only">En cours</span>
                </button>
                <button
                  onClick={() => onChangeStatus('en_pause')}
                  className="h-10 w-10 rounded-full border-0 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-200 bg-orange-500 transition-transform duration-150 ease-out hover:scale-105 active:scale-95"
                  aria-label="En pause"
                  title="En pause"
                >
                  <span className="sr-only">En pause</span>
                </button>
                <button
                  onClick={() => onChangeStatus('termine')}
                  className="h-10 w-10 rounded-full border-0 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-200 bg-green-600 transition-transform duration-150 ease-out hover:scale-105 active:scale-95"
                  aria-label="Terminé"
                  title="Terminé"
                >
                  <span className="sr-only">Terminé</span>
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


