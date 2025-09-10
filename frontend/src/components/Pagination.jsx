/**
 * Composant de pagination simple et efficace
 */
import React from 'react'
import { IoChevronBack, IoChevronForward, IoChevronDown } from 'react-icons/io5'

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalItems = 0,
  itemsPerPage = 15,
  showItemsPerPage = true,
  onItemsPerPageChange
}) => {
  // Générer les numéros de page à afficher
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    
    if (totalPages <= maxVisible) {
      // Si peu de pages, toutes les afficher
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Logique pour afficher les pages pertinentes
      const start = Math.max(1, currentPage - 2)
      const end = Math.min(totalPages, start + maxVisible - 1)
      
      if (start > 1) {
        pages.push(1)
        if (start > 2) {
          pages.push('...')
        }
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push('...')
        }
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  const pageNumbers = getPageNumbers()
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-lg shadow-sm border">
      {/* Informations sur les éléments */}
      <div className="text-sm text-gray-600">
        {totalItems > 0 ? (
          <>
            Affichage de <span className="font-medium">{startItem}</span> à{' '}
            <span className="font-medium">{endItem}</span> sur{' '}
            <span className="font-medium">{totalItems}</span> éléments
          </>
        ) : (
          'Aucun élément à afficher'
        )}
      </div>

      {/* Contrôles de pagination */}
      <div className="flex items-center gap-1">
        {/* Bouton première page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Première page"
        >
          ««
        </button>

        {/* Bouton précédent */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Page précédente"
        >
          <IoChevronBack className="w-4 h-4" />
          Précédent
        </button>

        {/* Numéros de page */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={page === '...'}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                page === currentPage
                  ? 'bg-blue-600 text-white'
                  : page === '...'
                  ? 'text-gray-400 cursor-default'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        {/* Bouton suivant */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Page suivante"
        >
          Suivant
          <IoChevronForward className="w-4 h-4" />
        </button>

        {/* Bouton dernière page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Dernière page"
        >
          »»
        </button>
      </div>

      {/* Sélecteur d'éléments par page */}
      {showItemsPerPage && onItemsPerPageChange && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Par page:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      )}
    </div>
  )
}

export default Pagination
