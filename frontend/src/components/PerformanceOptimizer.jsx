import React, { useEffect, useRef } from 'react'
import { ImageOptimizationService } from '../services/imageOptimizationService'
import { initializePerformanceOptimizations } from '../utils/performanceUtils'

/**
 * Composant d'optimisation des performances globales
 * Gère le préchargement intelligent et la gestion mémoire
 */
const PerformanceOptimizer = ({ children, enablePreloading = true }) => {
  const cleanupIntervalRef = useRef(null)

  useEffect(() => {
    if (!enablePreloading) return

    // Initialiser les optimisations de performance
    initializePerformanceOptimizations()

    // Nettoyage périodique du cache
    cleanupIntervalRef.current = setInterval(() => {
      ImageOptimizationService.cleanupCache()
    }, 30000) // Toutes les 30 secondes

    // Préchargement des ressources critiques
    const preloadCriticalResources = () => {
      // Précharger le logo
      const logoUrl = '/logo-mc-blanc.png'
      ImageOptimizationService.preloadImage(logoUrl, true)
    }

    preloadCriticalResources()

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current)
      }
    }
  }, [enablePreloading])

  // Optimisations de performance globales
  useEffect(() => {
    // Désactiver les animations sur les appareils lents
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms')
    }

    // Optimiser les transitions CSS
    const style = document.createElement('style')
    style.textContent = `
      * {
        will-change: auto;
      }
      .animate-spin {
        animation-duration: 0.8s;
      }
      .animate-pulse {
        animation-duration: 1.5s;
      }
      .animate-bounce {
        animation-duration: 1s;
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return <>{children}</>
}

export default PerformanceOptimizer
