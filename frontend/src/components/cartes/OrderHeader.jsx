import React from 'react'

// Composant pour l'en-tête avec titre et recherche
const OrderHeader = ({ selectedType, filteredArticlesCount, searchTerm, onSearchChange, onGoToEnd }) => {
  const getTitle = () => {
    if (selectedType === 'couture') return '🧵 Couture'
    if (selectedType === 'maille') return '🪡 Maille'
    if (selectedType === 'termine') return '✅ Articles terminés'
    return 'Gestion de Production'
  }

  const count = typeof filteredArticlesCount === 'number' ? filteredArticlesCount : 0
  const countLabel = `${count} article${count > 1 ? 's' : ''}`

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {getTitle()} ({countLabel})
        </h2>
      </div>
      <div className="w-full sm:w-80">
        <form onSubmit={(e) => { e.preventDefault(); /* surlignage en direct */ }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher une commande (n°, client, produit)"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--rose-clair-text)] transition-colors"
            style={{ 
              borderColor: 'var(--border-primary)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          />
        </form>
      </div>
    </div>
  )
}

export default OrderHeader
