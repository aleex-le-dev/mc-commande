import React, { useEffect, useMemo, useState } from 'react'
import OrderHeader from './cartes/OrderHeader'
import ArticleCard from './cartes/ArticleCard'
import { useArticles } from '../hooks/useArticles'
import delaiService from '../services/delaiService'
import SmartImageLoader from './SmartImageLoader'

/*
  Page "Terminé":
  - Regroupe les articles par commande (orderNumber)
  - Indique si la commande est prête à expédier (tous les articles en statut "termine")
  - Affiche les commandes partiellement terminées avec la liste des articles restants
*/
const TerminePage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [focusedOrder, setFocusedOrder] = useState(null)
  const [openReadyOverlayId, setOpenReadyOverlayId] = useState(null)
  const [openPausedOverlayId, setOpenPausedOverlayId] = useState(null)
  const [openInProgressOverlayId, setOpenInProgressOverlayId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Utiliser le hook unifié pour les articles
  const { 
    groupedArticles,
    pagination,
    isLoading,
    error
  } = useArticles({
    page: currentPage,
    limit: 15,
    status: 'all',
    search: searchTerm,
    sortBy: 'order_date',
    sortOrder: 'desc',
    productionType: 'all'
  })
  
  const [urgentByArticleId, setUrgentByArticleId] = useState({})
  const [delaiConfig, setDelaiConfig] = useState(null)
  const [holidays, setHolidays] = useState({})
  const [dateLimiteStr, setDateLimiteStr] = useState(null)

  // Formatage simple pour gérer le singulier/pluriel en français
  const formatCount = (count, singular, plural) => `${count} ${count > 1 ? plural : singular}`

  // Priorité d'affichage des statuts (en_cours, en_pause, termine, a_faire)
  const getStatusPriority = (status) => {
    switch (status) {
      case 'en_cours':
        return 0
      case 'en_pause':
        return 1
      case 'termine':
        return 2
      case 'a_faire':
        return 3
      default:
        return 4
    }
  }

  // Charger les assignations pour récupérer les flags urgent (avec cache)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Utiliser le cache global si disponible
        const cached = window.mcAssignmentsCache
        if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
          setUrgentByArticleId(cached.urgentMap)
          return
        }
        
        const all = await assignmentsService.getAllAssignments()
        if (cancelled) return
        const map = {}
        for (const a of all) {
          if (!a) continue
          const id = a.article_id != null ? String(a.article_id) : ''
          if (!id) continue
          map[id] = !!a.urgent
        }
        setUrgentByArticleId(map)
        
        // Mettre en cache
        window.mcAssignmentsCache = {
          urgentMap: map,
          timestamp: Date.now()
        }
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  // Charger tricoteuses (pour avatars/couleurs)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setTricoteusesLoading(true)
        const data = await tricoteusesService.getAllTricoteuses()
        if (!cancelled) setTricoteuses(data || [])
      } catch {
        if (!cancelled) setTricoteuses([])
      } finally {
        if (!cancelled) setTricoteusesLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Charger config délais + jours fériés pour calcul retard (avec cache)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Utiliser le cache global si disponible
        const cached = window.mcDelaiCache
        if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
          setDelaiConfig(cached.delaiConfig)
          setHolidays(cached.holidays)
          if (cached.dateLimiteStr) {
            setDateLimiteStr(cached.dateLimiteStr)
          }
          return
        }
        
        const conf = await delaiService.getDelai()
        if (!cancelled && conf && conf.data) {
          setDelaiConfig(conf.data)
          let dateLimiteStr = null
          if (conf.data.dateLimite) {
            dateLimiteStr = String(conf.data.dateLimite).split('T')[0]
            setDateLimiteStr(dateLimiteStr)
          }
          
          try {
            const jf = await delaiService.getJoursFeries()
            if (!cancelled && jf && jf.success) {
              const holidays = jf.joursFeries || {}
              setHolidays(holidays)
              
              // Mettre en cache
              window.mcDelaiCache = {
                delaiConfig: conf.data,
                holidays,
                dateLimiteStr,
                timestamp: Date.now()
              }
            }
          } catch {}
        }
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  const isHoliday = useMemo(() => {
    const keys = new Set(Object.keys(holidays || {}))
    return (d) => keys.has(d.toISOString().slice(0,10))
  }, [holidays])

  // Si le backend n'a pas fourni de dateLimite, calculer en remontant dans le temps (même logique que la grille)
  useEffect(() => {
    if (!delaiConfig || dateLimiteStr) return
    try {
      const joursDelai = delaiConfig.joursDelai || delaiConfig.delaiJours || 21
      const working = delaiConfig.joursOuvrables || { lundi: true, mardi: true, mercredi: true, jeudi: true, vendredi: true, samedi: false, dimanche: false }
      const dayName = (date) => ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'][date.getDay()]
      const today = new Date()
      const d = new Date(today)
      let removed = 0
      while (removed < joursDelai) {
        d.setDate(d.getDate() - 1)
        const name = dayName(d)
        if (working[name] && !isHoliday(d)) {
          removed++
        }
      }
      setDateLimiteStr(d.toISOString().slice(0,10))
    } catch {}
  }, [delaiConfig, dateLimiteStr, isHoliday])

  const grouped = useMemo(() => {
    // Gérer les deux formats : nouveau (avec pagination) et ancien (tableau direct)
    const ordersArray = orders?.orders || orders
    
    if (!ordersArray || !Array.isArray(ordersArray)) {
      console.log('❌ Pas de commandes disponibles dans TerminePage:', orders)
      return []
    }
    
    console.log('📋 Commandes reçues dans TerminePage:', ordersArray.length)
    
    // Regrouper les articles par commande
    const ordersByNumber = {}
    ordersArray.forEach(order => {
      // Le backend retourne 'items', pas 'line_items'
      const orderItems = order.items || order.line_items || []
      
      if (Array.isArray(orderItems)) {
        orderItems.forEach(item => {
          const orderNumber = order.order_number
          if (!ordersByNumber[orderNumber]) {
            ordersByNumber[orderNumber] = {
              order: order,
              articles: []
            }
          }
          
          // Utiliser line_item_id au lieu de article_id pour la correspondance
          const articleId = item.line_item_id || item.id
          const assignment = getAssignmentByArticleId(articleId)
          const tricoteuse = assignment ? getTricoteuseById(assignment.tricoteuse_id) : null
          
          ordersByNumber[orderNumber].articles.push({
            ...item,
            article_id: articleId, // S'assurer que article_id est défini
            orderNumber: order.order_number,
            customer: order.customer,
            orderDate: order.order_date,
            status: item.production_status?.status || 'a_faire',
            assignedTo: tricoteuse?.name || null,
            urgent: assignment?.urgent || false,
            assignmentId: assignment?._id || null
          })
        })
      }
    })
    
    const enriched = Object.entries(ordersByNumber).map(([orderNumber, { order, articles }]) => {
      // Calculer les statuts pour cette commande
      const statusCounts = { a_faire: 0, en_cours: 0, en_pause: 0, termine: 0 }
      let totalArticles = 0
      let urgentCount = 0
      
      articles.forEach(article => {
        const status = article.status || 'a_faire'
        if (statusCounts[status] !== undefined) {
          statusCounts[status]++
        }
        totalArticles++
        if (article.urgent === true) {
          urgentCount++
        }
      })
      
      // Déterminer le statut global de la commande
      let globalStatus = 'a_faire'
      let isReadyToShip = false
      if (statusCounts.termine === totalArticles) {
        globalStatus = 'ready'
        isReadyToShip = true
      } else if (statusCounts.en_cours > 0) {
        globalStatus = 'in_progress'
      } else if (statusCounts.en_pause > 0) {
        globalStatus = 'paused'
      }
      
      const hasUrgent = urgentCount > 0
      let isLate = false
      if (dateLimiteStr && order.order_date) {
        const orderDate = new Date(order.order_date)
        const dl = new Date(dateLimiteStr)
        const oN = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate())
        const dN = new Date(dl.getFullYear(), dl.getMonth(), dl.getDate())
        isLate = oN <= dN && !isReadyToShip
      }
      
      // Articles restants (non terminés)
      const remaining = articles.filter(article => article.status !== 'termine')
      
      return {
        orderNumber,
        order,
        articles,
        remaining,
        statusCounts,
        totalArticles,
        urgentCount,
        globalStatus,
        isReadyToShip,
        hasUrgent,
        isLate
      }
    })

    // Filtrer par recherche (numéro, client)
    const term = (searchTerm || '').toLowerCase().trim()
    let filtered = term ? enriched.filter(o =>
      `${o.orderNumber}`.toLowerCase().includes(term) ||
      (o.customer || '').toLowerCase().includes(term)
    ) : enriched

    if (focusedOrder) {
      filtered = filtered.filter(o => `${o.orderNumber}` === `${focusedOrder}`)
    }

    // Ordonner: prêtes à expédier en premier, puis partiellement, par date croissante
    filtered.sort((a, b) => {
      if (a.isReadyToShip !== b.isReadyToShip) return a.isReadyToShip ? -1 : 1
      return new Date(a.orderDate) - new Date(b.orderDate)
    })

    return filtered
  }, [ordersByNumber, searchTerm, urgentByArticleId, dateLimiteStr])

  // Calculer les sections avec priorité d'affichage
  const ready = useMemo(() => {
    const readyOrders = grouped.filter(g => g.isReadyToShip)
    

    
    return readyOrders
  }, [grouped])

  // Aplatir les articles terminés des commandes prêtes
  const readyArticles = useMemo(() => {
    const list = []
    ready.forEach(order => {
      order.items.filter(it => it.status === 'termine').forEach(it => {
        list.push({ ...it })
      })
    })
    return list
  }, [ready])
  const inProgress = useMemo(() => grouped.filter(g => {
    // Afficher les commandes qui ont au moins un article en statut "en_cours", "en_pause" ou "termine" (mais pas entièrement terminées)
    if (g.isReadyToShip) return false
    return g.items.some(item => ['en_cours', 'en_pause', 'termine'].includes(item.status))
  }), [grouped])
  const inProgressArticles = useMemo(() => {
    const list = []
    inProgress.forEach(order => {
      order.items.filter(it => ['en_cours', 'en_pause', 'termine'].includes(it.status)).forEach(it => {
        list.push({ ...it })
      })
    })
    return list
  }, [inProgress])
  const partial = useMemo(() => grouped.filter(g => {
    // Articles en pause : commandes qui ont au moins un article avec statut "en_pause"
    return g.items.some(item => item.status === 'en_pause')
  }), [grouped])
  const pausedArticles = useMemo(() => {
    const list = []
    grouped.forEach(order => {
      order.items.filter(it => it.status === 'en_pause').forEach(it => {
        list.push({ ...it })
      })
    })
    return list
  }, [grouped])
  const urgentCount = useMemo(() => grouped.filter(g => g.hasUrgent).length, [grouped])
  const lateCount = useMemo(() => grouped.filter(g => g.isLate).length, [grouped])

  const filteredCount = grouped.length
  
  // Compter uniquement les articles terminés (pas les commandes)
  const totalFinishedArticles = useMemo(() => {
    return grouped.reduce((total, order) => {
      return total + order.finished
    }, 0)
  }, [grouped])

  // État de chargement progressif
  const [showPartial, setShowPartial] = useState(false)

  // Afficher progressivement les sections
  useEffect(() => {
    if (ready.length > 0) {
      const timer1 = setTimeout(() => setShowPartial(true), 100)
      return () => {
        clearTimeout(timer1)
      }
    }
  }, [ready.length])

  // Ecouter l'ouverture ciblée depuis une carte
  React.useEffect(() => {
    const handler = (ev) => {
      const n = ev?.detail?.orderNumber
      if (n) setFocusedOrder(`${n}`)
    }
    window.addEventListener('mc-open-termine-for-order', handler)
    return () => window.removeEventListener('mc-open-termine-for-order', handler)
  }, [])

  return (
    <>
      {/* Temporairement désactivé - erreurs 502 sur Render */}
      {/* <SmartImageLoader 
        pageName="termine" 
        priority={false} 
      /> */}
      <div className="w-full px-4">
      <div className="mb-6">
        <OrderHeader
          selectedType="termine"
          filteredArticlesCount={totalFinishedArticles}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
        {/* Résumés urgent / retard */}
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white">
            🚨 Urgentes: <strong>{urgentCount}</strong>
          </span>
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white">
            ⚠️ En retard: <strong>{lateCount}</strong>
          </span>
        </div>
      </div>

      {/* Etat de chargement / erreur */}
      {isLoading && (
        <LoadingSpinner />
      )}
      {error && (
        <div className="bg-white rounded-2xl shadow-sm border p-6 text-center text-red-600">Erreur de chargement</div>
      )}

      {!isLoading && !error && (
        <div className="space-y-8">
          {/* Commandes prêtes à expédier */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Prêtes à expédier</h2>
              <span className="text-sm text-gray-600">{formatCount(ready.length, 'commande', 'commandes')} — {formatCount(readyArticles.length, 'article', 'articles')}</span>
            </div>
            {readyArticles.length === 0 ? (
              <div className="bg-gray-50 border rounded-xl p-6 text-center text-gray-600">Aucune commande prête</div>
            ) : (
              <div className="flex flex-wrap gap-5">
                {ready.map(order => (
                  <div key={`ready-order-${order.orderId}`} className="bg-white rounded-2xl shadow-sm border-2 border-green-500 p-4 w-fit inline-block align-top">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium">Commande #{order.orderNumber}</div>
                      <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">{order.items.length} article(s)</span>
                        <button
                          className="text-xs px-3 py-1 rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                          onClick={async () => {
                            const ok = window.confirm(`Confirmer l'envoi et supprimer la commande #${order.orderNumber} ?`)
                            if (!ok) return
                            const res = await deleteOrderCompletely(order.orderId)
                            if (!res.success) {
                              alert('Erreur lors de la suppression: ' + (res.error || 'inconnue'))
                            }
                          }}
                        >
                          Confirmer l'envoi
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {order.items.map((article, index) => (
                        <div key={`ready-${order.orderId}-${article.line_item_id}`} className="w-[260px]">
                          <ArticleCard
                            article={{ ...article }}
                            index={index}
                            getArticleSize={() => 'medium'}
                            getArticleColor={() => null}
                            getArticleOptions={() => ({ showAssignButton: false, showStatusButton: false, showNoteButton: true, showClientButton: true })}
                            onOverlayOpen={() => setOpenReadyOverlayId(prev => prev === `${article.orderId}_${article.line_item_id}` ? null : `${article.orderId}_${article.line_item_id}`)}
                            isOverlayOpen={openReadyOverlayId === `${article.orderId}_${article.line_item_id}`}
                            isHighlighted={false}
                            searchTerm={''}
                            productionType={article.productionType}
                            tricoteusesProp={tricoteuses}
                            compact
                            disableStatusBorder
                            disableAssignmentModal
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Commandes en cours */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">En cours</h2>
              <span className="text-sm text-gray-600">{formatCount(inProgress.length, 'commande', 'commandes')} — {formatCount(inProgressArticles.length, 'article', 'articles')}</span>
            </div>
            {inProgressArticles.length === 0 ? (
              <div className="bg-gray-50 border rounded-xl p-6 text-center text-gray-600">Aucune commande en cours</div>
            ) : (
              <div className="flex flex-wrap gap-5">
                {inProgress.map(order => (
                  <div key={`inprogress-order-${order.orderId}`} className="bg-white rounded-2xl shadow-sm border p-4 w-fit inline-block align-top border-status-en-cours">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium">Commande #{order.orderNumber}</div>
                      <span className="text-xs text-gray-600">{(() => { const c = order.items.filter(it => ['en_cours', 'en_pause', 'termine'].includes(it.status)).length; return formatCount(c, 'article en cours', 'articles en cours') })()}</span>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {order.items
                        .slice()
                        .sort((a, b) => getStatusPriority(a.status) - getStatusPriority(b.status))
                        .map((article, index) => (
                        <div key={`inprogress-${order.orderId}-${article.line_item_id}`} className="w-[260px]">
                        <ArticleCard
                          article={{ ...article }}
                          index={index}
                          getArticleSize={() => 'medium'}
                          getArticleColor={() => null}
                          getArticleOptions={() => ({ showAssignButton: false, showStatusButton: false, showNoteButton: true, showClientButton: true })}
                          onOverlayOpen={() => setOpenInProgressOverlayId(prev => prev === `${article.orderId}_${article.line_item_id}` ? null : `${article.orderId}_${article.line_item_id}`)}
                          isOverlayOpen={openInProgressOverlayId === `${article.orderId}_${article.line_item_id}`}
                          isHighlighted={false}
                          searchTerm={''}
                          productionType={article.productionType}
                          tricoteusesProp={tricoteuses}
                          compact
                            disableStatusBorder={order.items.length === 1 ? true : !(['en_cours', 'en_pause', 'termine'].includes(article.status))}
                            disableAssignmentModal
                        />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Articles en pause */}
          {showPartial && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Articles en pause</h2>
                <span className="text-sm text-gray-600">{pausedArticles.length}</span>
              </div>
              {pausedArticles.length === 0 ? (
                <div className="bg-gray-50 border rounded-xl p-6 text-center text-gray-600">Aucun article en pause</div>
              ) : (
                <div className="flex flex-wrap gap-5">
                  {pausedArticles.map((article, index) => (
                    <div key={`paused-${article.orderId}-${article.line_item_id}`} className="bg-white rounded-2xl shadow-sm border p-4 w-fit inline-block align-top border-status-en-pause">
                      <div className="w-[260px]">
                    <ArticleCard
                      article={{ ...article, status: 'en_pause' }}
                      index={index}
                      getArticleSize={() => 'medium'}
                      getArticleColor={() => null}
                      getArticleOptions={() => ({ showAssignButton: false, showStatusButton: false, showNoteButton: true, showClientButton: true })}
                      onOverlayOpen={() => setOpenPausedOverlayId(prev => prev === `${article.orderId}_${article.line_item_id}` ? null : `${article.orderId}_${article.line_item_id}`)}
                      isOverlayOpen={openPausedOverlayId === `${article.orderId}_${article.line_item_id}`}
                      isHighlighted={false}
                      searchTerm={''}
                      productionType={article.productionType}
                      tricoteusesProp={tricoteuses}
                      compact
                          disableStatusBorder
                          disableAssignmentModal
                    />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          
        </div>
      )}
      
      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={!pagination.hasPrev}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
          >
            ← Précédent
          </button>
          
          <span className="text-sm text-gray-600">
            Page {pagination.page} sur {pagination.totalPages} 
            ({pagination.total} commandes au total)
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
            disabled={!pagination.hasNext}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
    </>
  )
}

export default TerminePage
