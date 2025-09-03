import React from 'react'
import ProductionPage from './ProductionPage'

/**
 * Page Maille - Affiche tous les articles de type "maille"
 * Utilise le composant ProductionPage générique
 */
const MaillePage = () => {
  return <ProductionPage productionType="maille" title="Maille" />
}

export default MaillePage
