import React from 'react'

// Composant pour l'en-tête avec titre et recherche
const OrderHeader = ({ selectedType, filteredArticlesCount, searchTerm, onSearchChange, onGoToEnd }) => {
  const getTitle = () => {
    if (selectedType === 'couture') return '🧵 Couture'
    if (selectedType === 'maille') return '🪡 Maille'
    return 'Gestion de Production'
  }

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-gray-900">
          {getTitle()} ({filteredArticlesCount} articles)
        </h2>
        {typeof onGoToEnd === 'function' && (
          <button
            type="button"
            onClick={onGoToEnd}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 cursor-pointer"
            title="Aller à la fin"
            aria-label="Aller à la fin"
          >
            Aller à la fin
          </button>
        )}
      </div>
      <div className="w-full sm:w-80">
        <form onSubmit={(e) => { e.preventDefault(); /* surlignage en direct */ }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher une commande (n°, client, produit)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--rose-clair-text)]"
          />
        </form>
      </div>
    </div>
  )
}

export default OrderHeader
