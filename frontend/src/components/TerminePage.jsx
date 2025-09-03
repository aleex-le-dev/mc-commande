import React, { useEffect, useMemo, useState } from 'react'
import OrderHeader from './cartes/OrderHeader'
import { useAllArticles } from './cartes'
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
  const { articles, isLoading, error, totalArticles } = useAllArticles('all')
  const [urgentByArticleId, setUrgentByArticleId] = useState({})
  const [delaiConfig, setDelaiConfig] = useState(null)
  const [holidays, setHolidays] = useState({})
  const [dateLimiteStr, setDateLimiteStr] = useState(null)

  // Charger les assignations pour récupérer les flags urgent
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
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
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  // Charger config délais + jours fériés pour calcul retard
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const conf = await delaiService.getDelai()
        if (!cancelled && conf && conf.data) {
          setDelaiConfig(conf.data)
          if (conf.data.dateLimite) {
            const s = String(conf.data.dateLimite).split('T')[0]
            setDateLimiteStr(s)
          }
        }
      } catch {}
      try {
        const jf = await delaiService.getJoursFeries()
        if (!cancelled && jf && jf.success) {
          setHolidays(jf.joursFeries || {})
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
    const byOrder = {}
    for (const a of articles) {
      const key = a.orderNumber
      if (!byOrder[key]) {
        byOrder[key] = {
          orderNumber: key,
          orderId: a.orderId,
          customer: a.customer,
          orderDate: a.orderDate,
          items: [],
        }
      }
      // Construire des clés d'articles compatibles avec les deux formats d'assignation
      const composedId = `${a.orderId}_${a.line_item_id}`
      const simpleId = `${a.line_item_id}`
      byOrder[key].items.push({
        line_item_id: a.line_item_id,
        name: a.product_name,
        status: a.status,
        productionType: a.productionType,
        itemIndex: a.itemIndex,
        totalItems: a.totalItems,
        urgent: urgentByArticleId[composedId] === true || urgentByArticleId[simpleId] === true,
      })
    }

    // Calcul des agrégats par commande
    const enriched = Object.values(byOrder).map((order) => {
      const total = order.items.length
      const finished = order.items.filter(i => i.status === 'termine').length
      const remainingAll = order.items.filter(i => i.status !== 'termine')
      const isReadyToShip = total > 0 && finished === total
      const hasUrgent = order.items.some(i => i.urgent)
      let isLate = false
      if (dateLimiteStr && order.orderDate) {
        const orderDate = new Date(order.orderDate)
        const dl = new Date(dateLimiteStr)
        const oN = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate())
        const dN = new Date(dl.getFullYear(), dl.getMonth(), dl.getDate())
        // En retard si date de commande <= date limite et commande pas entièrement terminée
        isLate = oN <= dN && !isReadyToShip
      }
      // Marquer le retard par article avec la même règle (basée sur la date de commande)
      const remaining = remainingAll.map(it => ({
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
      return { ...order, total, finished, remaining, isReadyToShip, hasUrgent, isLate }
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
  }, [articles, searchTerm])

  const ready = useMemo(() => grouped.filter(g => g.isReadyToShip), [grouped])
  const partial = useMemo(() => grouped.filter(g => !g.isReadyToShip && g.finished > 0), [grouped])
  const none = useMemo(() => grouped.filter(g => g.finished === 0), [grouped])
  const urgentCount = useMemo(() => grouped.filter(g => g.hasUrgent).length, [grouped])
  const lateCount = useMemo(() => grouped.filter(g => g.isLate).length, [grouped])

  const filteredCount = grouped.length

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
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <OrderHeader
          selectedType="termine"
          filteredArticlesCount={filteredCount}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ready.map(order => (
                  <div key={order.orderNumber} className="bg-white border rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-bold">#{order.orderNumber}</div>
                      <div className="flex items-center gap-2">
                        {order.hasUrgent && <span className="text-xs px-2 py-0.5 rounded-full border bg-red-50 text-red-700">🚨 Urgente</span>}
                        {order.isLate && <span className="text-xs px-2 py-0.5 rounded-full border bg-yellow-50 text-yellow-800">⚠️ En retard</span>}
                        <span className="text-green-700 text-sm font-semibold">✅ Prête à expédier</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{order.customer || 'Client inconnu'}</div>
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Articles:</span> {order.finished}/{order.total}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Commandes partiellement terminées */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Partiellement terminées</h2>
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
                      <div className="text-sm font-medium mb-2">Reste à faire:</div>
                      <ul className="space-y-2">
                        {order.remaining.map(item => (
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

          {/* Commandes sans aucun article terminé (repliable, fermé par défaut) */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setShowNoneSection(v => !v)}
                className="px-3 py-1.5 rounded-md border text-sm font-medium cursor-pointer hover:bg-gray-50"
                aria-expanded={showNoneSection}
                aria-controls="none-orders-panel"
              >
                {showNoneSection ? '▾' : '▸'} Aucun article terminé
              </button>
              <span className="text-sm text-gray-600">{none.length}</span>
            </div>
            {showNoneSection && none.length > 0 && (
              <div id="none-orders-panel" className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      )}
    </div>
  )
}

export default TerminePage
