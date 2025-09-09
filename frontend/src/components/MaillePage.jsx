import React from 'react'
import ProductionPage from './ProductionPage'
import SmartImageLoader from './SmartImageLoader'

/**
 * Page Maille - Affiche tous les articles de type "maille"
 * Utilise le composant ProductionPage générique avec chargement intelligent des images
 */
const MaillePage = () => {
  return (
    <>
      <ProductionPage productionType="maille" title="Maille" />
      <SmartImageLoader 
        pageName="maille" 
        priority={false} 
      />
    </>
  )
}

export default MaillePage
