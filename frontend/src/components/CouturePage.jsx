import React from 'react'
import ProductionPage from './ProductionPage'
import BatchImageLoader from './BatchImageLoader'

/**
 * Page Couture - Affiche tous les articles de type "couture"
 * Utilise le composant ProductionPage générique avec chargement en lot des images
 */
const CouturePage = () => {
  return (
    <>
      <ProductionPage productionType="couture" title="Couture" />
      <BatchImageLoader 
        articles={[]} // Sera rempli par ProductionPage
        pageName="couture" 
        priority={true} 
      />
    </>
  )
}

export default CouturePage
