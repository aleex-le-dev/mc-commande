import React, { useEffect, useMemo, useState } from 'react'
import OrderHeader from './cartes/OrderHeader'
import ArticleCard from './cartes/ArticleCard'
import { tricoteusesService } from '../services/mongodbService'
import { useUnifiedArticles } from './cartes/hooks/useUnifiedArticles'
import { assignmentsService } from '../services/mongodbService'
import delaiService from '../services/delaiService'

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

  // Récupérer tous les articles (tous types) pour calculer correctement les statuts par commande
  const { ordersByNumber, isLoading, error, totalArticles } = useUnifiedArticles('all')
  const [tricoteuses, setTricoteuses] = useState([])
  const [tricoteusesLoading, setTricoteusesLoading] = useState(true)
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
    // Utiliser directement ordersByNumber du hook unifié
    const enriched = ordersByNumber.map((order) => {
      // Construire des clés d'articles compatibles avec les deux formats d'assignation
      const itemsWithUrgent = order.items.map(item => {
        const composedId = `${order.orderId}_${item.line_item_id}`
        const simpleId = `${item.line_item_id}`
        return {
          ...item,
          urgent: urgentByArticleId[composedId] === true || urgentByArticleId[simpleId] === true,
        }
      })

      const hasUrgent = itemsWithUrgent.some(i => i.urgent)
      let isLate = false
      if (dateLimiteStr && order.orderDate) {
        const orderDate = new Date(order.orderDate)
        const dl = new Date(dateLimiteStr)
        const oN = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate())
        const dN = new Date(dl.getFullYear(), dl.getMonth(), dl.getDate())
        // En retard si date de commande <= date limite et commande pas entièrement terminée
        isLate = oN <= dN && !order.isReadyToShip
      }
      
      // Marquer le retard par article avec la même règle (basée sur la date de commande)
      const remaining = order.remaining.map(it => ({
        ...it,
        isLate: (() => {
          if (!dateLimiteStr || !order.orderDate) return false
          const orderDate = new Date(order.orderDate)
          const dl = new Date(dateLimiteStr)
          const oN = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate())
          const dN = new Date(dl.getFullYear(), dl.getMonth(), dl.getDate())
          return oN <= dN
        })()
      }))

      return { 
        ...order, 
        items: itemsWithUrgent,
        remaining,
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
    // Afficher uniquement les commandes qui ont au moins un article en statut "en_cours"
    if (g.isReadyToShip) return false
    return g.items.some(item => item.status === 'en_cours')
  }), [grouped])
  const inProgressArticles = useMemo(() => {
    const list = []
    inProgress.forEach(order => {
      order.items.filter(it => it.status === 'en_cours').forEach(it => {
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
        <div className="bg-white rounded-2xl shadow-sm border p-6 text-center">Chargement…</div>
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
                      <span className="text-xs text-gray-600">{order.items.length} article(s)</span>
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
                      <span className="text-xs text-gray-600">{(() => { const c = order.items.filter(it => it.status !== 'termine').length; return formatCount(c, 'article non terminé', 'articles non terminés') })()}</span>
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
                            disableStatusBorder={!(article.status === 'en_cours' || article.status === 'en_pause')}
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
    </div>
  )
}

export default TerminePage
