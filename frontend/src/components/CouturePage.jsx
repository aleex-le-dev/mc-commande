import React from 'react'
import ProductionPage from './ProductionPage'

/**
 * Page Couture - Affiche tous les articles de type "couture"
 * Utilise le composant ProductionPage générique avec chargement intelligent des images
 */
const CouturePage = () => {
  return (
    <>
      <ProductionPage productionType="couture" title="Couture" />
      {/* Temporairement désactivé - erreurs 502 sur Render */}
    </>
  )
}

export default CouturePage
