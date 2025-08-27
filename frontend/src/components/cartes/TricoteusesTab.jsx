import React, { useState, useEffect } from 'react'
import { tricoteusesService } from '../../services/mongodbService'

const TricoteusesTab = () => {
  const [knitters, setKnitters] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingKnitter, setEditingKnitter] = useState(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    color: '#f43f5e',
    photoFile: null,
    photoPreview: '',
    gender: 'feminin' // Par défaut féminin
  })

  const palette = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    '#f43f5e', '#6b7280', '#111827'
  ]

  // Charger les tricoteuses au montage du composant
  useEffect(() => {
    loadTricoteuses()
  }, [])

  const loadTricoteuses = async () => {
    try {
      setLoading(true)
      const data = await tricoteusesService.getAllTricoteuses()
      setKnitters(data)
    } catch (error) {
      console.error('Erreur chargement tricoteuses:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      firstName: '',
      color: '#f43f5e',
      photoFile: null,
      photoPreview: '',
      gender: 'feminin' // Par défaut féminin
    })
    setEditingKnitter(null)
  }

  const openAddModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (knitter) => {
    setFormData({
      firstName: knitter.firstName,
      color: knitter.color,
      photoFile: null,
      photoPreview: knitter.photoUrl || '',
      gender: knitter.gender || 'feminin' // Par défaut féminin
    })
    setEditingKnitter(knitter)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    resetForm()
  }

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setFormData(prev => ({
        ...prev,
        photoFile: file,
        photoPreview: url
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = formData.firstName.trim()
    if (!trimmed) return

    try {
      setLoading(true)
      
      if (editingKnitter) {
        // Modification
        const updateData = {
          firstName: trimmed,
          color: formData.color,
          photoUrl: formData.photoPreview || editingKnitter.photoUrl,
          gender: formData.gender
        }
        await tricoteusesService.updateTricoteuse(editingKnitter._id, updateData)
      } else {
        // Ajout
        const createData = {
          firstName: trimmed,
          color: formData.color,
          photoUrl: formData.photoPreview || '',
          gender: formData.gender
        }
        await tricoteusesService.createTricoteuse(createData)
      }
      
      // Recharger la liste
      await loadTricoteuses()
      closeModal()
    } catch (error) {
      console.error('Erreur sauvegarde tricoteuse:', error)
      alert('Erreur lors de la sauvegarde. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const removeKnitter = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tricoteuse ?')) {
      return
    }

    try {
      setLoading(true)
      await tricoteusesService.deleteTricoteuse(id)
      await loadTricoteuses()
    } catch (error) {
      console.error('Erreur suppression tricoteuse:', error)
      alert('Erreur lors de la suppression. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tricoteuses</h2>
          <p className="text-gray-600">Gérez votre équipe de tricoteuses</p>
        </div>

        {/* Grille des tricoteuses */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {loading ? (
            <div className="col-span-full p-12 border-2 border-dashed border-gray-300 rounded-xl text-center">
              <div className="text-gray-400 text-6xl mb-4">⚙️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Chargement des tricoteuses...</h3>
              <p className="text-gray-500 mb-4">Veuillez patienter pendant le chargement des données.</p>
            </div>
          ) : knitters.length === 0 ? (
            <div className="col-span-full p-12 border-2 border-dashed border-gray-300 rounded-xl text-center">
              <div className="text-gray-400 text-6xl mb-4">🧶</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune tricoteuse</h3>
              <p className="text-gray-500 mb-4">Commencez par ajouter votre première tricoteuse</p>
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-[var(--rose-clair-text)] text-white rounded-lg hover:opacity-90 transition-all duration-200"
              >
                Ajouter une tricoteuse
              </button>
            </div>
          ) : (
            <>
              {/* Bouton Ajouter permanent */}
              <div className="group bg-white border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-[var(--rose-clair-text)] hover:bg-[var(--rose-clair)] hover:bg-opacity-5 transition-all duration-200 cursor-pointer" onClick={openAddModal}>
                <div className="flex flex-col items-center justify-center text-center space-y-3 h-full min-h-[120px]">
                  <div className="text-4xl text-gray-400 group-hover:text-[var(--rose-clair-text)] transition-colors">+</div>
                  <div className="text-sm font-medium text-gray-600 group-hover:text-[var(--rose-clair-text)] transition-colors">Ajouter une tricoteuse</div>
                </div>
              </div>
              
              {/* Tricoteuses existantes */}
              {knitters.map(k => (
                <div key={k._id} className="group bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex flex-col items-center text-center space-y-3">
                    {k.photoUrl ? (
                      <img src={k.photoUrl} alt={k.firstName} className="h-16 w-16 rounded-full object-cover border-2 border-gray-100 shadow-sm" />
                    ) : (
                      <div className="h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-sm" style={{ backgroundColor: k.color }}>
                        {k.firstName[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{k.firstName}</div>
                      <div className="text-xs text-gray-500">
                        {k.gender === 'masculin' ? 'Tricoteur' : 'Tricoteuse'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => openEditModal(k)}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => removeKnitter(k._id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Modal d'ajout/modification */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingKnitter ? `Modifier le/la ${formData.gender === 'masculin' ? 'tricoteur' : 'tricoteuse'}` : 'Ajouter une tricoteuse'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
        </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar et nom */}
                <div className="flex items-center gap-4">
                  {formData.photoPreview ? (
                    <img src={formData.photoPreview} alt="Aperçu" className="h-16 w-16 rounded-full object-cover border-2 border-gray-200" />
                  ) : (
                    <div className="h-16 w-16 rounded-full flex items-center justify-center text-white font-semibold text-5xl relative" style={{ backgroundColor: formData.color }}>
                      <span className="absolute inset-0 flex items-center justify-center transform -translate-y-1">{formData.firstName ? formData.firstName[0].toUpperCase() : 'A'}</span>
                    </div>
                  )}
              <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                <input
                
                  type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Ex: Alex"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--rose-clair-text)] focus:border-transparent"
                      required
                />
              </div>
            </div>

                {/* Palette de couleurs */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Couleur de l'avatar</label>
                  <div className="grid grid-cols-8 gap-2">
                    {palette.map((c, index) => (
                      <button
                        type="button"
                        key={`color-${index}-${c}`}
                        onClick={() => setFormData(prev => ({ ...prev, color: c }))}
                        className={`h-10 w-10 rounded-full border-2 transition-all duration-200 ${
                          formData.color === c 
                            ? 'ring-2 ring-offset-2 ring-[var(--rose-clair-text)] border-white' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={`Choisir la couleur ${c}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Sélection du sexe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Sexe</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value="feminin"
                        checked={formData.gender === 'feminin'}
                        onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                        className="sr-only"
                      />
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                        formData.gender === 'feminin' 
                          ? 'border-[var(--rose-clair-text)] bg-[var(--rose-clair)] bg-opacity-10' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <span className="text-xl">👩</span>
                        <span className="font-medium">Féminin</span>
                      </div>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value="masculin"
                        checked={formData.gender === 'masculin'}
                        onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                        className="sr-only"
                      />
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                        formData.gender === 'masculin' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <span className="text-xl">👨</span>
                        <span className="font-medium">Masculin</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Upload photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Photo (optionnel)</label>
                  <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:bg-gray-50 transition-colors">
                    📷 {formData.photoPreview ? 'Changer la photo' : 'Ajouter une photo'}
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
                  {formData.photoPreview && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, photoPreview: '', photoFile: null }))}
                      className="ml-2 text-sm text-red-600 hover:text-red-700"
                    >
                      Supprimer
                    </button>
                  )}
          </div>

                {/* Boutons d'action */}
                <div className="flex gap-3 pt-4">
                            <button
                              type="button"
                    onClick={closeModal}
                    disabled={loading}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-[var(--rose-clair-text)] text-white rounded-lg hover:opacity-90 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingKnitter ? 'Modification...' : 'Ajout...'}
                      </>
                    ) : (
                      editingKnitter ? 'Modifier' : 'Ajouter'
                    )}
                  </button>
                        </div>
              </form>
                        </div>
                      </div>
            </div>
          )}
    </div>
  )
}

export default TricoteusesTab
