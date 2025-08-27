import React from 'react'
import PageLoader from './PageLoader'

/**
 * Composant LoadingSpinner - Alias pour PageLoader
 * Maintient la compatibilité avec le code existant
 */
const LoadingSpinner = ({ size = 'default', className = '' }) => {
  return <PageLoader size={size} className={className} />
}

export default LoadingSpinner
