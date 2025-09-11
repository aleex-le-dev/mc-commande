import React, { useMemo } from 'react'
import { useArticles } from '../hooks/useArticles'
import ArticleCard from './cartes/ArticleCard'

const TerminePage = () => {
  const { articles, groupedArticles, isLoading, error } = useArticles({
    page: 1,
    limit: 5000,
    status: 'all',
    search: '',
    sortBy: 'order_date',
    sortOrder: 'desc',
    productionType: 'all'
  })

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
    if (!groupedArticles) return []
    return Object.entries(groupedArticles)
      .map(([orderNumber, group]) => ({ orderNumber, ...group }))
      .filter(({ articles }) => Array.isArray(articles) && articles.some(a => a.status === 'en_cours'))
  }, [groupedArticles])

  const pausedArticles = useMemo(() => {
    return (articles || []).filter(a => a.status === 'en_pause')
  }, [articles])

  if (isLoading) {
    return <div className="max-w-6xl mx-auto"><div className="bg-white rounded-2xl shadow-sm border p-6 text-center">Chargement...</div></div>
  }

  if (error) {
    return <div className="max-w-6xl mx-auto"><div className="bg-white rounded-2xl shadow-sm border p-6 text-center text-red-600">Erreur de chargement</div></div>
  }

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-8">
      {/* Commandes prêtes à expédier */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold leading-tight text-gray-800">Commandes prêtes à expédier</h2>
            <p className="text-[11px] text-gray-500 leading-tight">{readyOrders.length} commande(s)</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">Terminé</span>
        </div>
        <div className="p-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-1">
          {readyOrders.map(({ orderNumber, order, total }) => (
            <div key={orderNumber} className="rounded-xl border border-green-200 bg-green-50 p-1.5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-gray-900 text-xs truncate">Commande #{orderNumber}</div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">Prête</span>
              </div>
              <div className="text-[11px] text-gray-700 mb-1 truncate">{order?.customer_name || 'Client inconnu'}</div>
              <div className="text-[10px] text-gray-700 mb-2">{total} article(s)</div>
              <button
                type="button"
                onClick={() => { try { window.dispatchEvent(new CustomEvent('mc-ship-order', { detail: { orderNumber } })) } catch {} }}
                className="text-[10px] inline-flex items-center justify-center px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                Préparer l'expédition
              </button>
            </div>
          ))}
          {readyOrders.length === 0 && (
            <div className="text-xs text-gray-500">Aucune commande prête à expédier.</div>
          )}
        </div>
      </section>

      {/* Commandes en cours */}
      <section>
        <div className="mb-2">
          <h2 className="text-sm font-semibold leading-tight text-gray-800">Commandes en cours</h2>
          <p className="text-[11px] text-gray-500 leading-tight">{inProgressOrders.length} commande(s)</p>
        </div>
        <div className="p-1 flex flex-wrap gap-4">
          {inProgressOrders.map(({ orderNumber, order, articles }) => {
            return (
              <div key={orderNumber} className="rounded-xl border-2 border-blue-200 bg-blue-50 p-3 shadow-sm w-fit min-w-[200px] max-w-[600px] flex-shrink-0">
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-medium text-gray-900 text-sm">Commande #{orderNumber}</div>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">En cours</span>
                </div>
                <div className="text-xs text-gray-600 mb-3">{order?.customer_name || 'Client inconnu'}</div>
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
                        case 'termine': return 'border-green-400'
                        case 'en_cours': return 'border-yellow-400'
                        case 'en_pause': return 'border-orange-400'
                        case 'en_attente': return 'border-gray-400'
                        default: return 'border-gray-400'
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
                      <div key={`${orderNumber}-${a.line_item_id}`} className={`rounded-2xl border-2 ${getBorderColor(a.status)} overflow-hidden w-[200px] h-[280px]`}>
                        <ArticleCard
                          article={a}
                          size="small"
                          color={`border-${a.status === 'termine' ? 'green' : a.status === 'en_cours' ? 'yellow' : a.status === 'en_pause' ? 'orange' : 'gray'}-500 ${getBgColor(a.status)}`}
                          options={{ showAssignButton: false, showStatusButton: false, showNoteButton: false, showClientButton: true }}
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
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold leading-tight text-gray-800">Articles en pause</h2>
            <p className="text-[11px] text-gray-500 leading-tight">{pausedArticles.length} article(s)</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">En pause</span>
        </div>
        <div className="p-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-1">
          {pausedArticles.map(a => (
            <div key={a.article_id} className="rounded-3xl border-4 border-orange-400 overflow-hidden">
              <ArticleCard
                article={a}
                size="small"
                color="border-yellow-500 bg-yellow-50"
                options={{ showAssignButton: false, showStatusButton: false, showNoteButton: false, showClientButton: true }}
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
    </div>
  )
}

export default TerminePage
