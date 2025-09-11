import React from 'react'
import ProductionPage from './ProductionPage'

/**
 * Page Maille - Affiche tous les articles de type "maille"
 * Utilise le composant ProductionPage générique avec chargement intelligent des images
 */
const MaillePage = () => {
  return (
    <>
      <ProductionPage productionType="maille" title="Maille" />
      {/* Temporairement désactivé - erreurs 502 sur Render */}
    </>
  )
}

export default MaillePage
