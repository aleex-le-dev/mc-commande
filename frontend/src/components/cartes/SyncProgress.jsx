import React, { useEffect, useState } from 'react'

// Composant toast pour afficher la progression de synchronisation
const SyncProgress = ({ syncProgress, syncLogs }) => {
  const [lastLog, setLastLog] = useState(null)

  useEffect(() => {
    let intervalId
    const fetchLog = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/sync/logs', { method: 'GET' })
        if (!res.ok) return
        const data = await res.json()
        if (data && data.success && data.log) {
          // Construire une ligne courte type [TYPE] message
          const type = data.log.type ? data.log.type.toUpperCase() : 'INFO'
          setLastLog(`[${type}] ${data.log.message}`)
        }
      } catch (_) {
        // silencieux
      }
    }

    if (syncProgress && syncProgress.isRunning) {
      fetchLog()
      intervalId = setInterval(fetchLog, 800)
    } else {
      setLastLog(null)
    }
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [syncProgress && syncProgress.isRunning])
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
    <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 p-3 ${status.bgColor} ${status.textColor} border border-[var(--rose-clair-border)] rounded-lg shadow-lg w-[90vw] max-w-xl transition-all duration-300`}>
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
          {syncProgress.progress < 100 && lastLog && (
            <p className="text-xs mt-1 opacity-90 whitespace-nowrap overflow-hidden text-ellipsis">
              {lastLog}
            </p>
          )}
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