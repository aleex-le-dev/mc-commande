import React, { useState, useCallback } from 'react'
import { IoRefreshOutline } from 'react-icons/io5'
import { useQueryClient } from '@tanstack/react-query'
import { syncOrders, getSyncLogs } from '../services/mongodbService'
import { ImageOptimizationService } from '../services/imageOptimizationService'

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
    
    try {
      setIsSyncing(true)
      console.log('🔄 Début de la synchronisation...')
      
      // Timeout spécifique pour la synchronisation
      const syncPromise = syncOrders({})
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout synchronisation (2 minutes)')), 120000)
      })
      
      const result = await Promise.race([syncPromise, timeoutPromise])
      console.log('✅ Synchronisation terminée:', result)
      
      // Invalidation ciblée pour recharger depuis la BDD
      queryClient.invalidateQueries(['db-orders'])
      queryClient.invalidateQueries(['production-statuses'])
      queryClient.invalidateQueries(['unified-orders'])
      try { if (typeof window !== 'undefined' && window) window.mcBypassOrdersCache = true } catch {}
      
      // Attendre le refetch pour avoir les nouvelles données
      await queryClient.refetchQueries({ queryKey: ['unified-orders'], type: 'active' })
      
      // Précharger les images des nouvelles commandes
      try {
        const base = (import.meta.env.DEV ? 'http://localhost:3001' : (import.meta.env.VITE_API_URL || 'https://maisoncleo-commande.onrender.com'))
        const res = await fetch(`${base}/api/orders`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          const orders = Array.isArray(data?.orders) ? data.orders : []
          
          if (orders.length > 0) {
            // Filtrer les commandes récentes (dernières 24h) pour le préchargement
            const recentOrders = orders.filter(order => {
              const orderDate = new Date(order.order_date)
              const now = new Date()
              const diffHours = (now - orderDate) / (1000 * 60 * 60)
              return diffHours <= 24 // Commandes des dernières 24h
            })
            
            if (recentOrders.length > 0) {
              console.log(`🔄 Préchargement images pour ${recentOrders.length} commandes récentes`)
              // Précharger en arrière-plan sans bloquer l'UI
              ImageOptimizationService.preloadNewOrders(recentOrders)
                .catch(error => console.warn('Erreur préchargement post-sync:', error))
            }
          }
        }
      } catch (error) {
        console.warn('Erreur récupération commandes pour préchargement:', error)
      }
      
      // Toast succès
      setToast({ visible: true, message: 'Synchronisation terminée ✅', variant: 'success' })
      setTimeout(() => setToast({ visible: false, message: '', variant: 'success' }), 5000)
    } catch (e) {
      console.error('❌ [SYNC] Échec de la synchronisation:', e)
      
      // Message d'erreur plus informatif
      let errorMessage = 'Erreur de synchronisation ❌'
      if (e.message.includes('Timeout')) {
        errorMessage = 'Synchronisation trop longue (2min) ⏰'
      } else if (e.message.includes('Requête annulée')) {
        errorMessage = 'Connexion interrompue 🔌'
      } else if (e.message.includes('502')) {
        errorMessage = 'Service temporairement indisponible 🔧'
      }
      
      setToast({ visible: true, message: errorMessage, variant: 'error' })
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


