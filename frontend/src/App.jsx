import React, { useState, useEffect } from 'react'
import { assignmentsService } from './components/../services/mongodbService'
import ContextMenu from './components/ContextMenu'
import ConfirmationToast from './components/ConfirmationToast'
import { IoSettingsOutline, IoLockClosedOutline, IoMenuOutline, IoCloseOutline } from 'react-icons/io5'
import { RiStickyNoteAddLine, RiStickyNoteFill } from 'react-icons/ri'
import authService from './components/../services/authService'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import TerminePage from './components/TerminePage'
import MaillePage from './components/MaillePage'
import CouturePage from './components/CouturePage'

import ParametresPanel from './components/ParametresPanel'
import CardStyles from './components/cartes/CardStyles'
import ThemeToggle from './components/ThemeToggle'
import './App.css'

// Configuration du client React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  const [activeTab, setActiveTab] = useState('couture') // Démarrer directement sur Couture
  const [ctxVisible, setCtxVisible] = useState(false)
  const [ctxPosition, setCtxPosition] = useState({ x: 0, y: 0 })
  const [ctxItems, setCtxItems] = useState([])
  const [urgentMap, setUrgentMap] = useState({})
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false) // Menu hamburger mobile
  
  // État pour le toast de confirmation de suppression
  const [showDeleteToast, setShowDeleteToast] = useState(false)
  const [deleteOrderInfo, setDeleteOrderInfo] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault()
      // Ne pas ouvrir de menu contextuel global
      setCtxVisible(false)
    }
    const handleCardContext = (ev) => {
      const { x, y, uniqueAssignmentId, currentUrgent, hasNote, currentProductionType, orderNumber, orderId, articles, hasAssignment } = ev.detail || {}
      console.log('🔍 Menu contextuel - Données reçues:', { currentProductionType, uniqueAssignmentId, orderNumber })
      setCtxPosition({ x, y })
      const items = [
        { id: 'note', label: hasNote ? 'Modifier la note' : 'Ajouter une note', category: 'Couturière', icon: hasNote ? <RiStickyNoteFill size={16} /> : <RiStickyNoteAddLine size={16} />, onClick: () => window.dispatchEvent(new CustomEvent('mc-edit-note', { detail: { uniqueAssignmentId } })) },
        { id: 'urgent', label: currentUrgent ? '🚨 Retirer URGENT' : '🚨 Mettre en URGENT', category: 'Admin', onClick: () => window.dispatchEvent(new CustomEvent('mc-mark-urgent', { detail: { uniqueAssignmentId, urgent: !currentUrgent } })) },
      ]
      
      // Ajouter les options de déplacement selon le type de production actuel
      console.log('🔍 Type de production actuel:', currentProductionType)
      if (currentProductionType === 'couture') {
        console.log('✅ Ajout option: Déplacer vers maille')
        items.push({ id: 'move-to-maille', label: '🪡 Déplacer vers maille', category: 'Admin', onClick: () => window.dispatchEvent(new CustomEvent('mc-move-production', { detail: { uniqueAssignmentId, newType: 'maille' } })) })
      } else if (currentProductionType === 'maille') {
        console.log('✅ Ajout option: Déplacer vers couture')
        items.push({ id: 'move-to-couture', label: '🧵 Déplacer vers couture', category: 'Admin', onClick: () => window.dispatchEvent(new CustomEvent('mc-move-production', { detail: { uniqueAssignmentId, newType: 'couture' } })) })
      } else {
        console.log('⚠️ Type de production non reconnu:', currentProductionType)
      }
      
      // Changer le statut (si assignée)
      if (hasAssignment) {
        items.push({ id: 'change-status-en-cours', label: '🟡 Statut: En cours', category: 'Couturière', onClick: () => window.dispatchEvent(new CustomEvent('mc-change-status', { detail: { uniqueAssignmentId, newStatus: 'en_cours' } })) })
        items.push({ id: 'change-status-en-pause', label: '🟠 Statut: En pause', category: 'Couturière', onClick: () => window.dispatchEvent(new CustomEvent('mc-change-status', { detail: { uniqueAssignmentId, newStatus: 'en_pause' } })) })
        items.push({ id: 'change-status-termine', label: '✅ Statut: Terminé', category: 'Couturière', onClick: () => window.dispatchEvent(new CustomEvent('mc-change-status', { detail: { uniqueAssignmentId, newStatus: 'termine' } })) })
      }
      
      // Ajouter les options de suppression
      if (orderNumber && orderId && articles) {
        // Supprimer un article spécifique
        items.push({ 
          id: 'delete-article', 
          label: '🗑️ Supprimer cet article', category: 'Admin', 
          onClick: () => {
            // Trouver l'article actuel en utilisant uniqueAssignmentId
            const currentArticle = articles.find(a => {
              // uniqueAssignmentId peut être au format "orderId_lineItemId" ou juste le line_item_id
              const articleId = `${a.orderId}_${a.line_item_id}`
              return articleId === uniqueAssignmentId || a.line_item_id == uniqueAssignmentId
            })
            
            if (currentArticle && confirm(`Supprimer l'article "${currentArticle.product_name}" ?`)) {
              handleDeleteArticle(orderId, currentArticle.line_item_id)
            }
            setCtxVisible(false)
          }
        })
        
        // Supprimer la commande entière
        items.push({ 
          id: 'delete-order', 
          label: '🗑️ Supprimer la commande', category: 'Admin', 
          onClick: () => {
            setDeleteOrderInfo({ orderNumber, orderId, articles })
            setShowDeleteToast(true)
            setCtxVisible(false)
          }
        })
      }
      
      // Retirer les actions globales (recharger/rafraîchir/copier URL)
      setCtxItems(items)
      setCtxVisible(true)
    }
    const handleClose = () => setCtxVisible(false)
    const handleMarkUrgent = (ev) => {
      const { uniqueAssignmentId, urgent } = ev.detail || {}
      setUrgentMap((prev) => ({ ...prev, [uniqueAssignmentId]: urgent }))
      setCtxVisible(false)
    }
    const handleOpenTermine = () => setActiveTab('termine')
    window.addEventListener('contextmenu', handleContextMenu, true)
    window.addEventListener('mc-context', handleCardContext, true)
    window.addEventListener('mc-open-termine-for-order', handleOpenTermine, true)
    window.addEventListener('mc-mark-urgent', handleMarkUrgent, true)
    window.addEventListener('scroll', handleClose, true)
    window.addEventListener('resize', handleClose, true)
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, true)
      window.removeEventListener('mc-context', handleCardContext, true)
      window.removeEventListener('mc-open-termine-for-order', handleOpenTermine, true)
      window.removeEventListener('mc-mark-urgent', handleMarkUrgent, true)
      window.removeEventListener('scroll', handleClose, true)
      window.removeEventListener('resize', handleClose, true)
    }
  }, [])

  // Fonction pour gérer la suppression d'un article spécifique
  const handleDeleteArticle = async (orderId, lineItemId) => {
    try {
      console.log('[DELETE-ARTICLE] Demande de suppression', { orderId, lineItemId })
      const response = await fetch(`http://localhost:3001/api/orders/${orderId}/items/${lineItemId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        console.log('[DELETE-ARTICLE] API OK')
        // Mise à jour optimiste du cache
        try {
          const targetOrderId = String(orderId)
          const targetLineId = String(lineItemId)
          const before = queryClient.getQueryData(['unified-orders'])
          console.log('[DELETE-ARTICLE] Cache avant', { orders: Array.isArray(before) ? before.length : 'NA' })
          queryClient.setQueryData(['unified-orders'], (oldData) => {
            if (!oldData) return oldData
            const updated = oldData.map(order => {
              if (String(order.order_id) === targetOrderId) {
                const newItems = (order.items || []).filter(item => String(item.line_item_id) !== targetLineId)
                return { ...order, items: newItems }
              }
              return order
            }).filter(order => (order.items || []).length > 0)
            return updated
          })
          const after = queryClient.getQueryData(['unified-orders'])
          console.log('[DELETE-ARTICLE] Cache après', { orders: Array.isArray(after) ? after.length : 'NA' })
        } catch {}
        // Notifier l'UI
        console.log('[DELETE-ARTICLE] Dispatch mc-data-updated')
        window.dispatchEvent(new Event('mc-data-updated'))
      } else {
        console.error('Erreur lors de la suppression de l\'article:', response.statusText)
        alert('Erreur lors de la suppression de l\'article')
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'article:', error)
      alert('Erreur lors de la suppression de l\'article')
    }
  }

  // Fonction pour gérer la suppression de commande
  const handleDeleteOrder = async () => {
    if (!deleteOrderInfo) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`http://localhost:3001/api/orders/${deleteOrderInfo.orderId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Fermer le toast et rafraîchir les données
        setShowDeleteToast(false)
        setDeleteOrderInfo(null)
        try {
          console.log('[DELETE-ORDER] API OK', { orderId: deleteOrderInfo.orderId })
          const before = queryClient.getQueryData(['unified-orders'])
          console.log('[DELETE-ORDER] Cache avant', { orders: Array.isArray(before) ? before.length : 'NA' })
          const targetOrderId = String(deleteOrderInfo.orderId)
          queryClient.setQueryData(['unified-orders'], (oldData) => {
            if (!oldData) return oldData
            return oldData.filter(order => String(order.order_id) !== targetOrderId)
          })
          const after = queryClient.getQueryData(['unified-orders'])
          console.log('[DELETE-ORDER] Cache après', { orders: Array.isArray(after) ? after.length : 'NA' })
        } catch {}
        console.log('[DELETE-ORDER] Dispatch mc-data-updated')
        window.dispatchEvent(new Event('mc-data-updated'))
      } else {
        console.error('Erreur lors de la suppression:', response.statusText)
        alert('Erreur lors de la suppression de la commande')
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      alert('Erreur lors de la suppression de la commande')
    } finally {
      setIsDeleting(false)
    }
  }

  // Changer le titre de la page et le favicon selon l'onglet actif
  useEffect(() => {
    const getPageTitle = () => {
      switch (activeTab) {
        case 'couture':
          return 'Couture - Maisoncléo'
        case 'maille':
          return 'Maille - Maisoncléo'
        case 'termine':
          return 'Terminé - Maisoncléo'
        case 'parametres':
          return 'Paramètres - Maisoncléo'
        default:
          return 'Maisoncléo'
      }
    }
    
    const getFavicon = () => {
      switch (activeTab) {
        case 'couture':
          return '🧵'
        case 'maille':
          return '🪡'
        case 'termine':
          return '✅'
        case 'parametres':
          return '👑'
        default:
          return '🏠'
      }
    }
    
    document.title = getPageTitle()
    
    // Changer le favicon avec l'emoji
    const favicon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]')
    if (favicon) {
      favicon.href = `data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><text y=\"50%\" x=\"50%\" dominant-baseline=\"middle\" text-anchor=\"middle\" font-size=\"60\">${getFavicon()}</text></svg>`
    }
  }, [activeTab])

  const tabs = [
    { id: 'couture', label: 'Couture', icon: '🧵' },
    { id: 'maille', label: 'Maille', icon: '🪡' },
    { id: 'termine', label: 'Terminé', icon: '✅' },
    { id: 'parametres', label: 'Paramètres', icon: '⚙️' }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'couture':
        return <CouturePage />
      case 'maille':
        return <MaillePage />
      case 'termine':
        return <TerminePage />
      case 'parametres':
        return <ParametresPanel />
      default:
        return <CouturePage />
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <CardStyles />
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Navigation principale */}
        <nav className="shadow-lg border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo et titre */}
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <img 
                    src="/mclogosite.png" 
                    alt="Maisoncléo" 
                    className="h-5 w-auto"
                  />
                </div>
              </div>

              {/* Onglets alignés à droite */}
              <div className="hidden sm:flex flex-1 min-w-0 justify-end">
                <div className="flex space-x-1 flex-nowrap overflow-x-auto no-scrollbar max-w-full px-1 mr-2">
                  {tabs.filter(tab => tab.id !== 'parametres').map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer ${
                        activeTab === tab.id
                          ? 'bg-[var(--rose-clair)] text-[var(--rose-clair-text)] border border-[var(--rose-clair-border)]'
                          : 'hover:bg-[var(--bg-tertiary)]'
                      }`}
                      style={{ 
                        color: activeTab === tab.id ? 'var(--rose-clair-text)' : 'var(--text-secondary)',
                        backgroundColor: activeTab === tab.id ? 'var(--rose-clair)' : 'transparent'
                      }}
                    >
                      <span className="mr-1">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paramètres à droite */}
              <div className="hidden sm:flex items-center">
                <ThemeToggle />
                {tabs.filter(tab => tab.id === 'parametres').map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-[var(--rose-clair)] text-[var(--rose-clair-text)] border border-[var(--rose-clair-border)]'
                        : 'hover:bg-[var(--bg-tertiary)]'
                    }`}
                    style={{ 
                      color: activeTab === tab.id ? 'var(--rose-clair-text)' : 'var(--text-secondary)',
                      backgroundColor: activeTab === tab.id ? 'var(--rose-clair)' : 'transparent'
                    }}
                  >
                    <IoSettingsOutline className="w-5 h-5" aria-hidden="true" />
                  </button>
                ))}
                {/* Bouton déconnexion (verrouiller) */}
                <button
                  type="button"
                  onClick={async () => { try { await authService.logout() } catch {} try { sessionStorage.removeItem('mc-auth-ok-v2') } catch {} window.location.reload() }}
                  className="ml-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer hover:bg-[var(--bg-tertiary)]"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Verrouiller"
                  aria-label="Verrouiller"
                >
                  <IoLockClosedOutline className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
              {/* Contrôles mobiles à droite (hamburger) */}
              <div className="sm:hidden flex items-center">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((v) => !v)}
                  className="p-2 rounded-md hover:bg-[var(--bg-tertiary)]"
                  style={{ color: 'var(--text-secondary)' }}
                  aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                >
                  {mobileMenuOpen ? <IoCloseOutline className="w-6 h-6" /> : <IoMenuOutline className="w-6 h-6" />}
                </button>
              </div>
            </div>
            {/* Menu mobile déroulant: liens d'onglets et actions */}
            <div className={`${mobileMenuOpen ? 'block' : 'hidden'} sm:hidden`}>
              <div className="px-2 pb-3 space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={`m-${tab.id}`}
                    onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false) }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      activeTab === tab.id
                        ? 'bg-[var(--rose-clair)] text-[var(--rose-clair-text)] border border-[var(--rose-clair-border)]'
                        : 'hover:bg-[var(--bg-tertiary)]'
                    }`}
                    style={{ 
                      color: activeTab === tab.id ? 'var(--rose-clair-text)' : 'var(--text-secondary)',
                      backgroundColor: activeTab === tab.id ? 'var(--rose-clair)' : 'transparent'
                    }}
                  >
                    <span className="mr-1">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
                <div className="pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Thème</span>
                    <ThemeToggle />
                  </div>
                  <button
                    type="button"
                    onClick={async () => { try { await authService.logout() } catch {} try { sessionStorage.removeItem('mc-auth-ok-v2') } catch {} window.location.reload() }}
                    className="mt-2 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:bg-[var(--bg-tertiary)]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Verrouiller
                  </button>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Contenu principal */}
        <main className="w-full py-6 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
          {renderContent()}
        </main>
        <ContextMenu
          visible={ctxVisible}
          position={ctxPosition}
          items={ctxItems}
          onClose={() => setCtxVisible(false)}
        />
        
        {/* Toast de confirmation de suppression */}
        <ConfirmationToast
          isVisible={showDeleteToast}
          onClose={() => {
            setShowDeleteToast(false)
            setDeleteOrderInfo(null)
          }}
          onConfirm={handleDeleteOrder}
          orderNumber={deleteOrderInfo?.orderNumber}
          articles={deleteOrderInfo?.articles || []}
          isDeleting={isDeleting}
        />
      </div>
    </QueryClientProvider>
  )
}

export default App
