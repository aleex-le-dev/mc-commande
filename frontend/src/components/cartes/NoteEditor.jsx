import React from 'react'

// Editeur de note réutilisable (modale interne)
const NoteEditor = ({ initialValue, onClose, onSave, saving }) => {
  const [value, setValue] = React.useState(initialValue || '')
  React.useEffect(() => { setValue(initialValue || '') }, [initialValue])

  return (
    <div className="w-full h-full overflow-hidden bg-amber-50 border border-amber-200 rounded-xl shadow-xl p-4 pt-9 text-amber-900 transform -rotate-1">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-2xl select-none drop-shadow-sm">📌</div>
      <div className="flex items-start justify-end mb-2 relative">
        <button type="button" onClick={onClose} className="text-4xl absolute -top-8 -right-2 text-amber-500 hover:text-amber-700" aria-label="Fermer">×</button>
      </div>
      <div className="text-sm leading-relaxed break-words h-full flex flex-col">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full flex-1 p-3 rounded-lg border border-amber-300 bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          rows={12}
          placeholder="Ajouter une note..."
        />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm border border-amber-300 rounded-lg hover:bg-amber-100">Annuler</button>
          <button disabled={saving} onClick={() => onSave((value || '').trim())} className="px-3 py-1.5 text-sm rounded-lg text-white" style={{ backgroundColor: '#d97706' }}>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>
        </div>
      </div>
    </div>
  )
}

export default NoteEditor


