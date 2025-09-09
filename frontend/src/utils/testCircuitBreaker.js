/**
 * Script de test pour vérifier le circuit breaker
 * Utilisez ce script dans la console du navigateur
 */

// Test du circuit breaker
window.testCircuitBreaker = async () => {
  console.log('🧪 Test du circuit breaker...')
  
  // Import du service
  const { HttpCacheService } = await import('../services/cache/httpCacheService.js')
  
  // Test 1: État initial
  console.log('📊 État initial:', HttpCacheService.getCircuitBreakerState())
  
  // Test 2: Requête normale
  try {
    const response = await HttpCacheService.requestWithRetry('http://localhost:3001/api/health')
    console.log('✅ Requête normale réussie:', response.status)
  } catch (error) {
    console.log('❌ Requête normale échouée:', error.message)
  }
  
  // Test 3: Simulation d'erreurs serveur (500+)
  console.log('🔄 Simulation d\'erreurs serveur...')
  for (let i = 0; i < 25; i++) {
    try {
      // Simuler une erreur 500
      const response = await fetch('http://localhost:3001/api/nonexistent')
      if (response.status >= 500) {
        console.log(`Erreur serveur ${i + 1}:`, response.status)
      }
    } catch (error) {
      console.log(`Erreur réseau ${i + 1}:`, error.message)
    }
  }
  
  // Test 4: État après erreurs
  console.log('📊 État après erreurs:', HttpCacheService.getCircuitBreakerState())
  
  // Test 5: Test de fallback
  try {
    const response = await HttpCacheService.requestWithRetry('http://localhost:3001/api/assignments')
    const data = await response.json()
    console.log('✅ Fallback fonctionne:', data)
  } catch (error) {
    console.log('❌ Fallback échoué:', error.message)
  }
  
  // Test 6: Réinitialisation
  console.log('🔄 Réinitialisation du circuit breaker...')
  HttpCacheService.resetCircuitBreaker()
  console.log('📊 État après reset:', HttpCacheService.getCircuitBreakerState())
  
  console.log('✅ Test terminé!')
}

// Test des métriques
window.testMetrics = async () => {
  console.log('📊 Test des métriques...')
  
  const { HttpCacheService } = await import('../services/cache/httpCacheService.js')
  
  // Afficher les métriques
  HttpCacheService.logPerformanceMetrics()
  
  // Afficher l'état du circuit breaker
  console.log('Circuit Breaker:', HttpCacheService.getCircuitBreakerState())
  
  // Afficher l'état du cache
  console.log('Cache:', HttpCacheService.getCacheInfo())
}

// Test de réinitialisation automatique
window.testAutoReset = async () => {
  console.log('🔄 Test de réinitialisation automatique...')
  
  const { HttpCacheService } = await import('../services/cache/httpCacheService.js')
  
  // Forcer l'ouverture du circuit breaker
  for (let i = 0; i < 25; i++) {
    HttpCacheService.recordFailure('serverError')
  }
  
  console.log('Circuit breaker forcé ouvert:', HttpCacheService.getCircuitBreakerState())
  
  // Attendre et tester la réinitialisation automatique
  setTimeout(() => {
    HttpCacheService.autoResetCircuitBreaker()
    console.log('Après auto-reset:', HttpCacheService.getCircuitBreakerState())
  }, 5000)
}

console.log('🧪 Scripts de test chargés!')
console.log('Utilisez testCircuitBreaker() pour tester le circuit breaker')
console.log('Utilisez testMetrics() pour voir les métriques')
console.log('Utilisez testAutoReset() pour tester la réinitialisation automatique')
