/**
 * Hook spécialisé pour l'optimisation des performances
 * Responsabilité unique: gestion du cache persistant et des optimisations
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { HttpCacheService } from '../services/cache/httpCacheService'

export const usePerformanceOptimizer = () => {
  const [isOptimized, setIsOptimized] = useState(false)
  const [cacheStats, setCacheStats] = useState({ memory: 0, persistent: 0 })
  const [performanceMetrics, setPerformanceMetrics] = useState(null)
  const cleanupIntervalRef = useRef(null)

  // Optimiser les performances au montage
  useEffect(() => {
    const optimizePerformance = () => {
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
        /* Optimisations de performance */
        .grid {
          contain: layout style paint;
        }
        .card {
          contain: layout style paint;
        }
        img {
          image-rendering: optimizeSpeed;
          image-rendering: -moz-crisp-edges;
          image-rendering: -webkit-crisp-edges;
        }
      `
      document.head.appendChild(style)

      // Nettoyage périodique du cache
      cleanupIntervalRef.current = setInterval(() => {
        const stats = HttpCacheService.getStats()
        setCacheStats({
          memory: stats.memorySize,
          persistent: stats.persistentSize
        })
      }, 30000) // Toutes les 30 secondes

      setIsOptimized(true)
    }

    optimizePerformance()

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current)
      }
    }
  }, [])

  // Obtenir les métriques de performance
  const getPerformanceMetrics = useCallback(() => {
    const metrics = HttpCacheService.getPerformanceMetrics()
    setPerformanceMetrics(metrics)
    return metrics
  }, [])

  // Nettoyer le cache
  const clearCache = useCallback(() => {
    HttpCacheService.clearAll()
    setCacheStats({ memory: 0, persistent: 0 })
  }, [])

  // Optimiser le scroll
  const optimizeScroll = useCallback(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          // Désactiver les animations pendant le scroll
          document.body.style.setProperty('--scroll-optimized', '1')
          ticking = false
        })
        ticking = true
      }
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Précharger les ressources critiques
  const preloadCriticalResources = useCallback(() => {
    // Précharger le logo
    const logoUrl = '/logo-mc-blanc.png'
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = logoUrl
    document.head.appendChild(link)
  }, [])

  return {
    isOptimized,
    cacheStats,
    performanceMetrics,
    getPerformanceMetrics,
    clearCache,
    optimizeScroll,
    preloadCriticalResources
  }
}

export default usePerformanceOptimizer
