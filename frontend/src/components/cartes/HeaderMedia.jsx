import React from 'react'
import ImageLoader from './ImageLoader'
import TopBadges from './TopBadges'
import TranslationIcon from './TranslationIcon'

// En-tête média: image, badges, liens, overlay et actions latérales
const HeaderMedia = ({
  article,
  displayImageUrl,
  isImageLoading,
  isFromCache,
  imageUrl,
  memoizedProductId,
  setIsImageLoading,
  setImageUrl,
  imageService,
  doitAvoirTraitRouge,
  localAssignment,
  handleOverlayToggle,
  isOverlayOpen,
  handleTranslation,
  translatedData
}) => {
  return (
    <div className="relative h-60 overflow-hidden rounded-t-3xl">
      {displayImageUrl ? (
        <div className="relative">
          <ImageLoader 
            src={displayImageUrl} 
            alt={article.product_name}
            className="w-full h-full object-cover"
            fallback="📦"
            maxRetries={3}
            retryDelay={1000}
            onLoad={() => setIsImageLoading(false)}
            onError={(retryCount) => {
              if (retryCount >= 3) {
                setTimeout(() => {
                  if (memoizedProductId) {
                    const retryImage = imageService.getImage(memoizedProductId)
                    setImageUrl(retryImage)
                  }
                }, 1000)
              }
            }}
          />

          {/* Indicateur cache retiré */}

          {imageUrl && imageUrl.startsWith('data:image/') && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full shadow-lg z-10">🎨 Par défaut</div>
          )}
        </div>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center">
          {isImageLoading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-transparent"></div>
          ) : (
            <div className="text-center">
              <div className="text-4xl text-slate-500 mb-2">📦</div>
              <div className="text-sm text-slate-600">Aucune image</div>
            </div>
          )}
        </div>
      )}

      <TopBadges showRetard={doitAvoirTraitRouge} showUrgent={!!localAssignment?.urgent} />

      <a
        href={article.permalink || '#'}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => { if (!article.permalink) e.preventDefault() }}
        className="absolute inset-0 z-5 cursor-pointer"
        title="Voir la fiche produit"
        aria-label="Voir la fiche produit"
      />

      <a
        href={`https://maisoncleo.com/wp-admin/post.php?post=${article.orderNumber}&action=edit`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`absolute top-3 right-3 z-5 inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/30 bg-transparent text-white/90 hover:bg-white/90 hover:text-black hover:border-white focus:outline-none focus:ring-2 focus:ring-white/40 transition-all duration-200 backdrop-blur-sm dark:hover:bg-white/20 dark:hover:text-white`}
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

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none"></div>

      <div className="absolute top-4 left-4 px-4 py-2 rounded-lg bg-black/25 backdrop-blur-sm text-white text-lg font-bold z-5">#{article.orderNumber}</div>

      <div className="absolute left-4 top-20 z-5 pointer-events-auto">
        <button
          onClick={handleOverlayToggle}
          className={`w-10 h-10 rounded-full flex items-center justify-center border border-white/30 bg-transparent text-white/90 hover:bg-white/90 hover:text-black hover:border-white focus:outline-none focus:ring-2 focus:ring-white/40 transition-all duration-200 dark:hover:bg-white/20 dark:hover:text-white cursor-pointer ${
            isOverlayOpen ? 'bg-white/90 text-black border-white ring-2 ring-white/60' : ''
          }`}
          aria-label="Informations client"
          title="Informations client"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>
      </div>

      <div className="absolute left-4 top-32 z-5 pointer-events-auto">
        <TranslationIcon 
          article={article} 
          onTranslate={handleTranslation}
          isTranslated={!!translatedData}
        />
      </div>
    </div>
  )
}

export default HeaderMedia


