/**
 * Script de test pour le circuit breaker
 * Utilisez ce script dans la console du navigateur pour tester
 */

// Test du circuit breaker - Seulement en développement
if (import.meta.env.DEV) {
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
  
  // Test 3: Simulation d'échecs
  console.log('🔄 Simulation d\'échecs...')
  for (let i = 0; i < 12; i++) {
    try {
      await HttpCacheService.requestWithRetry('http://localhost:3001/api/nonexistent')
    } catch (error) {
      console.log(`Échec ${i + 1}:`, error.message)
    }
  }
  
  // Test 4: État après échecs
  console.log('📊 État après échecs:', HttpCacheService.getCircuitBreakerState())
  
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
}

// Test des métriques - Seulement en développement
if (import.meta.env.DEV) {
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
}

// Logs de test supprimés - chargement manuel uniquement
