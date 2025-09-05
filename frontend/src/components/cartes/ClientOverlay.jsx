import React from 'react'
import { highlightText, renderFormattedAddress } from '../../utils/textUtils.jsx'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// Composant overlay client: affiche infos client, copiable, sans transition
const ClientOverlay = ({
  isOpen,
  onClose,
  article,
  searchTerm,
  copiedText,
  onCopy,
  renderFormattedAddress,
  highlightText,
  compact = false
}) => {
  if (!isOpen) return null
  return (
    <div 
      className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 rounded-3xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`relative h-full ${compact ? 'p-4' : 'p-6'} flex flex-col`}>
        <button
          onClick={onClose}
          className={`absolute top-3 right-3 text-gray-400 hover:text-gray-600 ${compact ? 'text-3xl' : 'text-4xl'} font-light hover:font-bold w-8 h-8 flex items-center justify-center`}
          aria-label="Fermer"
          title="Fermer"
        >
          ×
        </button>

        {copiedText && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm font-medium text-center">
            {copiedText}
          </div>
        )}

        <div className={`space-y-4 pr-16 -ml-2 ${compact ? 'text-sm' : ''}`}>
          <div className="flex items-center space-x-3 w-full">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} text-gray-700 flex-shrink-0`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20a8 8 0 0 1 16 0" />
            </svg>
            <div 
              className={`flex-1 min-w-0 ${compact ? 'text-sm' : 'text-base'} font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors`}
              onClick={() => onCopy(article.customer, 'Client copié !')}
              title="Cliquer pour copier"
            >
              {highlightText(article.customer, searchTerm)}
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} text-gray-700 flex-shrink-0`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <div 
              className={`flex-1 min-w-0 ${compact ? 'text-sm' : 'text-base'} font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors`}
              onClick={() => onCopy(format(new Date(article.orderDate), 'dd/MM/yyyy', { locale: fr }), 'Date copiée !')}
              title="Cliquer pour copier"
            >
              {highlightText(format(new Date(article.orderDate), 'dd/MM/yyyy', { locale: fr }), searchTerm)}
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} text-gray-800 flex-shrink-0`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 7l9 6 9-6" />
              <path d="M3 19l6-6" />
              <path d="M21 19l-6-6" />
            </svg>
            <div 
              className={`flex-1 min-w-0 ${compact ? 'text-sm' : 'text-base'} font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors`}
              onClick={() => onCopy(article.customerEmail || 'Non renseigné', 'Email copié !')}
              title="Cliquer pour copier"
            >
              {highlightText(article.customerEmail || 'Non renseigné', searchTerm)}
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} text-gray-700 flex-shrink-0`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4 1.1h2a2 2 0 0 1 2 1.72c.12.9.33 1.77.61 2.61a2 2 0 0 1-.45 2.11L7 8.09a16 16 0 0 0 6 6l.55-.76a2 2 0 0 1 2.11-.45c.84.28 1.71.49 2.61.61A2 2 0 0 1 22 16.92z" />
            </svg>
            <div 
              className={`flex-1 min-w-0 ${compact ? 'text-sm' : 'text-base'} font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors`}
              onClick={() => onCopy(article.customerPhone || 'Non renseigné', 'Téléphone copié !')}
              title="Cliquer pour copier"
            >
              {highlightText(article.customerPhone || 'Non renseigné', searchTerm)}
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} text-gray-700 flex-shrink-0`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5L12 3l9 7.5" />
              <path d="M5 10v10h14V10" />
              <path d="M9 20v-6h6v6" />
            </svg>
            <div 
              className={`flex-1 min-w-0 ${compact ? 'text-sm' : 'text-base'} font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors`}
              onClick={() => onCopy(article.customerAddress || 'Non renseignée', 'Adresse copiée !')}
              title="Cliquer pour copier"
            >
              {renderFormattedAddress(article.customerAddress)}
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} text-gray-700 flex-shrink-0`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7h11v8H3z" />
              <path d="M14 10h4l3 3v2h-7z" />
              <circle cx="7" cy="17" r="2" />
              <circle cx="17" cy="17" r="2" />
            </svg>
            <div 
              className={`flex-1 min-w-0 ${compact ? 'text-sm' : 'text-base'} font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors whitespace-nowrap`}
              onClick={() => onCopy(article.shippingMethod || 'Non renseigné', 'Transporteur copié !')}
              title="Cliquer pour copier"
            >
              {(() => {
                const title = (article.shippingMethod || '').toLowerCase()
                const isFree = title.includes('gratuit') || title.includes('free')
                if (isFree) {
                  const carrier = article.shippingCarrier || ((article.customerCountry || '').toUpperCase() === 'FR' ? 'UPS' : 'DHL')
                  return highlightText(`Livraison gratuite (${carrier})`, searchTerm)
                }
                return highlightText(article.shippingMethod || 'Non renseigné', searchTerm)
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientOverlay


