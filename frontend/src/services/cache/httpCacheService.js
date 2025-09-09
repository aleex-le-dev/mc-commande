/**
 * Service de cache HTTP centralisé
 * Gère le cache mémoire et persistant pour les requêtes HTTP
 */

import performanceMonitor from '../performanceMonitor.js'

// Limiteur de requêtes intégré (pas d'import externe pour éviter les dépendances circulaires)
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

// Circuit breaker pour protéger contre les pannes serveur
let circuitBreakerState = 'CLOSED' // CLOSED, OPEN, HALF_OPEN
let failureCount = 0
let lastFailureTime = 0
const FAILURE_THRESHOLD = 50 // 50 échecs consécutifs (très peu agressif)
const RECOVERY_TIMEOUT = 2000 // 2 secondes avant de réessayer

/**
 * Obtenir des données de fallback selon l'endpoint
 */
const getFallbackData = (url) => {
  if (url.includes('/api/assignments')) {
    return { assignments: [] }
  }
  if (url.includes('/api/tricoteuses')) {
    return { tricoteuses: [] }
  }
  if (url.includes('/api/orders')) {
    return { orders: [], pagination: { page: 1, limit: 15, total: 0, totalPages: 0 } }
  }
  if (url.includes('/api/delais/configuration')) {
    return { configuration: { defaultDelay: 7, workingDays: [1, 2, 3, 4, 5] } }
  }
  if (url.includes('/api/delais/jours-feries')) {
    return { holidays: [] }
  }
  return null
}

/**
 * Vérifier l'état du circuit breaker
 */
const checkCircuitBreaker = () => {
  const now = Date.now()
  
  if (circuitBreakerState === 'OPEN') {
    if (now - lastFailureTime > RECOVERY_TIMEOUT) {
      circuitBreakerState = 'HALF_OPEN'
      console.log('🔄 Circuit breaker: passage en mode HALF_OPEN')
      return true
    }
    return false
  }
  
  return true
}

/**
 * Enregistrer un succès
 */
const recordSuccess = () => {
  if (circuitBreakerState === 'HALF_OPEN') {
    circuitBreakerState = 'CLOSED'
    failureCount = 0
    console.log('✅ Circuit breaker: fermé après succès')
  }
}

/**
 * Enregistrer un échec
 */
const recordFailure = (errorType = 'general') => {
  // Ne compter que les vraies erreurs serveur comme des échecs
  if (errorType === 'serverError') {
    failureCount++
    lastFailureTime = Date.now()
    
    if (failureCount >= FAILURE_THRESHOLD) {
      circuitBreakerState = 'OPEN'
      console.log('🚨 Circuit breaker: ouvert après', failureCount, 'échecs serveur')
    }
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
  if (!entry) {
    performanceMonitor.recordCache(false)
    return null
  }
  if (Date.now() - entry.at > GLOBAL_CACHE_TTL_MS) {
    performanceMonitor.recordCache(false)
    return null
  }
  performanceMonitor.recordCache(true)
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
    if (!cached) {
      performanceMonitor.recordCache(false)
      return null
    }
    
    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()
    const ttl = import.meta.env.DEV ? 5 * 60 * 1000 : 60 * 60 * 1000 // 5min dev, 60min prod
    
    if (now - timestamp > ttl) {
      localStorage.removeItem(`mongodb_${key}`)
      performanceMonitor.recordCache(false)
      return null
    }
    
    performanceMonitor.recordCache(true)
    return data
  } catch (error) {
    console.warn('Erreur lecture cache persistant:', error)
    performanceMonitor.recordCache(false)
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
  const startTime = Date.now()
  
  // Tentative de réinitialisation automatique du circuit breaker
  HttpCacheService.autoResetCircuitBreaker()
  
  // Vérifier le circuit breaker (désactivé temporairement)
  // if (!checkCircuitBreaker()) {
  //   console.log('🚫 Circuit breaker ouvert, utilisation du fallback:', url)
  //   performanceMonitor.recordRequest(false, Date.now() - startTime, 'circuitBreaker')
  //   
  //   // Essayer de récupérer depuis le cache persistant
  //   const cacheKey = url.split('/').pop() || 'fallback'
  //   const cachedData = persistentCacheGet(cacheKey)
  //   
  //   if (cachedData) {
  //     console.log('✅ Données récupérées depuis le cache de fallback')
  //     return {
  //       ok: true,
  //       json: () => Promise.resolve(cachedData),
  //       status: 200
  //     }
  //   }
  //   
  //   // Fallback avec données par défaut selon l'endpoint
  //   const fallbackData = getFallbackData(url)
  //   if (fallbackData) {
  //     console.log('✅ Utilisation des données par défaut pour:', url)
  //     return {
  //       ok: true,
  //       json: () => Promise.resolve(fallbackData),
  //       status: 200
  //     }
  //   }
  //   
  //   // Si pas de fallback, essayer quand même la requête
  //   console.log('⚠️ Pas de fallback disponible, tentative de requête directe')
  // }
  
  try {
    // Limiteur de requêtes temporairement désactivé
    // const slotAcquired = await acquireSlot()
    // if (!slotAcquired) {
    //   performanceMonitor.recordRequest(false, Date.now() - startTime, 'circuitBreaker')
    //   throw new Error('Limiteur de requêtes - requête bloquée')
    // }
    
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
    const responseTime = Date.now() - startTime
    
    if (!response.ok) {
      // Enregistrer l'erreur dans le monitoring
      const monitoringErrorType = response.status >= 500 ? 'serverErrors' : 'networkErrors'
      performanceMonitor.recordRequest(false, responseTime, monitoringErrorType)
      
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    // Enregistrer le succès dans le monitoring
    performanceMonitor.recordRequest(true, responseTime)
    
    return response
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    // Enregistrer l'erreur dans le monitoring
    let errorType = 'networkErrors'
    if (error.name === 'AbortError') {
      errorType = 'timeouts'
    }
    
    // Circuit breaker temporairement désactivé
    // if (errorType === 'timeouts') {
    //   recordFailure('serverError')
    // }
    
    performanceMonitor.recordRequest(false, responseTime, errorType)
    
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
  }),
  
  // Monitoring des performances
  getPerformanceMetrics: () => performanceMonitor.getMetrics(),
  getPerformanceReport: () => performanceMonitor.getPerformanceReport(),
  logPerformanceMetrics: () => performanceMonitor.logMetrics(),
  checkServerHealth: () => performanceMonitor.checkServerHealth(),
  
  // Gestion du circuit breaker
  resetCircuitBreaker: () => {
    circuitBreakerState = 'CLOSED'
    failureCount = 0
    lastFailureTime = 0
    console.log('🔄 Circuit breaker réinitialisé manuellement')
  },
  
  // Réinitialisation automatique du circuit breaker
  autoResetCircuitBreaker: () => {
    if (circuitBreakerState === 'OPEN' && Date.now() - lastFailureTime > 5000) {
      circuitBreakerState = 'CLOSED'
      failureCount = 0
      lastFailureTime = 0
      console.log('🔄 Circuit breaker réinitialisé automatiquement après 5s')
    }
  },
  
  getCircuitBreakerState: () => ({
    state: circuitBreakerState,
    failureCount,
    lastFailureTime,
    threshold: FAILURE_THRESHOLD,
    recoveryTimeout: RECOVERY_TIMEOUT
  })
}

export default HttpCacheService
