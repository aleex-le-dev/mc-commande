/**
 * Service de cache HTTP centralisé
 * Gère le cache mémoire et persistant pour les requêtes HTTP
 */

// Limiteur optimisé + retry/backoff pour réduire les erreurs réseau
let concurrentRequests = 0
const MAX_CONCURRENT = 1  // Une seule requête à la fois pour Render très lent
const waitQueue = []

const acquireSlot = () => new Promise((resolve) => {
  if (concurrentRequests < MAX_CONCURRENT) {
    concurrentRequests += 1
    // Délai entre les requêtes pour éviter de surcharger Render
    setTimeout(resolve, 200)
  } else {
    waitQueue.push(resolve)
  }
})

const releaseSlot = () => {
  concurrentRequests = Math.max(0, concurrentRequests - 1)
  const next = waitQueue.shift()
  if (next) {
    concurrentRequests += 1
    next()
  }
}

// Cache mémoire global avec TTL pour données partagées (augmenté pour Render)
const GLOBAL_CACHE_TTL_MS = import.meta.env.DEV ? 5 * 60 * 1000 : 60 * 60 * 1000 // 5min dev, 60min prod (1 heure)
const globalCache = {
  tricoteuses: { data: null, at: 0 },
  assignments: { data: null, at: 0 },
  orders: { data: null, at: 0 }
}

function cacheGet(key) {
  const entry = globalCache[key]
  if (!entry) return null
  if (Date.now() - entry.at > GLOBAL_CACHE_TTL_MS) return null
  return entry.data
}

function cacheSet(key, data) {
  globalCache[key] = { data, at: Date.now() }
}

function cacheDelete(key) {
  delete globalCache[key]
}

function persistentCacheGet(key) {
  try {
    const cached = localStorage.getItem(`mongodb_${key}`)
    if (!cached) return null
    
    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()
    const ttl = import.meta.env.DEV ? 5 * 60 * 1000 : 60 * 60 * 1000 // 5min dev, 60min prod
    
    if (now - timestamp > ttl) {
      localStorage.removeItem(`mongodb_${key}`)
      return null
    }
    
    return data
  } catch (error) {
    console.warn('Erreur lecture cache persistant:', error)
    return null
  }
}

function persistentCacheSet(key, data) {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(`mongodb_${key}`, JSON.stringify(cacheData))
  } catch (error) {
    console.warn('Erreur écriture cache persistant:', error)
  }
}

/**
 * Effectue une requête HTTP avec retry et gestion d'erreurs
 */
export async function requestWithRetry(url, options = {}, retries = 0) {
  const maxRetries = 3
  const baseDelay = 1000
  
  try {
    await acquireSlot()
    
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    
    clearTimeout(timeout)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response
  } catch (error) {
    if (retries < maxRetries && (error.name === 'AbortError' || error.message.includes('Failed to fetch'))) {
      const delay = baseDelay * Math.pow(2, retries) + Math.random() * 1000
      console.warn(`Tentative ${retries + 1}/${maxRetries} échouée, retry dans ${delay}ms:`, error.message)
      await new Promise(resolve => setTimeout(resolve, delay))
      return requestWithRetry(url, options, retries + 1)
    }
    throw error
  } finally {
    releaseSlot()
  }
}

/**
 * Service de cache centralisé
 */
export const HttpCacheService = {
  // Cache mémoire
  get: cacheGet,
  set: cacheSet,
  delete: cacheDelete,
  
  // Cache persistant
  getPersistent: persistentCacheGet,
  setPersistent: persistentCacheSet,
  
  // Gestion des slots
  acquireSlot,
  releaseSlot,
  
  // Nettoyage
  clearAll: () => {
    Object.keys(globalCache).forEach(key => delete globalCache[key])
    // Nettoyer aussi le localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('mongodb_')) {
        localStorage.removeItem(key)
      }
    })
  },
  
  // Statistiques
  getStats: () => ({
    memoryKeys: Object.keys(globalCache),
    memorySize: Object.keys(globalCache).length,
    persistentKeys: Object.keys(localStorage).filter(key => key.startsWith('mongodb_')),
    persistentSize: Object.keys(localStorage).filter(key => key.startsWith('mongodb_')).length
  })
}

export default HttpCacheService
