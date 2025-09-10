import React from 'react'
import usePerformanceOptimizer from '../hooks/usePerformanceOptimizer'

/**
 * Composant d'optimisation des performances globales
 * Utilise le hook spécialisé usePerformanceOptimizer
 */
const PerformanceOptimizer = ({ children }) => {
  // Utiliser le hook spécialisé pour l'optimisation des performances
  usePerformanceOptimizer()

  return <>{children}</>
}

export default PerformanceOptimizer
