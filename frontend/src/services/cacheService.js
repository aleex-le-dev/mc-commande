/**
 * Service de cache centralisé pour optimiser les performances
 * Gestion intelligente du cache mémoire et persistant
 */

// Configuration du cache
const CACHE_CONFIG = {
  // TTL pour le cache mémoire (en millisecondes)
  MEMORY_TTL: import.meta.env.DEV ? 5 * 60 * 1000 : 30 * 60 * 1000, // 5min dev, 30min prod
  
  // TTL pour le cache persistant (en millisecondes)
  PERSISTENT_TTL: 60 * 60 * 1000, // 1 heure
  
  // Taille maximale du cache mémoire
  MAX_MEMORY_SIZE: 100
}

// Clés de cache exportées
export const CACHE_KEYS = {
  ORDERS: 'orders',
  ASSIGNMENTS: 'assignments',
  TRICOTEUSES: 'tricoteuses',
  DELAI_CONFIG: 'delai_config',
  JOURS_FERIES: 'jours_feries'
}

// Cache mémoire global
const memoryCache = new Map()

// Limiteur de requêtes
let concurrentRequests = 0
const MAX_CONCURRENT = 1 // Une seule requête à la fois pour Render
const waitQueue = []

/**
 * Acquérir un slot pour une requête
 */
const acquireSlot = () => new Promise((resolve) => {
  if (concurrentRequests < MAX_CONCURRENT) {
    concurrentRequests += 1
    // Délai entre les requêtes pour éviter de surcharger Render
    setTimeout(resolve, 200)
  } else {
    waitQueue.push(resolve)
  }
})

/**
 * Libérer un slot après une requête
 */
const releaseSlot = () => {
  concurrentRequests = Math.max(0, concurrentRequests - 1)
  const next = waitQueue.shift()
  if (next) {
    concurrentRequests += 1
    next()
  }
}

/**
 * Vérifier si une entrée de cache est valide
 */
const isCacheValid = (entry, ttl) => {
  if (!entry) return false
  return Date.now() - entry.timestamp < ttl
}

/**
 * Nettoyer le cache mémoire si nécessaire
 */
const cleanMemoryCache = () => {
  if (memoryCache.size > CACHE_CONFIG.MAX_MEMORY_SIZE) {
    // Supprimer les entrées les plus anciennes
    const entries = Array.from(memoryCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    
    const toDelete = entries.slice(0, Math.floor(CACHE_CONFIG.MAX_MEMORY_SIZE / 2))
    toDelete.forEach(([key]) => memoryCache.delete(key))
  }
}

/**
 * Service de cache centralisé
 */
export const CacheService = {
  /**
   * Obtenir une valeur du cache mémoire
   */
  getMemory(key) {
    // Désactiver temporairement le cache pour diagnostic
    console.log(`🚫 Cache mémoire désactivé pour diagnostic: ${key}`)
    return null
    
    const entry = memoryCache.get(key)
    if (isCacheValid(entry, CACHE_CONFIG.MEMORY_TTL)) {
      console.log(`📦 Cache mémoire hit: ${key}`)
      return entry.data
    }
    
    if (entry) {
      memoryCache.delete(key)
    }
    return null
  },

  /**
   * Définir une valeur dans le cache mémoire
   */
  setMemory(key, data) {
    cleanMemoryCache()
    memoryCache.set(key, {
      data,
      timestamp: Date.now()
    })
    console.log(`📦 Cache mémoire set: ${key}`)
  },

  /**
   * Obtenir une valeur du cache persistant (sessionStorage)
   */
  getPersistent(key) {
    // Désactiver temporairement le cache pour diagnostic
    console.log(`🚫 Cache persistant désactivé pour diagnostic: ${key}`)
    return null
    
    try {
      const stored = sessionStorage.getItem(`cache_${key}`)
      if (!stored) return null
      
      const entry = JSON.parse(stored)
      if (isCacheValid(entry, CACHE_CONFIG.PERSISTENT_TTL)) {
        console.log(`💾 Cache persistant hit: ${key}`)
        return entry.data
      }
      
      sessionStorage.removeItem(`cache_${key}`)
      return null
    } catch (error) {
      console.warn(`Erreur lecture cache persistant ${key}:`, error)
      return null
    }
  },

  /**
   * Définir une valeur dans le cache persistant
   */
  setPersistent(key, data) {
    try {
      const entry = {
        data,
        timestamp: Date.now()
      }
      sessionStorage.setItem(`cache_${key}`, JSON.stringify(entry))
      console.log(`💾 Cache persistant set: ${key}`)
    } catch (error) {
      console.warn(`Erreur écriture cache persistant ${key}:`, error)
    }
  },

  /**
   * Obtenir une valeur (mémoire puis persistant)
   */
  get(key) {
    // Désactiver temporairement le cache pour forcer le rechargement
    console.log(`🚫 Cache désactivé pour diagnostic: ${key}`)
    return null
    
    return this.getMemory(key) || this.getPersistent(key)
  },

  /**
   * Définir une valeur (mémoire et persistant)
   */
  set(key, data) {
    this.setMemory(key, data)
    this.setPersistent(key, data)
  },

  /**
   * Supprimer une valeur des deux caches
   */
  delete(key) {
    memoryCache.delete(key)
    try {
      sessionStorage.removeItem(`cache_${key}`)
    } catch (error) {
      console.warn(`Erreur suppression cache persistant ${key}:`, error)
    }
    console.log(`🗑️ Cache supprimé: ${key}`)
  },

  /**
   * Vider tous les caches
   */
  clear() {
    memoryCache.clear()
    try {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('cache_')) {
          sessionStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('Erreur vidage cache persistant:', error)
    }
    console.log('🧹 Tous les caches vidés')
  },

  /**
   * Obtenir les statistiques du cache
   */
  getStats() {
    return {
      memorySize: memoryCache.size,
      memoryKeys: Array.from(memoryCache.keys()),
      persistentKeys: Object.keys(sessionStorage).filter(key => key.startsWith('cache_'))
    }
  },

  /**
   * Acquérir un slot pour une requête
   */
  acquireSlot,

  /**
   * Libérer un slot après une requête
   */
  releaseSlot
}

// Nettoyage automatique du cache toutes les 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of memoryCache.entries()) {
    if (!isCacheValid(entry, CACHE_CONFIG.MEMORY_TTL)) {
      memoryCache.delete(key)
    }
  }
}, 5 * 60 * 1000)

export default CacheService
