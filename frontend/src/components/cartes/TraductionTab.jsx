import React, { useEffect, useMemo, useState } from 'react'
import translationService from '../../services/translationService'

// Onglet d'administration pour gérer les traductions personnalisées appliquées en priorité
const TraductionTab = () => {
  const [entries, setEntries] = useState([])
  const [term, setTerm] = useState('')
  const [value, setValue] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    (async () => {
      await translationService.syncCustomTranslations()
      setEntries(translationService.getCustomTranslations())
    })()
  }, [])

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase()
    if (!f) return entries
    return entries.filter(e => e.key.toLowerCase().includes(f) || e.value.toLowerCase().includes(f))
  }, [entries, filter])

  const add = () => {
    const k = term.trim()
    const v = value.trim()
    if (!k || !v) return
    translationService.upsertCustomTranslation(k, v)
    setEntries(translationService.getCustomTranslations())
    setTerm('')
    setValue('')
  }

  const remove = (k) => {
    translationService.removeCustomTranslation(k)
    setEntries(translationService.getCustomTranslations())
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold mb-4">Traductions personnalisées</h2>
      <p className="text-sm text-gray-600 mb-4">Ajoutez des remplacements prioritaires (ex: three → trois). Ces règles s'appliquent avant Google Translate.</p>

      <div className="mb-4">
        <button onClick={async ()=>{ await translationService.syncCustomTranslations(); setEntries(translationService.getCustomTranslations()) }} className="px-3 py-2 border rounded mr-2">Recharger</button>
        <button onClick={()=>setEntries(translationService.getCustomTranslations())} className="px-3 py-2 border rounded">Valider</button>
      </div>

      <div className="flex items-end gap-3 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Terme (anglais ou source)</label>
          <input value={term} onChange={(e)=>setTerm(e.target.value)} placeholder="three" className="w-full px-3 py-2 border rounded" />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Traduction (français)</label>
          <input value={value} onChange={(e)=>setValue(e.target.value)} placeholder="trois" className="w-full px-3 py-2 border rounded" />
        </div>
        <button onClick={add} className="px-4 py-2 bg-[var(--rose-clair)] text-white rounded hover:opacity-90">Ajouter</button>
      </div>

      <div className="mb-3">
        <input value={filter} onChange={(e)=>setFilter(e.target.value)} placeholder="Filtrer..." className="w-full px-3 py-2 border rounded" />
      </div>

      <div className="border rounded divide-y">
        {filtered.length === 0 && (
          <div className="p-4 text-sm text-gray-500">Aucune traduction personnalisée</div>
        )}
        {filtered.map(({ key, value }) => (
          <div key={key} className="flex items-center justify-between p-3">
            <div>
              <div className="text-sm font-medium">{key}</div>
              <div className="text-sm text-gray-600">→ {value}</div>
            </div>
            <button onClick={()=>remove(key)} className="text-red-600 text-sm hover:underline">Supprimer</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TraductionTab


