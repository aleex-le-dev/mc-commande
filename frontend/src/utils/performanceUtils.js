/**
 * Utilitaires de performance pour l'optimisation Render
 * Gestion intelligente des ressources et du cache
 */

// Configuration des performances adaptative
export const PERFORMANCE_CONFIG = {
  // Limites de ressources (adaptatives)
  MAX_CONCURRENT_IMAGES: 6,
  MAX_CACHE_SIZE: 100,
  PRELOAD_BATCH_SIZE: 10,
  
  // Timeouts optimisés pour Render (adaptatifs)
  IMAGE_LOAD_TIMEOUT: 3000,
  API_CALL_TIMEOUT: 8000,
  PRELOAD_TIMEOUT: 5000,
  
  // Intervalles de nettoyage
  CACHE_CLEANUP_INTERVAL: 30000,
  MEMORY_CHECK_INTERVAL: 60000,
  
  // Seuils de performance
  MEMORY_WARNING_THRESHOLD: 0.8,
  PERFORMANCE_DEGRADATION_THRESHOLD: 0.6,
  
  // Configuration pour appareils lents
  SLOW_DEVICE_CONFIG: {
    MAX_CONCURRENT_IMAGES: 3,
    MAX_CACHE_SIZE: 50,
    API_CALL_TIMEOUT: 5000,
    IMAGE_LOAD_TIMEOUT: 2000,
    PRELOAD_TIMEOUT: 3000
  }
}

/**
 * Détecteur de performance du navigateur
 */
