import React, { useMemo, useState } from 'react'

/*
  Composant "FourniturePage":
  - Permet d'ajouter rapidement des fournitures sous forme de notes simples
  - Liste locale (mémoire de session) avec ajout et suppression en un clic
  - Pensé pour être minimaliste et rapide à l'usage
*/
const FourniturePage = () => {
  const storageKey = 'mc-fournitures-v1'
  const [input, setInput] = useState('')
  const [qty, setQty] = useState('1')
  const [items, setItems] = useState(() => {
    try {
      const raw = sessionStorage.getItem(storageKey)
      const parsed = raw ? JSON.parse(raw) : []
      // Migration légère: injecter qty=1 si absent
      if (Array.isArray(parsed)) {
        return parsed.map((it) => (typeof it === 'string' ? { id: Date.now(), label: it, qty: 1 } : { ...it, qty: it.qty ? it.qty : 1 }))
      }
      return []
    } catch {
      return []
    }
  })

  const save = (next) => {
    setItems(next)
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)) } catch {}
  }

  const addItem = () => {
    const label = input.trim()
    const q = parseInt(qty, 10)
    if (!label) return
    if (!Number.isFinite(q) || q < 1) return
    const next = [{ id: Date.now(), label, qty: q }, ...items]
    save(next)
    setInput('')
    setQty('1')
  }

  const removeItem = (id) => {
    const next = items.filter((it) => it.id !== id)
    save(next)
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

      {items.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Aucune fourniture. Ajoutez une note ci-dessus puis validez.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between px-3 py-2 rounded-md border"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
            >
              <span style={{ color: 'var(--text-primary)' }}>
                {it.label}
                <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                  × {it.qty ?? 1}
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeItem(it.id)}
                className="ml-3 px-2 py-1 rounded-md text-sm transition-colors duration-200 hover:opacity-80"
                style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}
                title="Supprimer"
                aria-label="Supprimer"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default FourniturePage


