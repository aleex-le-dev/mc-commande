import React, { useState, useEffect } from 'react'
import { HttpCacheService } from '../services/cache/httpCacheService'

/**
 * Panneau de debug pour surveiller les performances et gérer le circuit breaker
 */
const DebugPanel = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [metrics, setMetrics] = useState(null)
  const [circuitBreakerState, setCircuitBreakerState] = useState(null)

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(HttpCacheService.getPerformanceMetrics())
      setCircuitBreakerState(HttpCacheService.getCircuitBreakerState())
    }

    updateMetrics()
    const interval = setInterval(updateMetrics, 2000) // Mise à jour toutes les 2 secondes

    return () => clearInterval(interval) // ✅ Cleanup déjà présent
  }, [])

  const resetCircuitBreaker = () => {
    HttpCacheService.resetCircuitBreaker()
    setCircuitBreakerState(HttpCacheService.getCircuitBreakerState())
  }

  const logMetrics = () => {
    HttpCacheService.logPerformanceMetrics()
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs z-50"
      >
        🐛 Debug
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold">🐛 Debug Panel</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {metrics && (
        <div className="space-y-2 text-xs">
          <div>
            <strong>Requêtes:</strong> {metrics.requests.total} 
            (✅ {metrics.requests.successful} | ❌ {metrics.requests.failed})
          </div>
          <div>
            <strong>Temps moyen:</strong> {Math.round(metrics.requests.averageResponseTime)}ms
          </div>
          <div>
            <strong>Cache hit rate:</strong> {metrics.performance.cacheHitRate.toFixed(1)}%
          </div>
          <div>
            <strong>Serveur:</strong> 
            <span className={`ml-1 px-2 py-1 rounded text-xs ${
              metrics.serverHealth.status === 'healthy' ? 'bg-green-600' : 'bg-red-600'
            }`}>
              {metrics.serverHealth.status}
            </span>
          </div>
        </div>
      )}

      {circuitBreakerState && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="text-xs">
            <strong>Circuit Breaker:</strong>
            <span className={`ml-1 px-2 py-1 rounded text-xs ${
              circuitBreakerState.state === 'CLOSED' ? 'bg-green-600' : 
              circuitBreakerState.state === 'OPEN' ? 'bg-red-600' : 'bg-yellow-600'
            }`}>
              {circuitBreakerState.state}
            </span>
          </div>
          <div className="text-xs mt-1">
            Échecs: {circuitBreakerState.failureCount}/{circuitBreakerState.threshold}
          </div>
          <div className="mt-2 space-x-2">
            <button
              onClick={resetCircuitBreaker}
              className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
            >
              🔄 Reset CB
            </button>
            <button
              onClick={() => {
                HttpCacheService.autoResetCircuitBreaker()
                setCircuitBreakerState(HttpCacheService.getCircuitBreakerState())
              }}
              className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs"
            >
              ⚡ Auto Reset
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-700">
        <button
          onClick={logMetrics}
          className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs mr-2"
        >
          📊 Log Metrics
        </button>
        <button
          onClick={() => {
            HttpCacheService.clearAll()
            window.location.reload()
          }}
          className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
        >
          🗑️ Clear Cache
        </button>
      </div>
    </div>
  )
}

export default DebugPanel
