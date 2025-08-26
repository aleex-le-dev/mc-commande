import React from 'react'

// Composant pour l'en-tête avec titre et recherche
const OrderHeader = ({ selectedType, filteredArticlesCount, searchTerm, onSearchChange }) => {
  const getTitle = () => {
    if (selectedType === 'couture') return '🧵 Couture'
    if (selectedType === 'maille') return '🪡 Maille'
    return 'Gestion de Production'
  }

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <h2 className="text-xl font-semibold text-gray-900">
        {getTitle()} ({filteredArticlesCount} articles)
      </h2>
      <div className="w-full sm:w-80">
        <form onSubmit={(e) => { e.preventDefault(); /* surlignage en direct */ }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher une commande (n°, client, produit)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        </form>
      </div>
    </div>
  )
}

export default OrderHeader
