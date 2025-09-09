import React, { useEffect } from 'react'

/**
 * Optimiseur spécifique pour appareils lents
 * Désactive les fonctionnalités non essentielles pour améliorer les performances
 */
const SlowDeviceOptimizer = ({ children }) => {
  useEffect(() => {
    // Détecter si l'appareil est lent
    const isSlowDevice = () => {
      if (typeof navigator === 'undefined') return false
      
      // Vérifier la mémoire
      if (navigator.deviceMemory && navigator.deviceMemory < 4) return true
      
      // Vérifier la connexion
      if (navigator.connection) {
        const connection = navigator.connection
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') return true
        if (connection.downlink < 1) return true
      }
      
      return false
    }

    if (isSlowDevice()) {
      console.log('🐌 Appareil lent détecté - optimisations activées')
      
      // Désactiver les animations complexes
      document.documentElement.style.setProperty('--animation-duration', '0.01ms')
      
      // Réduire la qualité des images
      document.documentElement.style.setProperty('--image-quality', '0.6')
      
      // Désactiver les effets de hover complexes
      const style = document.createElement('style')
      style.textContent = `
        * {
          transition: none !important;
          animation-duration: 0.01ms !important;
        }
        
        .hover\\:scale-105:hover {
          transform: none !important;
        }
        
        .hover\\:scale-110:hover {
          transform: none !important;
        }
        
        .animate-spin {
          animation: none !important;
        }
        
        .animate-pulse {
          animation: none !important;
        }
        
        .animate-bounce {
          animation: none !important;
        }
        
        /* Réduire la qualité des images */
        img {
          image-rendering: optimizeSpeed;
          image-rendering: -moz-crisp-edges;
          image-rendering: -webkit-crisp-edges;
          image-rendering: pixelated;
        }
      `
      document.head.appendChild(style)
      
      // Optimiser les performances de scroll
      let ticking = false
      const optimizeScroll = () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            // Désactiver les animations pendant le scroll
            document.body.style.setProperty('--scroll-optimized', '1')
            ticking = false
          })
          ticking = true
        }
      }
      
      window.addEventListener('scroll', optimizeScroll, { passive: true })
      
      // Nettoyer à la destruction
      return () => {
        document.head.removeChild(style)
        window.removeEventListener('scroll', optimizeScroll)
      }
    }
  }, [])

  return <>{children}</>
}

export default SlowDeviceOptimizer
