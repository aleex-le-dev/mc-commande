import React from 'react'
import { FiX, FiAlertTriangle, FiTrash2 } from 'react-icons/fi'

const ConfirmationToast = ({ 
  isVisible, 
  onClose, 
  onConfirm, 
  orderNumber, 
  articles, 
  isDeleting = false 
}) => {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <FiAlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              Supprimer la commande
            </h3>
          </div>
          <button
            onClick={onClose}
            className="ml-auto flex-shrink-0 text-gray-400 hover:text-gray-600"
            disabled={isDeleting}
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3">
            Vous allez supprimer la commande <span className="font-semibold">#{orderNumber}</span>, 
            qui contient <span className="font-semibold">{articles.length} article{articles.length > 1 ? 's' : ''}</span> :
          </p>
          
          <div className="bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
            <ul className="text-sm text-gray-700 space-y-1">
              {articles.map((article, index) => (
                <li key={index} className="flex items-center">
                  <span className="w-6 text-gray-500">{index + 1}.</span>
                  <span className="flex-1">{article.product_name}</span>
                  {article.meta_data && (
                    <span className="text-xs text-gray-500 ml-2">
                      {article.meta_data
                        .filter(meta => 
                          meta.key && (
                            meta.key.toLowerCase().includes('taille') ||
                            meta.key.toLowerCase().includes('size') ||
                            meta.key.toLowerCase().includes('couleur') ||
                            meta.key.toLowerCase().includes('color')
                          )
                        )
                        .map(meta => meta.value)
                        .join(', ')
                      }
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Suppression...
              </>
            ) : (
              <>
                <FiTrash2 className="h-4 w-4 mr-2" />
                Supprimer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmationToast
