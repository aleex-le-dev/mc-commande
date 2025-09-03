import React from 'react'
import ProductionPage from './ProductionPage'

/**
 * Page Couture - Affiche tous les articles de type "couture"
 * Utilise le composant ProductionPage générique
 */
const CouturePage = () => {
  return <ProductionPage productionType="couture" title="Couture" />
}

export default CouturePage
