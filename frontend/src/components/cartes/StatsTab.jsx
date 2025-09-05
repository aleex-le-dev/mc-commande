import React, { useEffect, useMemo, useState } from 'react'
import { getProductionStats } from '../../services/mongodbService'

// Onglet Statistiques: affiche les nombres d'articles terminés par semaine et par mois,
// segmentés par type (couture/maille) et par couturière.
const StatsTab = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const data = await getProductionStats()
        if (!cancelled) setStats(data || {})
      } catch (e) {
        if (!cancelled) setError('Erreur de récupération des statistiques')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const weekly = useMemo(() => stats?.weekly || [], [stats])
  const monthly = useMemo(() => stats?.monthly || [], [stats])
  const yearly = useMemo(() => {
    if (stats?.yearly && Array.isArray(stats.yearly) && stats.yearly.length > 0) return stats.yearly
    // Fallback: agréger les monthly par année/type/couturière
    const map = new Map()
    ;(stats?.monthly || []).forEach(r => {
      const year = String(r.period || '').slice(0, 4)
      const type = r.type || '-'
      const seam = r.seamstress || r.couturiere || '-'
      const key = `${year}|${type}|${seam}`
      const prev = map.get(key) || 0
      const cnt = Number(r.count ?? r.termines ?? 0)
      map.set(key, prev + (isNaN(cnt) ? 0 : cnt))
    })
    return Array.from(map.entries()).map(([key, count]) => {
      const [year, type, seam] = key.split('|')
      return { period: year, type, seamstress: seam, count }
    })
  }, [stats])

  const weeklyToShow = weekly
  const monthlyToShow = monthly
  const yearlyToShow = yearly

  // Sélecteur de période (tableau unique) + filtre de type
  const [period, setPeriod] = useState('week') // 'week' | 'month' | 'year'
  const [typeFilter, setTypeFilter] = useState('both') // 'both' | 'maille' | 'couture'

  // Construire le tableau: Couturière | Couture | Maille | Total
  const tableRows = useMemo(() => {
    const src = period === 'year' ? yearlyToShow : period === 'month' ? monthlyToShow : weeklyToShow
    const map = new Map() // seam -> { couture, maille, total }
    const allowed = typeFilter === 'both' ? new Set(['couture','maille']) : new Set([typeFilter])
    ;(src || []).forEach(r => {
      const seam = r.seamstress || r.couturiere || '-'
      const type = (r.type || '-').toLowerCase()
      const inc = Number(r.count ?? r.termines ?? 0) || 0
      const cur = map.get(seam) || { couture: 0, maille: 0, total: 0 }
      if (allowed.has('couture') && type === 'couture') {
        cur.couture += inc
        cur.total += inc
      } else if (allowed.has('maille') && type === 'maille') {
        cur.maille += inc
        cur.total += inc
      } else {
        // ignorer les autres types non sélectionnés
      }
      map.set(seam, cur)
    })
    return Array.from(map.entries()).map(([seam, v]) => ({ seam, ...v }))
      .sort((a, b) => b.total - a.total)
  }, [weeklyToShow, monthlyToShow, yearlyToShow, period, typeFilter])

  const totals = useMemo(() => tableRows.reduce((acc, r) => ({
    couture: acc.couture + r.couture,
    maille: acc.maille + r.maille,
    total: acc.total + r.total
  }), { couture: 0, maille: 0, total: 0 }), [tableRows])

  if (loading) {
    return <div className="bg-white rounded-2xl shadow-sm border p-6 text-center">Chargement…</div>
  }
  if (error) {
    return <div className="bg-white rounded-2xl shadow-sm border p-6 text-center text-red-600">{error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
          <option value="week">Semaine</option>
          <option value="month">Mois</option>
          <option value="year">Année</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
          <option value="both">Maille + Couture</option>
          <option value="maille">Maille</option>
          <option value="couture">Couture</option>
        </select>
        <div className="ml-auto flex gap-3">
          {(typeFilter === 'both' || typeFilter === 'couture') && (
            <div className="rounded-xl border px-4 py-2 text-sm bg-rose-50 border-rose-200 text-rose-700">
              Couture: <strong>{totals.couture}</strong>
            </div>
          )}
          {(typeFilter === 'both' || typeFilter === 'maille') && (
            <div className="rounded-xl border px-4 py-2 text-sm bg-emerald-50 border-emerald-200 text-emerald-700">
              Maille: <strong>{totals.maille}</strong>
            </div>
          )}
          <div className="rounded-xl border px-4 py-2 text-sm bg-indigo-50 border-indigo-200 text-indigo-700">
            Total: <strong>{totals.total}</strong>
          </div>
        </div>
      </div>

      {tableRows.length === 0 ? (
        <div className="bg-gray-50 border rounded-xl p-6 text-center text-gray-600">Aucune donnée</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tableRows.map((r, idx) => {
            const dominantIsCouture = (r.couture || 0) >= (r.maille || 0)
            const forceCouture = typeFilter === 'couture'
            const forceMaille = typeFilter === 'maille'
            const ringClass = (forceCouture || (dominantIsCouture && !forceMaille)) ? 'border-rose-300' : 'border-emerald-300'
            const bgGradient = (forceCouture || (dominantIsCouture && !forceMaille)) ? 'from-rose-50 to-white' : 'from-emerald-50 to-white'
            const total = (r.total || 0)
            let pctCouture = total > 0 ? Math.round((r.couture / total) * 100) : 0
            let pctMaille = total > 0 ? Math.max(0, 100 - pctCouture) : 0
            if (forceCouture) { pctCouture = 100; pctMaille = 0 }
            if (forceMaille) { pctCouture = 0; pctMaille = 100 }
            return (
              <div key={idx} className={`rounded-2xl shadow-sm border p-4 bg-gradient-to-br ${bgGradient} ${ringClass}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold">{r.seam}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-3xl font-bold mb-3">{r.total}</div>
                <div className="mb-3">
                  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full w-full flex">
                      <div className="h-full bg-rose-400" style={{ width: `${pctCouture}%` }}></div>
                      <div className="h-full bg-emerald-400" style={{ width: `${pctMaille}%` }}></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] mt-1 text-gray-600">
                    {(typeFilter === 'both' || typeFilter === 'couture') && (<span>Couture {r.couture}</span>)}
                    {(typeFilter === 'both' || typeFilter === 'maille') && (<span>Maille {r.maille}</span>)}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {(typeFilter === 'both' || typeFilter === 'couture') && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200">Couture</span>
                  )}
                  {(typeFilter === 'both' || typeFilter === 'maille') && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Maille</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default StatsTab


