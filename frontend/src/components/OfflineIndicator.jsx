import React from 'react'
import useOfflineMode from '../hooks/useOfflineMode'

/**
 * Indicateur de mode hors ligne
 * Affiche le statut de connexion et les données en cache
 */
const OfflineIndicator = () => {
  const { isOffline, getSyncStatus, forceSync } = useOfflineMode()
  const syncStatus = getSyncStatus()

  if (!isOffline && syncStatus.pendingChanges === 0) {
    return null // Ne pas afficher si tout est synchronisé
  }

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      isOffline ? 'bg-red-500' : 'bg-yellow-500'
    } text-white px-4 py-2 rounded-lg shadow-lg`}>
      <div className="flex items-center space-x-2">
        <div className="flex-shrink-0">
          {isOffline ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0 0L5.636 5.636m12.728 12.728L5.636 18.364" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        
        <div className="flex-1">
          <p className="text-sm font-medium">
            {isOffline ? 'Mode hors ligne' : 'Synchronisation en cours...'}
          </p>
          {syncStatus.pendingChanges > 0 && (
            <p className="text-xs opacity-90">
              {syncStatus.pendingChanges} changement(s) en attente
            </p>
          )}
        </div>

        {!isOffline && syncStatus.pendingChanges > 0 && (
          <button
            onClick={forceSync}
            className="ml-2 text-white hover:text-gray-200 transition-colors"
            title="Forcer la synchronisation"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default OfflineIndicator
