import React, { useState, useCallback } from 'react'
import { IoRefreshOutline } from 'react-icons/io5'
import { useQueryClient } from '@tanstack/react-query'
import { syncOrders, getSyncLogs } from '../services/mongodbService'

// Bouton de synchronisation réutilisable (desktop et mobile)
// Props:
// - variant: 'icon' | 'block' (affichage icône seule ou bouton pleine largeur avec texte)
// - className: classes additionnelles
// - onDone: callback après la synchro (ex: fermer le menu mobile)
const SyncButton = ({ variant = 'icon', className = '', onDone }) => {
  const queryClient = useQueryClient()
  const [isSyncing, setIsSyncing] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: '', variant: 'success' })

  const handleManualSync = useCallback(async () => {
    if (isSyncing) return
    const t0 = performance.now()
    // logs retirés
    try {
      setIsSyncing(true)
      const result = await syncOrders({})
      
      // Invalidation ciblée pour recharger depuis la BDD
      queryClient.invalidateQueries(['db-orders'])
      queryClient.invalidateQueries(['production-statuses'])
      queryClient.invalidateQueries(['unified-orders'])
      try { if (typeof window !== 'undefined' && window) window.mcBypassOrdersCache = true } catch {}
      await queryClient.refetchQueries({ queryKey: ['unified-orders'], type: 'active' })
      
      try {
        // Log de la dernière commande présente en BDD
        const base = (import.meta.env.DEV ? 'http://localhost:3001' : (import.meta.env.VITE_API_URL || 'https://maisoncleo-commande.onrender.com'))
        const res = await fetch(`${base}/api/orders`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          const orders = Array.isArray(data?.orders) ? data.orders : []
          if (orders.length > 0) {
            const lastByDate = [...orders].sort((a,b) => new Date(a.order_date) - new Date(b.order_date)).pop()
            
          } else {
            
          }
        }
      } catch {}
      // logs retirés
      // Toast succès sans durée
      setToast({ visible: true, message: 'Synchronisation terminée ✅', variant: 'success' })
      setTimeout(() => setToast({ visible: false, message: '', variant: 'success' }), 5000)
    } catch (e) {
      console.error('❌ [SYNC] Échec de la synchronisation:', e)
      setToast({ visible: true, message: 'Erreur de synchronisation ❌', variant: 'error' })
      setTimeout(() => setToast({ visible: false, message: '', variant: 'error' }), 5000)
    } finally {
      setIsSyncing(false)
      if (typeof onDone === 'function') onDone()
    }
  }, [isSyncing, onDone, queryClient])

  if (variant === 'block') {
    return (
      <button
        type="button"
        onClick={handleManualSync}
        className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:bg-[var(--bg-tertiary)] disabled:opacity-60 ${className}`}
        style={{ color: 'var(--text-secondary)' }}
        aria-label="Synchroniser"
        disabled={isSyncing}
      >
        {isSyncing ? 'Synchronisation…' : 'Synchroniser'}
      </button>
    )
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleManualSync}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer hover:bg-[var(--bg-tertiary)] disabled:opacity-60 ${className}`}
        style={{ color: 'var(--text-secondary)' }}
        title={isSyncing ? 'Synchronisation…' : 'Synchroniser'}
        aria-label="Synchroniser"
        disabled={isSyncing}
      >
        <IoRefreshOutline className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
      </button>
      {toast.visible && (
        <div
          className={`fixed z-50 px-4 py-2 rounded-lg shadow-lg ${toast.variant === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
          style={{ top: '64px', left: '50%', transform: 'translateX(-50%)' }}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default SyncButton


