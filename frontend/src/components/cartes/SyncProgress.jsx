import React from 'react'

// Composant pour afficher la progression de synchronisation
const SyncProgress = ({ syncProgress, syncLogs }) => {
  if (!syncProgress.isRunning) return null

  return (
    <div className="fixed top-4 right-4 z-50 p-4 bg-[var(--rose-clair)] text-[var(--rose-clair-text)] border border-[var(--rose-clair-border)] rounded-lg shadow-lg max-w-md">
      <div className="mb-3">
        <p className="font-medium">
          <svg 
            className={`w-5 h-5 inline-block mr-2 ${syncProgress.isRunning ? 'animate-spin' : ''}`}
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Synchronisation
        </p>
      </div>
      
      {/* Log en temps réel */}
      <div className="bg-white rounded p-2">
        {syncLogs.length > 0 && syncLogs[0] ? (
          <div className="text-xs">
            <span className="text-[var(--rose-clair-text)] font-mono">
              {new Date(syncLogs[0].timestamp).toLocaleTimeString()}
            </span>
            <span className={`ml-2 ${
              syncLogs[0].type === 'success' ? 'text-green-600' :
              syncLogs[0].type === 'error' ? 'text-red-600' :
              syncLogs[0].type === 'warning' ? 'text-yellow-600' :
              'text-[var(--rose-clair-text)]'
            }`}>
              {syncLogs[0].message}
            </span>
          </div>
        ) : (
          <p className="text-xs text-[var(--rose-clair-text)] italic">En attente des logs...</p>
        )}
      </div>
    </div>
  )
}

export default SyncProgress