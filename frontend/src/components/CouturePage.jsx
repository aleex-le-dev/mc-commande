import React from 'react'
import ProductionPage from './ProductionPage'
import SmartImageLoader from './SmartImageLoader'

/**
 * Page Couture - Affiche tous les articles de type "couture"
 * Utilise le composant ProductionPage générique avec chargement intelligent des images
 */
const CouturePage = () => {
  return (
    <>
      <ProductionPage productionType="couture" title="Couture" />
      <SmartImageLoader 
        pageName="couture" 
        priority={false} 
      />
    </>
  )
}

export default CouturePage
