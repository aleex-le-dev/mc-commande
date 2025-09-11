import React, { useState, useCallback } from 'react'
import { IoRefreshOutline } from 'react-icons/io5'
import { useQueryClient } from '@tanstack/react-query'
import { ApiService } from '../services/apiService'

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
      const syncPromise = ApiService.sync.syncOrders({})
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout synchronisation (2 minutes)')), 120000)
      })
      
      const result = await Promise.race([syncPromise, timeoutPromise])
      console.log('✅ Synchronisation terminée:', result)
      
      // Invalidation complète de tous les caches
      console.log('🔄 [SyncButton] Invalidation complète des caches...')
      queryClient.invalidateQueries()
      queryClient.removeQueries()
      try { if (typeof window !== 'undefined' && window) window.mcBypassOrdersCache = true } catch {}
      
      // Attendre un peu pour que l'invalidation soit effective
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Forcer un nouveau fetch de toutes les données
      console.log('🔄 [SyncButton] Nouveau fetch des données...')
      await Promise.all([
        queryClient.refetchQueries({ type: 'active' })
      ])
      console.log('🔄 [SyncButton] Nouveau fetch terminé')
      
      // Attendre un peu plus pour que les données soient vraiment disponibles
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Déclencher un événement global pour forcer le re-render des composants
      console.log('🔄 [SyncButton] Émission de l\'événement mc-sync-completed')
      window.dispatchEvent(new Event('mc-sync-completed'))
      console.log('🔄 [SyncButton] Événement mc-sync-completed émis')
      
      // Forcer un rechargement complet de la page après un délai
      console.log('🔄 [SyncButton] Rechargement de la page dans 2 secondes...')
      setTimeout(() => {
        console.log('🔄 [SyncButton] Rechargement de la page')
        window.location.reload()
      }, 2000)
      
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
              console.log(`🔄 ${recentOrders.length} commandes récentes synchronisées`)
            }
          }
        }
      } catch (error) {
        console.warn('Erreur récupération commandes pour préchargement:', error)
      }
      
      // OPTIMISATION: Toast succès avec cleanup
      const synchronizedCount = result?.synchronized || 0
      const message = synchronizedCount === 0 
        ? 'Synchronisation terminée ✅ - Pas de nouvelles commandes'
        : `Synchronisation terminée ✅ - ${synchronizedCount} nouvelle${synchronizedCount > 1 ? 's' : ''} commande${synchronizedCount > 1 ? 's' : ''}`
      
      setToast({ visible: true, message, variant: 'success' })
      const successTimeoutId = setTimeout(() => setToast({ visible: false, message: '', variant: 'success' }), 5000)
      
      // Cleanup du timeout si le composant est démonté
      return () => clearTimeout(successTimeoutId)
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
      // OPTIMISATION: Toast erreur avec cleanup
      const errorTimeoutId = setTimeout(() => setToast({ visible: false, message: '', variant: 'error' }), 5000)
      
      // Cleanup du timeout si le composant est démonté
      return () => clearTimeout(errorTimeoutId)
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


