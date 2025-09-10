/**
 * Outils de développement - Seulement en mode développement
 * Ce fichier ne doit JAMAIS être importé automatiquement
 */

// Vérifier que nous sommes en développement
if (!import.meta.env.DEV) {
  console.warn('⚠️ devTools.js ne doit pas être chargé en production')
  export default {}
}

// Charger les outils de test seulement si demandé explicitement
export const loadDevTools = async () => {
  if (!import.meta.env.DEV) {
    console.warn('⚠️ Outils de développement non disponibles en production')
    return
  }

  try {
    // Charger les scripts de test
    await import('./circuitBreakerTest.js')
    await import('./testCircuitBreaker.js')
    
    console.log('🧪 Outils de développement chargés!')
    console.log('Utilisez testCircuitBreaker() pour tester le circuit breaker')
    console.log('Utilisez testMetrics() pour voir les métriques')
    console.log('Utilisez testAutoReset() pour tester la réinitialisation automatique')
  } catch (error) {
    console.error('Erreur chargement outils de développement:', error)
  }
}

// Fonction pour charger les outils depuis la console
if (import.meta.env.DEV) {
  window.loadDevTools = loadDevTools
  console.log('💡 Tapez loadDevTools() dans la console pour charger les outils de test')
}

export default {
  loadDevTools
}
