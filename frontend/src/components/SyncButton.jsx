import React, { useState, useCallback, useEffect } from 'react'
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

  // Afficher le toast de synchronisation après rechargement de page
  useEffect(() => {
    let toastDisplayed = false
    
    const checkSyncToast = () => {
      try {
        const storedToast = localStorage.getItem('mc-sync-toast')
        
        if (storedToast && !toastDisplayed) {
          const toastData = JSON.parse(storedToast)
          
          // Vérifier que le toast n'est pas trop ancien (moins de 30 secondes)
          const age = Date.now() - toastData.timestamp
          
          if (age < 30000) {
            // Attendre que les données soient chargées (orders > 0)
            const checkDataLoaded = () => {
              // Vérifier si les données sont chargées en regardant le DOM ou en écoutant un événement
              const hasData = document.querySelector('[data-testid="articles-loaded"]') || 
                             document.querySelector('.article-card') ||
                             window.mcDataLoaded
              
              if (hasData || Date.now() - toastData.timestamp > 10000) { // Max 10 secondes d'attente
                setToast({ visible: true, message: toastData.message, variant: toastData.variant })
                toastDisplayed = true
                // Auto-hide après 5 secondes
                setTimeout(() => {
                  setToast({ visible: false, message: '', variant: 'success' })
                  // Supprimer du localStorage seulement après masquage
                  localStorage.removeItem('mc-sync-toast')
                }, 5000)
              } else {
                setTimeout(checkDataLoaded, 500)
              }
            }
            
            checkDataLoaded()
          } else {
            // Supprimer les anciens toasts
            localStorage.removeItem('mc-sync-toast')
          }
        }
      } catch (error) {
        console.warn('Erreur lecture toast synchronisation:', error)
        localStorage.removeItem('mc-sync-toast')
      }
    }

    // Vérifier immédiatement au montage
    checkSyncToast()
  }, [])

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
      
      // Stocker le message du toast dans le localStorage pour l'afficher après rechargement
      const synchronizedCount = result?.synchronized || 0
      let message = 'Synchronisation terminée ✅'
      
      if (synchronizedCount === 0) {
        message += ' - Pas de nouvelles commandes'
      } else {
        message += ` - ${synchronizedCount} nouvelle${synchronizedCount > 1 ? 's' : ''} commande${synchronizedCount > 1 ? 's' : ''}`
        
        // Compter les types de production des nouvelles commandes
        try {
          const newOrders = result?.newOrders || []
          if (newOrders.length > 0) {
            // Récupérer les détails des nouvelles commandes pour compter les types
            const base = (import.meta.env.DEV ? 'http://localhost:3001' : 'https://maisoncleo-commande.onrender.com')
            const ordersResponse = await fetch(`${base}/api/orders?page=1&limit=1000`, { credentials: 'include' })
            if (ordersResponse.ok) {
              const ordersData = await ordersResponse.json()
              const recentOrders = ordersData.orders?.filter(order => newOrders.includes(order.order_id)) || []
              
              let mailleCount = 0
              let coutureCount = 0
              
              recentOrders.forEach(order => {
                const items = order.items || order.line_items || []
                items.forEach(item => {
                  const productionType = item.production_status?.production_type || 'couture'
                  if (productionType === 'maille') {
                    mailleCount++
                  } else {
                    coutureCount++
                  }
                })
              })
              
              if (mailleCount > 0 || coutureCount > 0) {
                message += ` (${mailleCount} maille, ${coutureCount} couture)`
              }
            }
          }
        } catch (error) {
          console.warn('Erreur comptage types de production:', error)
        }
      }
      
      // Stocker le message pour l'afficher après rechargement
      const toastData = {
        message,
        variant: 'success',
        timestamp: Date.now()
      }
      console.log('💾 [SyncButton] Stockage du toast:', toastData)
      localStorage.setItem('mc-sync-toast', JSON.stringify(toastData))
      
      // Forcer un rechargement complet de la page après un court délai
      console.log('🔄 [SyncButton] Rechargement de la page dans 0.5 seconde...')
      setTimeout(() => {
        console.log('🔄 [SyncButton] Rechargement de la page')
        window.location.reload()
      }, 500)
      
      // Précharger les images des nouvelles commandes
      try {
        const base = (import.meta.env.DEV ? 'http://localhost:3001' : 'https://maisoncleo-commande.onrender.com')
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
      <div className="relative">
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


