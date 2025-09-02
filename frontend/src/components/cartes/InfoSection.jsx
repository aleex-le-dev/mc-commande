import React from 'react'

// Section d'informations principales (titre, quantité, taille, couleur)
const InfoSection = ({
  article,
  translatedData,
  searchTerm,
  getArticleSize,
  getArticleColor
}) => {
  return (
    <div className="h-24 bg-white backdrop-blur-md transition-all duration-300 relative">
      <div className="p-3 pt-2 pb-16">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-gray-900 leading-tight">
            {(translatedData?.product_name || article.product_name)}
          </h3>
          <div className="grid gap-3 text-base text-gray-700" style={{ 
            gridTemplateColumns: `repeat(${[
              'quantity',
              (getArticleSize && getArticleSize(article.meta_data)) || (article.meta_data?.find(item => item.key === 'pa_taille')?.value) ? 'size' : null,
              (getArticleColor && getArticleColor(article.meta_data)) || (article.meta_data?.find(item => item.key === 'pa_couleur')?.value) ? 'color' : null
            ].filter(Boolean).length}, 1fr)`
          }}>
            <div className="text-center">
              <div className="text-sm text-gray-500">Quantité</div>
              <div className="text-lg font-semibold">{article.quantity}</div>
            </div>

            {((getArticleSize && getArticleSize(article.meta_data)) || (article.meta_data?.find(item => item.key === 'pa_taille')?.value)) && (
              <div className="text-center mb-6">
                <div className="text-sm text-gray-500">Taille</div>
                <div className="text-lg font-semibold">
                  {(getArticleSize && getArticleSize(article.meta_data)) || (article.meta_data?.find(item => item.key === 'pa_taille')?.value) || 'N/A'}
                </div>
              </div>
            )}

            {((getArticleColor && getArticleColor(article.meta_data)) || (article.meta_data?.find(item => item.key === 'pa_couleur')?.value)) && (
              <div className="text-center">
                <div className="text-sm text-gray-500">Couleur</div>
                <div className="text-lg font-semibold">
                  {(getArticleColor && getArticleColor(article.meta_data)) || (article.meta_data?.find(item => item.key === 'pa_couleur')?.value) || 'N/A'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default InfoSection


