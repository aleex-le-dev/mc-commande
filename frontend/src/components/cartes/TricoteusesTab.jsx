import React, { useState } from 'react'

const TricoteusesTab = () => {
  const [firstName, setFirstName] = useState('')
  const [color, setColor] = useState('#f43f5e')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [knitters, setKnitters] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [draftName, setDraftName] = useState('')
  const [draftColor, setDraftColor] = useState('#f43f5e')
  const [draftPhotoPreview, setDraftPhotoPreview] = useState('')
  const [draftPhotoFile, setDraftPhotoFile] = useState(null)

  const palette = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    '#f43f5e', '#ef4444', '#6b7280', '#111827'
  ]

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0]
    setPhotoFile(file || null)
    if (file) {
      const url = URL.createObjectURL(file)
      setPhotoPreview(url)
    } else {
      setPhotoPreview('')
    }
  }

  const handleDraftFileChange = (e) => {
    const file = e.target.files && e.target.files[0]
    setDraftPhotoFile(file || null)
    if (file) {
      const url = URL.createObjectURL(file)
      setDraftPhotoPreview(url)
    }
  }

  const addKnitter = (e) => {
    e.preventDefault()
    const trimmed = firstName.trim()
    if (!trimmed) return
    const newEntry = {
      id: Date.now(),
      firstName: trimmed,
      color,
      photoUrl: photoPreview || ''
    }
    setKnitters(prev => [newEntry, ...prev])
    setFirstName('')
    setColor('#f43f5e')
    setPhotoFile(null)
    setPhotoPreview('')
  }

  const removeKnitter = (id) => {
    setKnitters(prev => prev.filter(k => k.id !== id))
  }

  const startEdit = (k) => {
    setEditingId(k.id)
    setDraftName(k.firstName)
    setDraftColor(k.color)
    setDraftPhotoPreview(k.photoUrl)
    setDraftPhotoFile(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraftName('')
    setDraftColor('#f43f5e')
    setDraftPhotoPreview('')
    setDraftPhotoFile(null)
  }

  const saveEdit = (id) => {
    setKnitters(prev => prev.map(k => k.id === id ? {
      ...k,
      firstName: draftName.trim() || k.firstName,
      color: draftColor,
      photoUrl: draftPhotoPreview || k.photoUrl
    } : k))
    cancelEdit()
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tricoteuses</h2>
          <p className="text-gray-600">Ajoutez une tricoteuse avec avatar (couleur + initiale) ou photo.</p>
        </div>

        {/* Formulaire moderne (carte compacte) */}
        <form onSubmit={addKnitter} className="mb-8">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:gap-6 gap-4">
            <div className="flex items-center gap-4 flex-1">
              {photoPreview ? (
                <img src={photoPreview} alt="Aperçu" className="h-14 w-14 rounded-full object-cover border" />
              ) : (
                <div className="h-14 w-14 rounded-full flex items-center justify-center text-white font-semibold" style={{ backgroundColor: color }}>
                  {firstName ? firstName[0].toUpperCase() : 'A'}
                </div>
              )}
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ex: Alice"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--rose-clair-text)]"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-2">Couleur de l'avatar</label>
              <div className="grid grid-cols-10 gap-2">
                {palette.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full border ${color === c ? 'ring-2 ring-offset-2 ring-[var(--rose-clair-text)]' : 'border-gray-200'}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Choisir la couleur ${c}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white text-sm hover:bg-gray-50">
                📷 Uploader
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
              <button type="submit" className="px-4 py-2 bg-[var(--rose-clair-text)] text-white rounded-md hover:opacity-90">Ajouter</button>
            </div>
          </div>
        </form>

        {/* Liste / grille des tricoteuses */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Équipe</h3>
          {knitters.length === 0 ? (
            <div className="p-6 border border-dashed border-gray-300 rounded-lg text-gray-500 text-sm">
              Aucune tricoteuse ajoutée pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {knitters.map(k => (
                <div key={k.id} className="group bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  {editingId === k.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {draftPhotoPreview ? (
                          <img src={draftPhotoPreview} alt={draftName} className="h-12 w-12 rounded-full object-cover border" />
                        ) : (
                          <div className="h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold" style={{ backgroundColor: draftColor }}>
                            {draftName ? draftName[0].toUpperCase() : k.firstName[0].toUpperCase()}
                          </div>
                        )}
                        <input
                          type="text"
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--rose-clair-text)]"
                        />
                      </div>
                      <div>
                        <div className="grid grid-cols-10 gap-2">
                          {palette.map((c) => (
                            <button
                              type="button"
                              key={c}
                              onClick={() => setDraftColor(c)}
                              className={`h-7 w-7 rounded-full border ${draftColor === c ? 'ring-2 ring-offset-2 ring-[var(--rose-clair-text)]' : 'border-gray-200'}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm hover:bg-gray-50">
                          📷 Remplacer la photo
                          <input type="file" accept="image/*" onChange={handleDraftFileChange} className="hidden" />
                        </label>
                        <div className="space-x-2">
                          <button onClick={() => saveEdit(k.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">Enregistrer</button>
                          <button onClick={cancelEdit} className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm">Annuler</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        {k.photoUrl ? (
                          <img src={k.photoUrl} alt={k.firstName} className="h-12 w-12 rounded-full object-cover border" />
                        ) : (
                          <div className="h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold" style={{ backgroundColor: k.color }}>
                            {k.firstName[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900">{k.firstName}</div>
                          <div className="text-xs text-gray-500">Avatar {k.photoUrl ? 'photo' : 'couleur'}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-between items-center">
                        <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: k.color }} title={k.color} />
                        <div className="space-x-3">
                          <button onClick={() => startEdit(k)} className="text-sm text-blue-600 hover:text-blue-700">Modifier</button>
                          <button onClick={() => removeKnitter(k.id)} className="text-sm text-red-600 hover:text-red-700">Supprimer</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TricoteusesTab
