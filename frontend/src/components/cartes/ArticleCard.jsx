import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// Composant carte d'article moderne optimisé
const ArticleCard = React.memo(({ 
  article, 
  index, 
  getArticleSize, 
  getArticleColor, 
  getArticleOptions, 
  onOverlayOpen, 
  isOverlayOpen, 
  isHighlighted, 
  searchTerm 
}) => {
  const [imageUrl, setImageUrl] = useState(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [copiedText, setCopiedText] = useState('')
  const [isNoteOpen, setIsNoteOpen] = useState(false)
  const noteBtnRef = useRef(null)
  const notePopoverRef = useRef(null)

  // Fermer la note sur demande globale (pour garantir une seule note ouverte)
  useEffect(() => {
    const handleGlobalClose = () => setIsNoteOpen(false)
    window.addEventListener('mc-close-notes', handleGlobalClose)
    return () => window.removeEventListener('mc-close-notes', handleGlobalClose)
  }, [])

  // Fermer la note si clic en dehors (n'importe où dans le document)
  useEffect(() => {
    if (!isNoteOpen) return
    const handleClickOutside = (event) => {
      const btn = noteBtnRef.current
      const pop = notePopoverRef.current
      if (pop && pop.contains(event.target)) return
      if (btn && btn.contains(event.target)) return
      setIsNoteOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside, true)
    return () => document.removeEventListener('mousedown', handleClickOutside, true)
  }, [isNoteOpen])

  const handleCopy = useCallback(async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(label)
      setTimeout(() => setCopiedText(''), 2000)
    } catch (err) {
      // Erreur silencieuse lors de la copie
    }
  }, [])

  const handleOverlayToggle = useCallback((e) => {
    e.stopPropagation()
    onOverlayOpen && onOverlayOpen()
  }, [onOverlayOpen])

  // Mémoriser l'image URL pour éviter les re-renders
  const memoizedImageUrl = useMemo(() => article.image_url, [article.image_url])
  const memoizedProductId = useMemo(() => article.product_id, [article.product_id])

  useEffect(() => {
    // Utiliser l'image stockée en base de données si disponible
    if (memoizedImageUrl) {
      setImageUrl(memoizedImageUrl)
    } else if (memoizedProductId) {
      // Sinon, essayer de récupérer l'image depuis WooCommerce
      fetchCardImage(memoizedProductId)
    }
  }, [memoizedImageUrl, memoizedProductId])

  const fetchCardImage = async (productId) => {
    setIsImageLoading(true)
    try {
      // 1) Tenter via le backend (image stockée en BDD)
      const backendUrl = 'http://localhost:3001/api/images/' + productId
      const backendResp = await fetch(backendUrl, { method: 'GET', signal: AbortSignal.timeout(5000) })
      if (backendResp.ok) {
        setImageUrl(backendUrl)
        return
      }

      // 2) Fallback WordPress si indisponible (peut échouer CORS, mais non bloquant)
      const wordpressUrl = import.meta.env.VITE_WORDPRESS_URL
      const consumerKey = import.meta.env.VITE_WORDPRESS_CONSUMER_KEY
      const consumerSecret = import.meta.env.VITE_WORDPRESS_CONSUMER_SECRET
      if (wordpressUrl && consumerKey && consumerSecret) {
        const authParams = `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`
        const url = `${wordpressUrl}/wp-json/wc/v3/products/${productId}?${authParams}&_fields=id,images`
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000)
        })
        if (response.ok) {
          const product = await response.json()
          if (product?.images && product.images.length > 0) {
            setImageUrl(product.images[0].src)
          }
        }
      }
    } catch (error) {
      // Ignorer silencieusement les erreurs CORS ou réseau
      console.debug(`Image non disponible pour le produit ${productId}`)
    } finally {
      setIsImageLoading(false)
    }
  }

  // Formatte proprement l'adresse en mettant le code postal + ville à la ligne
  const renderFormattedAddress = (address) => {
    if (!address || typeof address !== 'string') {
      return 'Non renseignée'
    }
    const parts = address.split(',').map(p => p.trim()).filter(Boolean)
    if (parts.length >= 2) {
      const streetPart = parts.slice(0, -1).join(', ')
      const zipCityPart = parts[parts.length - 1]
      return (
        <span>
          <span>{highlightText(streetPart, searchTerm)}</span>
          <br />
          <span>{highlightText(zipCityPart, searchTerm)}</span>
        </span>
      )
    }
    return <span>{highlightText(address, searchTerm)}</span>
  }

  // Fonction simple de surlignage
  const highlightText = (text, searchTerm) => {
    if (!searchTerm || !text) {
      return text
    }
    
    const term = searchTerm.toLowerCase().trim()
    const source = text.toLowerCase()
    
    if (source.includes(term)) {
      const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
      return parts.map((part, i) => 
        part.toLowerCase() === term ? 
          <span key={i} className="highlight-accent">{part}</span> : 
          <span key={i}>{part}</span>
      )
    }
    
    return text
  }

  return (
    <div 
      className={`group relative bg-white rounded-3xl overflow-visible shadow-lg h-[420px] ${isHighlighted ? `border-2 border-accent${searchTerm ? '' : ' animate-pink-blink'}` : ''}`}
      style={{ 
        animationName: searchTerm ? 'none' : 'fadeInUp',
        animationDuration: searchTerm ? '0s' : '0.6s',
        animationTimingFunction: searchTerm ? undefined : 'ease-out',
        animationFillMode: searchTerm ? undefined : 'forwards',
        animationDelay: searchTerm ? '0ms' : `${index * 150}ms`
      }}
    >
      {/* Image de fond avec overlay moderne */}
      <div className="relative h-60 overflow-hidden">
        {/* Image de base */}
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={article.product_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center">
            {isImageLoading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-transparent"></div>
            ) : (
              <div className="text-6xl text-slate-500">📦</div>
            )}
          </div>
        )}
        
        {/* Bouton lien vers la commande complète */}
        <a
          href={`https://maisoncleo.com/wp-admin/post.php?post=${article.orderNumber}&action=edit`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 z-30 inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/40 bg-black/30 text-white/90 hover:bg-black/50 hover:border-white/60 backdrop-blur-sm"
          title="Voir la commande complète"
          aria-label="Voir la commande complète"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 3h7v7" />
            <path d="M10 14L21 3" />
            <path d="M21 14v7h-7" />
            <path d="M3 10l11 11" />
          </svg>
        </a>
        
        {/* Overlay gradient moderne */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none"></div>
        
        {/* Numéro de commande - bien visible en haut à gauche */}
        <div className="absolute top-4 left-4 px-4 py-2 rounded-lg bg-black/25 backdrop-blur-sm text-white text-lg font-bold z-20">
          #{article.orderNumber}
        </div>
        
        {/* Icône d'information client sur le bord gauche */}
        <div className="absolute left-4 top-20 z-40 pointer-events-auto">
          <button
            onClick={handleOverlayToggle}
            className={`w-10 h-10 rounded-full flex items-center justify-center border border-white/30 bg-transparent text-white/90 hover:bg-white/90 hover:text-black hover:border-white focus:outline-none focus:ring-2 focus:ring-white/40 transition-all duration-200 ${
              isOverlayOpen ? 'bg-white/90 text-black border-white ring-2 ring-white/60' : ''
            }`}
            aria-label="Informations client"
            title="Informations client"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="w-5 h-5"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Zone d'informations dynamique en bas */}
      <div className="h-24 bg-white/95 backdrop-blur-md transition-all duration-300">
        <div className="p-4">
          {/* Informations principales pour tricoteuses */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-gray-900 line-clamp-1">
              {highlightText(article.product_name, searchTerm)}
            </h3>
            <div className="grid grid-cols-3 gap-3 text-base text-gray-700">
              <div className="text-center">
                <div className="text-sm text-gray-500">Quantité</div>
                <div className="text-lg font-semibold">{article.quantity}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Taille</div>
                <div className="text-lg font-semibold">{getArticleSize(article.meta_data)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Couleur</div>
                <div className="text-lg font-semibold">{getArticleColor(article.meta_data) !== 'Non spécifiée' ? getArticleColor(article.meta_data) : 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Date / heure / note */}
      <div className="absolute bottom-0 left-0 p-3 z-10">
        <div className="flex items-center space-x-2 text-xs text-gray-500 font-medium">
          <span className="bg-gray-100 px-2 py-1 rounded-md">
            {article.orderDate ? format(new Date(article.orderDate), 'dd/MM', { locale: fr }) : 'N/A'}
          </span>
          <span className="bg-gray-100 px-2 py-1 rounded-md">
            {article.orderDate ? format(new Date(article.orderDate), 'HH:mm', { locale: fr }) : 'N/A'}
          </span>
          {article.customerNote && (
            <>
              <button
                type="button"
                onClick={() => { window.dispatchEvent(new Event('mc-close-notes')); setIsNoteOpen(v => !v) }}
                ref={noteBtnRef}
                className={`inline-flex items-center px-2 py-1 rounded-md border text-amber-800 hover:bg-amber-100 ${isNoteOpen ? 'bg-amber-200 border-amber-300' : 'bg-amber-50 border-amber-200'}`}
                aria-haspopup="dialog"
                aria-expanded={isNoteOpen}
                aria-label="Afficher la note"
              >
                <span className="mr-1">📝</span>
                Note
              </button>
            </>
          )}
        </div>
      </div>

      {/* Overlay client affiché instantanément sans transition */}
      {isOverlayOpen && (
        <div 
          className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative h-full p-6 flex flex-col">
            <button
              onClick={handleOverlayToggle}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-4xl font-light hover:font-bold w-8 h-8 flex items-center justify-center"
              aria-label="Fermer"
              title="Fermer"
            >
              ×
            </button>
            
            {/* Feedback de copie */}
            {copiedText && (
              <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm font-medium text-center">
                {copiedText}
              </div>
            )}
            
            <div className="space-y-4 pr-16 -ml-2">
              <div className="flex items-center space-x-3 w-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-7 h-7 text-gray-700 flex-shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20a8 8 0 0 1 16 0" />
                </svg>
                <div 
                  className="flex-1 min-w-0 text-base font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                  onClick={() => handleCopy(article.customer, 'Client copié !')}
                  title="Cliquer pour copier"
                >
                  {highlightText(article.customer, searchTerm)}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 w-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-7 h-7 text-gray-700 flex-shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                <div 
                  className="flex-1 min-w-0 text-base font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                  onClick={() => handleCopy(format(new Date(article.orderDate), 'dd/MM/yyyy', { locale: fr }), 'Date copiée !')}
                  title="Cliquer pour copier"
                >
                  {highlightText(format(new Date(article.orderDate), 'dd/MM/yyyy', { locale: fr }), searchTerm)}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 w-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-7 h-7 text-gray-800 flex-shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                  <path d="M3 19l6-6" />
                  <path d="M21 19l-6-6" />
                </svg>
                <div 
                  className="flex-1 min-w-0 text-base font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                  onClick={() => handleCopy(article.customerEmail || 'Non renseigné', 'Email copié !')}
                  title="Cliquer pour copier"
                >
                  {highlightText(article.customerEmail || 'Non renseigné', searchTerm)}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 w-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-7 h-7 text-gray-700 flex-shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4 1.1h2a2 2 0 0 1 2 1.72c.12.9.33 1.77.61 2.61a2 2 0 0 1-.45 2.11L7 8.09a16 16 0 0 0 6 6l.55-.76a2 2 0 0 1 2.11-.45c.84.28 1.71.49 2.61.61A2 2 0 0 1 22 16.92z" />
                </svg>
                <div 
                  className="flex-1 min-w-0 text-base font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                  onClick={() => handleCopy(article.customerPhone || 'Non renseigné', 'Téléphone copié !')}
                  title="Cliquer pour copier"
                >
                  {highlightText(article.customerPhone || 'Non renseigné', searchTerm)}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 w-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-7 h-7 text-gray-700 flex-shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 10.5L12 3l9 7.5" />
                  <path d="M5 10v10h14V10" />
                  <path d="M9 20v-6h6v6" />
                </svg>
                <div 
                  className="flex-1 min-w-0 text-base font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                  onClick={() => handleCopy(article.customerAddress || 'Non renseignée', 'Adresse copiée !')}
                  title="Cliquer pour copier"
                >
                  {renderFormattedAddress(article.customerAddress)}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 w-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-7 h-7 text-gray-700 flex-shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7h11v8H3z" />
                  <path d="M14 10h4l3 3v2h-7z" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
                <div 
                  className="flex-1 min-w-0 text-base font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors whitespace-nowrap"
                  onClick={() => handleCopy(article.shippingMethod || 'Non renseigné', 'Transporteur copié !')}
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
      )}

      {/* Effet de brillance au survol */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform -skew-x-12 -translate-x-full group-hover:translate-x-full pointer-events-none"></div>

      {/* Popover global de note, pleine largeur de la carte */}
      {isNoteOpen && article.customerNote && (
        <>
          <div className="absolute left-0 right-0 bottom-20 px-3 z-50">
            <div ref={notePopoverRef} className="w-full max-h-80 overflow-auto bg-amber-50 border border-amber-200 rounded-xl shadow-xl p-4 pt-9 text-amber-900 transform -rotate-1">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 text-2xl select-none drop-shadow-sm">📌</div>
              <div className="flex items-start justify-end mb-2 relative">
                <button
                  type="button"
                  onClick={() => setIsNoteOpen(false)}
                  className="text-4xl absolute -top-8 -right-2 text-amber-500 hover:text-amber-700"
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {article.customerNote}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
})

export default ArticleCard
