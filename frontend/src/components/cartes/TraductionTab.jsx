import React, { useEffect, useState } from 'react'
import translationService from '../../services/translationService'

// Onglet d'administration pour gérer les traductions personnalisées appliquées en priorité
const TraductionTab = () => {
  const [entries, setEntries] = useState([])
  const [term, setTerm] = useState('')
  const [value, setValue] = useState('')
  

  useEffect(() => {
    (async () => {
      await translationService.syncCustomTranslations()
      setEntries(translationService.getCustomTranslations())
    })()
  }, [])

  

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
          <input value={term} onChange={(e)=>setTerm(e.target.value)} placeholder="three" className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[var(--rose-clair-text)]" />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Traduction (français)</label>
          <input value={value} onChange={(e)=>setValue(e.target.value)} placeholder="trois" className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[var(--rose-clair-text)]" />
        </div>
        <button
          onClick={add}
          className="px-5 py-2.5 bg-[var(--rose-clair-text)] text-white rounded-md shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--rose-clair-text)] cursor-pointer"
          title="Ajouter la règle"
          aria-label="Ajouter la règle"
        >
          ➕ Ajouter
        </button>
      </div>

      

      <div className="border rounded divide-y">
        {entries.length === 0 && (
          <div className="p-4 text-sm text-gray-500">Aucune traduction personnalisée</div>
        )}
        {entries.map(({ key, value }) => (
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


