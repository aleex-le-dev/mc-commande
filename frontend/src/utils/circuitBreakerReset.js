/**
 * Utilitaire pour réinitialiser le circuit breaker
 * Permet de forcer la réinitialisation du circuit breaker depuis la console
 */

import { HttpCacheService } from '../services/cache/httpCacheService.js'

/**
 * Réinitialise le circuit breaker manuellement
 */
export function resetCircuitBreaker() {
  HttpCacheService.resetCircuitBreaker()
  console.log('🔄 Circuit breaker réinitialisé manuellement')
}

/**
 * Affiche l'état actuel du circuit breaker
 */
export function getCircuitBreakerStatus() {
  const status = HttpCacheService.getCircuitBreakerState()
  console.log('📊 État du circuit breaker:', status)
  return status
}

/**
 * Teste la connectivité avec le backend
 */
export async function testBackendConnection() {
  try {
    const response = await fetch('/api/health')
    if (response.ok) {
      console.log('✅ Backend accessible')
      return true
    } else {
      console.log('❌ Backend répond mais avec erreur:', response.status)
      return false
    }
  } catch (error) {
    console.log('❌ Backend inaccessible:', error.message)
    return false
  }
}

/**
 * Force la réinitialisation complète du circuit breaker
 */
export function forceResetCircuitBreaker() {
  HttpCacheService.resetCircuitBreaker()
  console.log('🔄 Circuit breaker forcé à la réinitialisation')
  
  // Afficher l'état après reset
  const status = HttpCacheService.getCircuitBreakerState()
  console.log('📊 Nouvel état:', status)
}

/**
 * Désactive complètement le circuit breaker
 */
export function disableCircuitBreaker() {
  // Forcer l'état à CLOSED et réinitialiser les compteurs
  HttpCacheService.resetCircuitBreaker()
  console.log('🚫 Circuit breaker désactivé - toutes les requêtes passeront')
}

// Exposer les fonctions globalement pour faciliter le debug
if (typeof window !== 'undefined') {
  window.resetCircuitBreaker = resetCircuitBreaker
  window.getCircuitBreakerStatus = getCircuitBreakerStatus
  window.testBackendConnection = testBackendConnection
  window.forceResetCircuitBreaker = forceResetCircuitBreaker
  window.disableCircuitBreaker = disableCircuitBreaker
}