export const PerformanceDetector = {
  // Vérifier si l'appareil est lent
  isSlowDevice: () => {
    if (typeof navigator === 'undefined') return false
    
    // Vérifier la mémoire disponible
    if (navigator.deviceMemory && navigator.deviceMemory < 4) return true
    
    // Vérifier la connexion
    if (navigator.connection) {
      const connection = navigator.connection
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') return true
      if (connection.downlink < 1) return true
    }
    
    // Vérifier les préférences de mouvement réduit
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
    
    return false
  },

  // Obtenir le niveau de performance recommandé
  getPerformanceLevel: () => {
    if (PerformanceDetector.isSlowDevice()) return 'low'
    
    if (navigator.deviceMemory && navigator.deviceMemory >= 8) return 'high'
    if (navigator.deviceMemory && navigator.deviceMemory >= 4) return 'medium'
    
    return 'medium'
  },

  // Vérifier si on peut utiliser des animations complexes
  canUseComplexAnimations: () => {
    return !PerformanceDetector.isSlowDevice() && 
           !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
}

/**
 * Gestionnaire de mémoire intelligent
 */
export const MemoryManager = {
  // Surveiller l'utilisation mémoire
  monitorMemory: () => {
    if (!performance.memory) return null
    
    return {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
      usage: performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit
    }
  },

  // Vérifier si on approche des limites mémoire
  isMemoryPressure: () => {
    const memory = MemoryManager.monitorMemory()
    if (!memory) return false
    
    return memory.usage > PERFORMANCE_CONFIG.MEMORY_WARNING_THRESHOLD
  },

  // Nettoyer la mémoire si nécessaire
  cleanupIfNeeded: (cleanupCallback) => {
    if (MemoryManager.isMemoryPressure()) {
      console.log('🧹 Nettoyage mémoire nécessaire')
      if (cleanupCallback) cleanupCallback()
      
      // Forcer le garbage collection si disponible
      if (window.gc) {
        window.gc()
      }
    }
  }
}

/**
 * Optimiseur de requêtes réseau
 */
export const NetworkOptimizer = {
  // Créer une requête optimisée pour Render
  createOptimizedRequest: (url, options = {}) => {
    const optimizedOptions = {
      ...options,
      headers: {
        'Cache-Control': 'max-age=300',
        'Connection': 'keep-alive',
        ...options.headers
      },
      // Optimisations pour Render
      keepalive: true,
      priority: 'high'
    }

    return fetch(url, optimizedOptions)
  },

  // Gérer les timeouts avec retry
  withRetry: async (requestFn, maxRetries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn()
      } catch (error) {
        if (attempt === maxRetries) throw error
        
        console.warn(`Tentative ${attempt} échouée, retry dans ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
      }
    }
  }
}

/**
 * Gestionnaire de cache intelligent
 */
export const SmartCache = {
  caches: new Map(),
  
  // Créer un cache avec TTL
  create: (name, ttl = 300000) => { // 5 minutes par défaut
    SmartCache.caches.set(name, {
      data: new Map(),
      ttl,
      timestamps: new Map()
    })
  },

  // Mettre en cache avec TTL
  set: (cacheName, key, value) => {
    const cache = SmartCache.caches.get(cacheName)
    if (!cache) return

    cache.data.set(key, value)
    cache.timestamps.set(key, Date.now())
  },

  // Récupérer du cache
  get: (cacheName, key) => {
    const cache = SmartCache.caches.get(cacheName)
    if (!cache) return null

    const timestamp = cache.timestamps.get(key)
    if (!timestamp) return null

    // Vérifier TTL
    if (Date.now() - timestamp > cache.ttl) {
      cache.data.delete(key)
      cache.timestamps.delete(key)
      return null
    }

    return cache.data.get(key)
  },

  // Nettoyer les entrées expirées
  cleanup: (cacheName) => {
    const cache = SmartCache.caches.get(cacheName)
    if (!cache) return

    const now = Date.now()
    for (const [key, timestamp] of cache.timestamps.entries()) {
      if (now - timestamp > cache.ttl) {
        cache.data.delete(key)
        cache.timestamps.delete(key)
      }
    }
  },

  // Vider un cache
  clear: (cacheName) => {
    const cache = SmartCache.caches.get(cacheName)
    if (cache) {
      cache.data.clear()
      cache.timestamps.clear()
    }
  }
}

/**
 * Initialiser les optimisations de performance
 */
export const initializePerformanceOptimizations = () => {
  // Créer les caches nécessaires
  SmartCache.create('images', 600000) // 10 minutes
  SmartCache.create('api', 300000)    // 5 minutes
  
  // Détecter le niveau de performance
  const performanceLevel = PerformanceDetector.getPerformanceLevel()
  const isSlowDevice = PerformanceDetector.isSlowDevice()
  
  console.log(`🚀 Niveau de performance détecté: ${performanceLevel}`)
  if (isSlowDevice) {
    console.log('🐌 Appareil lent détecté - optimisations activées')
  }
  
  // Ajuster les configurations selon le niveau
  if (performanceLevel === 'low' || isSlowDevice) {
    Object.assign(PERFORMANCE_CONFIG, PERFORMANCE_CONFIG.SLOW_DEVICE_CONFIG)
    console.log('⚡ Configuration optimisée pour appareil lent')
  } else if (performanceLevel === 'high') {
    PERFORMANCE_CONFIG.MAX_CONCURRENT_IMAGES = 10
    PERFORMANCE_CONFIG.MAX_CACHE_SIZE = 200
  }
  
  // Désactiver les animations complexes si nécessaire
  if (!PerformanceDetector.canUseComplexAnimations()) {
    document.documentElement.style.setProperty('--animation-duration', '0.01ms')
    console.log('🎨 Animations réduites activées')
  }
  
  // Surveiller la mémoire
  setInterval(() => {
    MemoryManager.cleanupIfNeeded(() => {
      // Nettoyer les caches
      SmartCache.cleanup('images')
      SmartCache.cleanup('api')
    })
  }, PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL)
  
  // Optimisations spécifiques pour appareils lents
  if (isSlowDevice) {
    // Réduire la fréquence de nettoyage
    setInterval(() => {
      SmartCache.cleanup('images')
      SmartCache.cleanup('api')
    }, 15000) // Toutes les 15 secondes au lieu de 30
  }
}

export default {
  PERFORMANCE_CONFIG,
  PerformanceDetector,
  MemoryManager,
  NetworkOptimizer,
  SmartCache,
  initializePerformanceOptimizations
}
