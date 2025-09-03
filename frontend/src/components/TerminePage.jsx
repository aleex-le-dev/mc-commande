import React, { useEffect, useMemo, useState } from 'react'
import OrderHeader from './cartes/OrderHeader'
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
  const [showNoneSection, setShowNoneSection] = useState(false)

  // Récupérer tous les articles (tous types) pour calculer correctement les statuts par commande
  const { ordersByNumber, isLoading, error, totalArticles } = useUnifiedArticles('all')
  const [urgentByArticleId, setUrgentByArticleId] = useState({})
  const [delaiConfig, setDelaiConfig] = useState(null)
  const [holidays, setHolidays] = useState({})
  const [dateLimiteStr, setDateLimiteStr] = useState(null)

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
  const partial = useMemo(() => grouped.filter(g => {
    // Articles en pause : commandes qui ont au moins un article avec statut "en_pause"
    return g.items.some(item => item.status === 'en_pause')
  }), [grouped])
  const none = useMemo(() => grouped.filter(g => g.finished === 0), [grouped])
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
  const [showNone, setShowNone] = useState(false)

  // Afficher progressivement les sections
  useEffect(() => {
    if (ready.length > 0) {
      // Afficher les commandes terminées immédiatement
      const timer1 = setTimeout(() => setShowPartial(true), 100)
      const timer2 = setTimeout(() => setShowNone(true), 300)
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
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
              <span className="text-sm text-gray-600">{ready.length}</span>
            </div>
            {ready.length === 0 ? (
              <div className="bg-gray-50 border rounded-xl p-6 text-center text-gray-600">Aucune commande prête</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {ready.map(order => (
                  <div key={order.orderNumber} className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-lg">#{order.orderNumber}</div>
                      <div className="flex items-center gap-1">
                        {order.hasUrgent && <span className="text-xs px-2 py-0.5 rounded-full border bg-red-50 text-red-700">🚨</span>}
                        {order.isLate && <span className="text-xs px-2 py-0.5 rounded-full border bg-yellow-50 text-yellow-800">⚠️</span>}
                        <span className="text-green-700 text-sm font-semibold">✅</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{order.customer || 'Client inconnu'}</div>
                    <div className="text-sm mb-3">
                      <span className="font-medium">Articles terminés:</span> {order.finished}/{order.total}
                    </div>
                    <div className="text-xs text-gray-500">
                      Date commande: {new Date(order.orderDate).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-medium mb-1">Articles terminés:</div>
                      <div className="space-y-1">
                        {order.items.filter(item => item.status === 'termine').map(item => (
                          <div key={item.line_item_id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded px-2 py-1">
                            <div className="flex items-center gap-1">
                              <span className="text-xs px-1 py-0.5 rounded border bg-white">
                                {item.productionType === 'maille' ? '🧶' : '🧵'}
                              </span>
                              <span className="text-xs font-medium truncate">{item.name}</span>
                            </div>
                            <span className="text-xs text-green-700">✅</span>
                          </div>



))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Commandes partiellement terminées */}
          {showPartial && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Articles en pause</h2>
                <span className="text-sm text-gray-600">{partial.length}</span>
              </div>
              {partial.length === 0 ? (
                <div className="bg-gray-50 border rounded-xl p-6 text-center text-gray-600">Aucune commande partielle</div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {partial.map(order => (
                    <div key={order.orderNumber} className="bg-white border rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-bold">#{order.orderNumber}</div>
                        <div className="flex items-center gap-2">
                          {order.hasUrgent && <span className="text-xs px-2 py-0.5 rounded-full border bg-red-50 text-red-700">🚨 Urgente</span>}
                          {order.isLate && <span className="text-xs px-2 py-0.5 rounded-full border bg-yellow-50 text-yellow-800">⚠️ En retard</span>}
                          <span className="text-sm text-gray-700 font-medium">{order.finished}/{order.total} terminé(s)</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{order.customer || 'Client inconnu'}</div>
                      <div className="mt-3">
                        <div className="text-sm font-medium mb-2">Articles en pause:</div>
                        <ul className="space-y-2">
                          {order.items.filter(item => item.status === 'en_pause').map(item => (
                            <li key={item.line_item_id} className="flex items-center justify-between bg-gray-50 border rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 rounded-full border bg-white">
                                  {item.productionType === 'maille' ? '🧶 Maille' : '🧵 Couture'}
                                </span>
                                <span className="text-sm font-medium">{item.name}</span>
                                {item.urgent && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-red-50 text-red-700">🚨 Urgent</span>
                                )}
                                {item.isLate && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-yellow-50 text-yellow-800">⚠️ En retard</span>
                                )}
                              </div>
                              <span className="text-xs text-gray-600">Statut: {item.status}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Commandes sans aucun article terminé (repliable, fermé par défaut) */}
          {showNone && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setShowNoneSection(v => !v)}
                  className="px-3 py-1.5 rounded-md border text-sm font-medium cursor-pointer hover:bg-gray-50"
                  aria-expanded={showNoneSection}
                  aria-controls="none-orders-panel"
                >
                  {showNoneSection ? '▾' : '▸'} Articles non terminés
                </button>
                <span className="text-sm text-gray-600">{none.length}</span>
              </div>
              {showNoneSection && none.length > 0 && (
                <div id="none-orders-panel" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                  {none.map(order => (
                    <div key={order.orderNumber} className="bg-white border rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-bold">#{order.orderNumber}</div>
                        <div className="text-sm text-gray-700 font-medium">0/{order.total} terminé(s)</div>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{order.customer || 'Client inconnu'}</div>
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
