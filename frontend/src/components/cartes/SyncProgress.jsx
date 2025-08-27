import React from 'react'

// Composant toast pour afficher la progression de synchronisation
const SyncProgress = ({ syncProgress, syncLogs }) => {
  if (!syncProgress.isRunning) return null

  // Déterminer le message et l'emoji selon le statut
  const getSyncStatus = () => {
    if (syncProgress.progress === 100) {
      // Synchronisation terminée
      if (syncProgress.message.includes('commande')) {
        return {
          emoji: '✅',
          message: syncProgress.message,
          bgColor: 'bg-green-500',
          textColor: 'text-white',
          emojiPosition: 'start'
        }
      } else if (syncProgress.message.includes('Tout est à jour')) {
        return {
          emoji: '✅',
          message: 'Tout est à jour',
          bgColor: 'bg-green-600',
          textColor: 'text-white',
          emojiPosition: 'end'
        }
      } else {
        return {
          emoji: '❌',
          message: syncProgress.message,
          bgColor: 'bg-red-500',
          textColor: 'text-white',
          emojiPosition: 'start'
        }
      }
    } else {
      // Synchronisation en cours
      return {
        emoji: '⚙️',
        message: 'Récupération des nouvelles commandes...',
        bgColor: 'bg-[var(--rose-clair)]',
        textColor: 'text-[var(--rose-clair-text)]',
        emojiPosition: 'start'
      }
    }
  }

  const status = getSyncStatus()

  return (
    <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 p-3 ${status.bgColor} ${status.textColor} border border-[var(--rose-clair-border)] rounded-lg shadow-lg max-w-sm transition-all duration-300`}>
      <div className="flex items-center gap-3">
        {status.emojiPosition === 'start' && (
          <div className={`text-xl ${syncProgress.progress < 100 ? 'animate-spin' : ''}`}>
            {status.emoji}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {status.message}
          </p>
        </div>
        {status.emojiPosition === 'end' && (
          <div className="text-xl">
            {status.emoji}
          </div>
        )}
      </div>
    </div>
  )
}

export default SyncProgress