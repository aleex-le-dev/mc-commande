import React, { useEffect, useMemo, useState } from 'react'
import { ApiService } from '../services/apiService'

/*
  Composant "FourniturePage":
  - Permet d'ajouter rapidement des fournitures sous forme de notes simples
  - Liste locale (mémoire de session) avec ajout et suppression en un clic
  - Pensé pour être minimaliste et rapide à l'usage
*/
const FourniturePage = () => {
  const storageKey = 'mc-fournitures-v1'
  const [input, setInput] = useState('')
  const [qty, setQty] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const list = await ApiService.fournitures.list()
        if (mounted) setItems(list)
      } catch (e) {
        if (mounted) setError('Impossible de charger les fournitures')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const save = (next) => { setItems(next) }

  const updateItemLabel = (id, nextLabel) => {
    const label = (nextLabel || '').trim()
    const next = items.map((it) => (it._id || it.id) === id ? { ...it, label } : it)
    save(next)
    ;(async () => { try { await ApiService.fournitures.update(id, { label }) } catch {} })()
  }

  const updateItemQty = (id, nextQty) => {
    const q = parseInt(nextQty, 10)
    const qty = Number.isFinite(q) && q >= 1 ? q : ''
    const next = items.map((it) => (it._id || it.id) === id ? { ...it, qty } : it)
    save(next)
    ;(async () => { try { if (qty !== '') await ApiService.fournitures.update(id, { qty }) } catch {} })()
  }

  const addItem = () => {
    const label = input.trim()
    const q = parseInt(qty, 10)
    if (!label) return
    if (!Number.isFinite(q) || q < 1) return
    const tempId = `tmp-${Date.now()}`
    const optimistic = [...items, { _id: tempId, label, qty: q }]
    save(optimistic)
    ;(async () => {
      try {
        const created = await ApiService.fournitures.create(label, q)
        save(optimistic.map(it => (it._id === tempId ? created : it)))
      } catch (e) {
        // rollback
        save(items)
      }
    })()
    setInput('')
    setQty('')
  }

  const removeItem = (id) => {
    const next = items.filter((it) => (it._id || it.id) !== id)
    const prev = items
    save(next)
    ;(async () => { try { await ApiService.fournitures.remove(id) } catch { save(prev) } })()
  }

  const canAdd = useMemo(() => {
    const labelOk = input.trim().length > 0
    const q = parseInt(qty, 10)
    const qtyOk = Number.isFinite(q) && q >= 1
    return labelOk && qtyOk
  }, [input, qty])

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Fournitures</h1>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && canAdd) addItem() }}
          placeholder="Ajouter une fourniture (ex: Boutons nacre 12mm)"
          className="flex-1 px-3 py-2 rounded-md border"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-primary)'
          }}
        />
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && canAdd) addItem() }}
          placeholder="Qté"
          className="w-24 px-3 py-2 rounded-md border text-right"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-primary)'
          }}
          aria-label="Quantité"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!canAdd}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${canAdd ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
          style={{
            color: 'var(--rose-clair-text)',
            backgroundColor: 'var(--rose-clair)'
          }}
        >
          Ajouter
        </button>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Chargement…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Aucune fourniture. Ajoutez une note ci-dessus puis validez.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it._id || it.id} className="flex items-center gap-2 px-3 py-2 rounded-md border"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
            >
              <input
                type="text"
                value={it.label}
                onChange={(e) => updateItemLabel(it._id || it.id, e.target.value)}
                placeholder="Nom de la fourniture"
                className="flex-1 px-2 py-1 rounded border text-sm"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderColor: 'var(--border-primary)' }}
                aria-label="Nom"
              />
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={it.qty === '' || typeof it.qty === 'undefined' || it.qty === null ? '' : it.qty}
                onChange={(e) => updateItemQty(it._id || it.id, e.target.value)}
                placeholder="Qté"
                className="w-24 px-2 py-1 rounded border text-right text-sm"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderColor: 'var(--border-primary)' }}
                aria-label="Quantité"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const id = it._id || it.id
                    const next = items.map(x => (x._id || x.id) === id ? { ...x, ordered: !x.ordered } : x)
                    save(next)
                    try { await ApiService.fournitures.update(id, { ordered: !it.ordered }) } catch {}
                  }}
                  className={`px-2 py-1 rounded-md text-sm transition-colors duration-200 cursor-pointer ${
                    it.ordered
                      ? 'bg-green-200 text-green-800 hover:bg-green-300 hover:text-green-900'
                      : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-800'
                  }`}
                  title="Marquer comme commandé"
                  aria-label="Marquer comme commandé"
                >
                  Commandé
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(it._id || it.id)}
                  className="px-2 py-1 rounded-md text-sm transition-colors duration-200 cursor-pointer bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700"
                  title="Supprimer"
                  aria-label="Supprimer"
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default FourniturePage


