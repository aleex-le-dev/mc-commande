import React, { useState } from 'react'
import OrderHeader from './cartes/OrderHeader'

/* Page simple "Terminé" avec le même header (titre + recherche), sans logique de liste. */
const TerminePage = () => {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header sans bordure, comme les autres pages */}
      <div className="mb-6">
        <OrderHeader
          selectedType="termine"
          filteredArticlesCount={0}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-10 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Articles terminés</h1>
        <p className="text-gray-600">Aucun article terminé.</p>
      </div>
    </div>
  )
}

export default TerminePage
