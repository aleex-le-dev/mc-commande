import React, { useMemo, useState } from 'react'
import { useArticles } from '../hooks/useArticles'
import { useAssignments } from '../hooks/useAssignments'
import { useTricoteuses } from '../hooks/useTricoteuses'
import { useQueryClient } from '@tanstack/react-query'
import ArticleCard from './cartes/ArticleCard'
import LoadingSpinner from './LoadingSpinner'

const TerminePage = () => {
  const queryClient = useQueryClient()
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })
  const [isDeleting, setIsDeleting] = useState(false)
  
  const { articles, groupedArticles, isLoading, error } = useArticles({
    page: 1,
    limit: 5000,
    status: 'all',
    search: '',
    sortBy: 'order_date',
    sortOrder: 'desc',
    productionType: 'all'
  })
  
  const { assignments, getAssignmentByArticleId } = useAssignments()
  const { tricoteuses, getTricoteuseById } = useTricoteuses()
  
  // Debug pour vérifier les assignations
  console.log('Assignments dans TerminePage:', assignments)
  console.log('Tricoteuses dans TerminePage:', tricoteuses)

  const readyArticles = useMemo(() => {
    return (articles || []).filter(a => a.status === 'termine')
  }, [articles])

  const readyOrders = useMemo(() => {
    if (!groupedArticles) return []
    return Object.entries(groupedArticles)
      .map(([orderNumber, group]) => ({ orderNumber, ...group }))
      .filter(({ articles }) => Array.isArray(articles) && articles.length > 0 && articles.every(a => a.status === 'termine'))
      .map(({ orderNumber, order, articles }) => ({ orderNumber, order, total: articles.length }))
  }, [groupedArticles])

  const inProgressOrders = useMemo(() => {
    if (!articles) return []
    
    // Grouper les articles par commande
    const ordersMap = new Map()
    
    articles.forEach(article => {
      if (article.status === 'en_cours' || article.status === 'en_pause' || article.status === 'termine' || article.status === 'en_attente' || article.status === 'a_faire') {
        const orderNumber = article.orderNumber || article.order_id
        if (!ordersMap.has(orderNumber)) {
          ordersMap.set(orderNumber, {
            orderNumber,
            order: { customer_name: article.customer },
            articles: []
          })
        }
        ordersMap.get(orderNumber).articles.push(article)
      }
    })
    
    // Filtrer pour garder les commandes qui ont au moins un article en_cours, en_pause ou termine
    return Array.from(ordersMap.values()).filter(({ articles }) => 
      articles.some(a => a.status === 'en_cours' || a.status === 'en_pause' || a.status === 'termine')
    )
  }, [articles])

  // Calculer le nombre total d'articles dans les commandes en cours
  const totalInProgressArticles = useMemo(() => {
    return inProgressOrders.reduce((total, { articles }) => total + articles.length, 0)
  }, [inProgressOrders])

  const pausedArticles = useMemo(() => {
    return (articles || []).filter(a => a.status === 'en_pause')
  }, [articles])

  // Fonction pour confirmer l'envoi et supprimer la commande
  const handleConfirmShipment = async (orderNumber, orderId) => {
    if (isDeleting) return
    
    const confirmed = window.confirm(
      `Confirmer l'envoi de la commande #${orderNumber} ?\n\nCette action archivera la commande dans les archives.`
    )
    
    if (!confirmed) return
    
    setIsDeleting(true)
    
    try {
      const base = (import.meta.env.DEV ? 'http://localhost:3001' : (import.meta.env.VITE_API_URL || 'https://maisoncleo-commande.onrender.com'))
      const response = await fetch(`${base}/api/orders/${orderId}/archive`, {
        method: 'POST'
      })
      
      if (response.ok) {
        // Mise à jour optimiste du cache
        queryClient.setQueryData(['unified-orders'], (oldData) => {
          if (!oldData) return oldData
          return oldData.filter(order => String(order.order_id) !== String(orderId))
        })
        
        // Invalider les caches pour forcer le rechargement
        queryClient.invalidateQueries(['unified-orders'])
        queryClient.invalidateQueries(['db-orders'])
        
        // Forcer le re-render en déclenchant un événement global
        window.dispatchEvent(new Event('mc-data-updated'))
        
        // Afficher le toast de succès
        setToast({ 
          visible: true, 
          message: `Commande #${orderNumber} archivée avec succès ✅`, 
          type: 'success' 
        })
        
        // Masquer le toast après 5 secondes
        setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 5000)
      } else {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la commande:', error)
      setToast({ 
        visible: true, 
        message: `Erreur lors de la suppression de la commande #${orderNumber} ❌`, 
        type: 'error' 
      })
      
      // Masquer le toast d'erreur après 5 secondes
      setTimeout(() => setToast({ visible: false, message: '', type: 'error' }), 5000)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <div className="max-w-6xl mx-auto"><div className="bg-white rounded-2xl shadow-sm border p-6 text-center text-red-600">Erreur de chargement</div></div>
  }

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-8">
      {/* Commandes prêtes à expédier */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold leading-tight text-gray-900 border-b-2 border-gray-300 pb-2">Commandes prêtes à expédier</h2>
          <p className="text-sm text-gray-600 leading-tight mt-1">{readyOrders.length} commande(s)</p>
        </div>
        <div className="p-1 flex flex-wrap gap-4">
          {readyOrders.map(({ orderNumber, order, total }) => {
            // Récupérer les articles de cette commande depuis groupedArticles
            const orderGroup = groupedArticles[orderNumber]
            const articles = orderGroup?.articles || []
            const orderId = articles[0]?.orderId || order?.order_id
            
            return (
              <div key={orderNumber} className="rounded-xl border-4 border-green-500 bg-green-50 p-3 shadow-sm w-fit min-w-[200px] max-w-[600px] flex-shrink-0">
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-bold text-gray-900 text-base">Commande #{orderNumber}</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">Prête à expédier</span>
                </div>
                <div className="mb-2">
                  <div className="font-semibold text-gray-800 text-sm mb-1">{order?.customer_name || 'Client inconnu'}</div>
                  <div className="text-sm font-medium text-gray-700">{articles.length} article(s)</div>
                </div>
                <div className="grid gap-2 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${articles.length}, 200px)` }}>
                  {articles
                    .sort((a, b) => {
                      // Priorité : termine en premier, puis les autres par statut
                      const statusOrder = { 'termine': 0, 'en_cours': 1, 'en_pause': 2, 'en_attente': 3, 'a_faire': 4 }
                      const orderA = statusOrder[a.status] ?? 5
                      const orderB = statusOrder[b.status] ?? 5
                      return orderA - orderB
                    })
                    .map(a => {
                    // Déterminer la couleur de bordure selon le statut réel
                    const getBorderColor = (status) => {
                      switch (status) {
                        case 'termine': return 'border-green-500'
                        case 'en_cours': return 'border-yellow-500'
                        case 'en_pause': return 'border-orange-500'
                        case 'en_attente': return 'border-gray-500'
                        case 'a_faire': return 'border-0'
                        default: return 'border-0'
                      }
                    }
                    
                    const getBgColor = (status) => {
                      switch (status) {
                        case 'termine': return 'bg-green-50'
                        case 'en_cours': return 'bg-yellow-50'
                        case 'en_pause': return 'bg-orange-50'
                        case 'en_attente': return 'bg-gray-50'
                        default: return 'bg-gray-50'
                      }
                    }
                    
                    return (
                      <div key={`${orderNumber}-${a.line_item_id}`} className={`rounded-3xl ${getBorderColor(a.status) === 'border-0' ? 'border-0' : 'border-4'} ${getBorderColor(a.status)} overflow-hidden`}>
                        <ArticleCard
                          article={a}
                          assignment={a.assignment}
                          tricoteusesProp={tricoteuses}
                          size="small"
                          color={`border-${a.status === 'termine' ? 'green' : a.status === 'en_cours' ? 'yellow' : a.status === 'en_pause' ? 'orange' : 'gray'}-500 ${getBgColor(a.status)}`}
                          options={{ showAssignButton: true, showStatusButton: false, showNoteButton: false, showClientButton: true }}
                          productionType="all"
                          prioritizeUrgent={false}
                          disableStatusBorder={true}
                          compact={true}
                          disableAssignmentModal={true}
                          clientOverlayCompact={true}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 pt-2 border-t border-green-200">
                  <button
                    type="button"
                    onClick={() => handleConfirmShipment(orderNumber, orderId)}
                    disabled={isDeleting}
                    className="text-[10px] inline-flex items-center justify-center px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white shadow-sm w-full"
                  >
                    {isDeleting ? 'Suppression...' : 'Confirmer l\'envoi'}
                  </button>
                </div>
              </div>
            )
          })}
          {readyOrders.length === 0 && (
            <div className="text-xs text-gray-500">Aucune commande prête à expédier.</div>
          )}
        </div>
      </section>

      {/* Commandes en cours */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold leading-tight text-gray-900 border-b-2 border-gray-300 pb-2">Commandes en cours</h2>
          <p className="text-sm text-gray-600 leading-tight mt-1">{inProgressOrders.length} commande(s) • {totalInProgressArticles} article(s)</p>
        </div>
        <div className="p-1 flex flex-wrap gap-4">
          {inProgressOrders.map(({ orderNumber, order, articles }) => {
            // Générer une couleur aléatoire pour chaque commande
            const colors = [
              'bg-blue-50 border-blue-300',
              'bg-green-50 border-green-300', 
              'bg-purple-50 border-purple-300',
              'bg-pink-50 border-pink-300',
              'bg-indigo-50 border-indigo-300',
              'bg-cyan-50 border-cyan-300',
              'bg-amber-50 border-amber-300',
              'bg-emerald-50 border-emerald-300',
              'bg-rose-50 border-rose-300',
              'bg-violet-50 border-violet-300'
            ]
            const randomColor = colors[orderNumber % colors.length]
            
            return (
              <div key={orderNumber} className={`rounded-xl border-4 ${randomColor} p-3 shadow-sm w-fit min-w-[200px] max-w-[600px] flex-shrink-0`}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-bold text-gray-900 text-base">Commande #{orderNumber}</div>
                </div>
                <div className="mb-2">
                  <div className="font-semibold text-gray-800 text-sm mb-1">{order?.customer_name || 'Client inconnu'}</div>
                  <div className="text-sm font-medium text-gray-700">{articles.length} article(s)</div>
                </div>
                <div className="grid gap-2 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${articles.length}, 200px)` }}>
                  {articles
                    .sort((a, b) => {
                      // Priorité : en_cours en premier, puis les autres par statut
                      const statusOrder = { 'en_cours': 0, 'en_pause': 1, 'termine': 2, 'en_attente': 3, 'a_faire': 4 }
                      const orderA = statusOrder[a.status] ?? 5
                      const orderB = statusOrder[b.status] ?? 5
                      return orderA - orderB
                    })
                    .map(a => {
                    // Déterminer la couleur de bordure selon le statut réel
                    const getBorderColor = (status) => {
                      switch (status) {
                        case 'termine': return 'border-green-500'
                        case 'en_cours': return 'border-yellow-500'
                        case 'en_pause': return 'border-orange-500'
                        case 'en_attente': return 'border-gray-500'
                        case 'a_faire': return 'border-0'
                        default: return 'border-0'
                      }
                    }
                    
                    const getBgColor = (status) => {
                      switch (status) {
                        case 'termine': return 'bg-green-50'
                        case 'en_cours': return 'bg-yellow-50'
                        case 'en_pause': return 'bg-orange-50'
                        case 'en_attente': return 'bg-gray-50'
                        default: return 'bg-gray-50'
                      }
                    }
                    
                    return (
                      <div key={`${orderNumber}-${a.line_item_id}`} className={`rounded-3xl ${getBorderColor(a.status) === 'border-0' ? 'border-0' : 'border-4'} ${getBorderColor(a.status)} overflow-hidden`}>
                        <ArticleCard
                          article={a}
                          assignment={a.assignment}
                          tricoteusesProp={tricoteuses}
                          size="small"
                          color={`border-${a.status === 'termine' ? 'green' : a.status === 'en_cours' ? 'yellow' : a.status === 'en_pause' ? 'orange' : 'gray'}-500 ${getBgColor(a.status)}`}
                          options={{ showAssignButton: true, showStatusButton: false, showNoteButton: false, showClientButton: true }}
                          productionType="all"
                          prioritizeUrgent={false}
                          disableStatusBorder={true}
                          compact={true}
                          disableAssignmentModal={true}
                          clientOverlayCompact={true}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {inProgressOrders.length === 0 && (
            <div className="text-xs text-gray-500">Aucune commande en cours.</div>
          )}
        </div>
      </section>

      {/* Articles en pause */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold leading-tight text-gray-900 border-b-2 border-gray-300 pb-2">Articles en pause</h2>
            <p className="text-sm text-gray-600 leading-tight mt-1">{pausedArticles.length} article(s)</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">En pause</span>
        </div>
        <div className="p-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-1">
          {pausedArticles.map(a => (
            <div key={a.article_id} className="rounded-3xl border-4 border-orange-500 overflow-hidden">
              <ArticleCard
                article={a}
                assignment={a.assignment}
                tricoteusesProp={tricoteuses}
                size="small"
                color="border-yellow-500 bg-yellow-50"
                options={{ showAssignButton: true, showStatusButton: false, showNoteButton: false, showClientButton: true }}
                productionType="all"
                prioritizeUrgent={false}
                disableStatusBorder={true}
                compact={true}
                disableAssignmentModal={true}
                clientOverlayCompact={true}
              />
            </div>
          ))}
          {pausedArticles.length === 0 && (
            <div className="text-xs text-gray-500">Aucun article en pause.</div>
          )}
        </div>
      </section>

      {/* Toast de confirmation */}
      {toast.visible && (
        <div
          className={`fixed z-50 px-6 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' 
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          }`}
          style={{ 
            top: '20px', 
            left: '50%', 
            transform: 'translateX(-50%)',
            minWidth: '300px',
            textAlign: 'center'
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default TerminePage
