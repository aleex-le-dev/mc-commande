/**
 * Service de monitoring des performances
 * Surveille les métriques de performance et la santé du serveur
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      errors: {
        timeouts: 0,
        networkErrors: 0,
        serverErrors: 0
      },
      serverHealth: {
        status: 'unknown',
        lastCheck: null,
        responseTime: 0
      }
    }
    
    this.responseTimes = []
    this.maxResponseTimes = 50 // Garder seulement les 50 dernières mesures
  }

  /**
   * Enregistrer une requête
   */
  recordRequest(success, responseTime, errorType = null) {
    this.metrics.requests.total++
    
    if (success) {
      this.metrics.requests.successful++
    } else {
      this.metrics.requests.failed++
      
      if (errorType) {
        this.metrics.errors[errorType] = (this.metrics.errors[errorType] || 0) + 1
      }
    }
    
    // Calculer le temps de réponse moyen
    if (responseTime) {
      this.responseTimes.push(responseTime)
      if (this.responseTimes.length > this.maxResponseTimes) {
        this.responseTimes.shift()
      }
      
      this.metrics.requests.averageResponseTime = 
        this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
    }
  }

  /**
   * Enregistrer un hit/miss de cache
   */
  recordCache(hit) {
    if (hit) {
      this.metrics.cache.hits++
    } else {
      this.metrics.cache.misses++
    }
    
    const total = this.metrics.cache.hits + this.metrics.cache.misses
    this.metrics.cache.hitRate = total > 0 ? (this.metrics.cache.hits / total) * 100 : 0
  }

  /**
   * Vérifier la santé du serveur
   */
  async checkServerHealth() {
    const startTime = Date.now()
    
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5s timeout pour le health check
      })
      
      const responseTime = Date.now() - startTime
      
      this.metrics.serverHealth = {
        status: response.ok ? 'healthy' : 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: responseTime
      }
      
      return response.ok
    } catch (error) {
      const responseTime = Date.now() - startTime
      
      this.metrics.serverHealth = {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: responseTime
      }
      
      return false
    }
  }

  /**
   * Obtenir les métriques actuelles
   */
  getMetrics() {
    return {
      ...this.metrics,
      performance: {
        successRate: this.metrics.requests.total > 0 
          ? (this.metrics.requests.successful / this.metrics.requests.total) * 100 
          : 0,
        averageResponseTime: Math.round(this.metrics.requests.averageResponseTime),
        cacheHitRate: Math.round(this.metrics.cache.hitRate * 100) / 100
      }
    }
  }

  /**
   * Obtenir un rapport de performance
   */
  getPerformanceReport() {
    const metrics = this.getMetrics()
    
    return {
      summary: {
        totalRequests: metrics.requests.total,
        successRate: `${metrics.performance.successRate.toFixed(1)}%`,
        averageResponseTime: `${metrics.performance.averageResponseTime}ms`,
        cacheHitRate: `${metrics.performance.cacheHitRate}%`,
        serverStatus: metrics.serverHealth.status
      },
      details: metrics
    }
  }

  /**
   * Réinitialiser les métriques
   */
  reset() {
    this.metrics = {
      requests: { total: 0, successful: 0, failed: 0, averageResponseTime: 0 },
      cache: { hits: 0, misses: 0, hitRate: 0 },
      errors: { timeouts: 0, networkErrors: 0, serverErrors: 0 },
      serverHealth: { status: 'unknown', lastCheck: null, responseTime: 0 }
    }
    this.responseTimes = []
  }

  /**
   * Afficher les métriques dans la console
   */
  logMetrics() {
    const report = this.getPerformanceReport()
    console.log('📊 === RAPPORT DE PERFORMANCE ===')
    console.log('📈 Requêtes:', report.summary.totalRequests)
    console.log('✅ Taux de succès:', report.summary.successRate)
    console.log('⏱️ Temps de réponse moyen:', report.summary.averageResponseTime)
    console.log('💾 Taux de cache:', report.summary.cacheHitRate)
    console.log('🖥️ État serveur:', report.summary.serverStatus)
    console.log('================================')
  }
}

// Instance singleton
const performanceMonitor = new PerformanceMonitor()

export default performanceMonitor
