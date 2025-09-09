import React from 'react'
import ProductionPage from './ProductionPage'
import BatchImageLoader from './BatchImageLoader'

/**
 * Page Maille - Affiche tous les articles de type "maille"
 * Utilise le composant ProductionPage générique avec chargement en lot des images
 */
const MaillePage = () => {
  return (
    <>
      <ProductionPage productionType="maille" title="Maille" />
      <BatchImageLoader 
        articles={[]} // Sera rempli par ProductionPage
        pageName="maille" 
        priority={true} 
      />
    </>
  )
}

export default MaillePage
