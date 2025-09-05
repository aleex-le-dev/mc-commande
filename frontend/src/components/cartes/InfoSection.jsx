import React from 'react'
import { highlightText } from '../../utils/textUtils.jsx'

// Fonction pour extraire la taille d'un article
const getArticleSize = (metaData) => {
  if (!metaData || !Array.isArray(metaData)) return null
  
  const sizeMeta = metaData.find(meta => 
    meta.key && (
      meta.key.toLowerCase().includes('taille') ||
      meta.key.toLowerCase().includes('size') ||
      meta.key.toLowerCase().includes('dimension') ||
      meta.key.toLowerCase().includes('pa_taille') ||
      meta.key.toLowerCase().includes('attribute_pa_taille') ||
      meta.key.toLowerCase().includes('_taille') ||
      meta.key.toLowerCase().includes('_size') ||
      meta.key === 'taille' ||
      meta.key === 'size' ||
      meta.key === 'pa_taille'
    )
  )
  
  return sizeMeta?.value?.trim() || null
}

// Fonction pour extraire la couleur d'un article
const getArticleColor = (metaData) => {
  if (!metaData || !Array.isArray(metaData)) return null
  
  const colorMeta = metaData.find(meta => 
    meta.key && (
      meta.key.toLowerCase().includes('couleur') ||
      meta.key.toLowerCase().includes('color') ||
      meta.key.toLowerCase().includes('pa_couleur') ||
      meta.key.toLowerCase().includes('attribute_pa_couleur') ||
      meta.key.toLowerCase().includes('_couleur') ||
      meta.key.toLowerCase().includes('_color') ||
      meta.key === 'couleur' ||
      meta.key === 'color' ||
      meta.key === 'pa_couleur'
    )
  )
  
  return colorMeta?.value?.trim() || null
}

// Section d'informations principales (titre, quantité, taille, couleur)
const InfoSection = ({
  article,
  searchTerm,
  compact = false
}) => {
  const articleSize = getArticleSize(article.meta_data)
  const articleColor = getArticleColor(article.meta_data)
  return (
    <div className={`${compact ? 'h-20' : 'h-24'} bg-white backdrop-blur-md transition-all duration-300 relative`}>
      <div className={`${compact ? 'px-2 pt-1.5 pb-12' : 'p-3 pt-2 pb-16'}`}>
        <div className="space-y-1">
          <h3 className={`${compact ? 'text-sm' : 'text-lg'} font-bold text-gray-900 leading-tight`}>
            {highlightText(article.product_name, searchTerm)}
          </h3>
          <div className={`grid ${compact ? 'gap-2 text-sm' : 'gap-3 text-base'} text-gray-700`} style={{ 
            gridTemplateColumns: `repeat(${[
              'quantity',
              articleSize ? 'size' : null,
              articleColor ? 'color' : null
            ].filter(Boolean).length}, 1fr)`
          }}>
            <div className="text-center">
              <div className={`${compact ? 'text-[11px]' : 'text-sm'} text-gray-500`}>Quantité</div>
              <div className={`${compact ? 'text-base' : 'text-lg'} font-semibold`}>{article.quantity}</div>
            </div>

            {articleSize && (
              <div className="text-center">
                <div className={`${compact ? 'text-[11px]' : 'text-sm'} text-gray-500`}>Taille</div>
                <div className={`${compact ? 'text-base' : 'text-lg'} font-semibold`}>{articleSize}</div>
              </div>
            )}

            {articleColor && (
              <div className="text-center">
                <div className={`${compact ? 'text-[11px]' : 'text-sm'} text-gray-500`}>Couleur</div>
                <div className={`${compact ? 'text-base' : 'text-lg'} font-semibold`}>{articleColor}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default InfoSection


