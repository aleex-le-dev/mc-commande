/**
 * Gestionnaire centralisé des timeouts et intervalles
 * Évite les fuites mémoire en gérant automatiquement le cleanup
 */

class TimeoutManager {
  constructor() {
    this.timeouts = new Set()
    this.intervals = new Set()
    this.cleanupFunctions = new Set()
  }

  /**
   * Créer un timeout avec cleanup automatique
   */
  setTimeout(callback, delay) {
    const timeoutId = setTimeout(() => {
      this.timeouts.delete(timeoutId)
      callback()
    }, delay)
    
    this.timeouts.add(timeoutId)
    return timeoutId
  }

  /**
   * Créer un interval avec cleanup automatique
   */
  setInterval(callback, delay) {
    const intervalId = setInterval(callback, delay)
    this.intervals.add(intervalId)
    return intervalId
  }

  /**
   * Nettoyer un timeout spécifique
   */
  clearTimeout(timeoutId) {
    if (this.timeouts.has(timeoutId)) {
      clearTimeout(timeoutId)
      this.timeouts.delete(timeoutId)
    }
  }

  /**
   * Nettoyer un interval spécifique
   */
  clearInterval(intervalId) {
    if (this.intervals.has(intervalId)) {
      clearInterval(intervalId)
      this.intervals.delete(intervalId)
    }
  }

  /**
   * Enregistrer une fonction de cleanup
   */
  addCleanupFunction(cleanupFn) {
    this.cleanupFunctions.add(cleanupFn)
  }

  /**
   * Nettoyer tous les timeouts, intervalles et fonctions
   */
  cleanup() {
    // Nettoyer tous les timeouts
    this.timeouts.forEach(timeoutId => {
      clearTimeout(timeoutId)
    })
    this.timeouts.clear()

    // Nettoyer tous les intervalles
    this.intervals.forEach(intervalId => {
      clearInterval(intervalId)
    })
    this.intervals.clear()

    // Exécuter toutes les fonctions de cleanup
    this.cleanupFunctions.forEach(cleanupFn => {
      try {
        cleanupFn()
      } catch (error) {
        console.warn('Erreur lors du cleanup:', error)
      }
    })
    this.cleanupFunctions.clear()
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    return {
      activeTimeouts: this.timeouts.size,
      activeIntervals: this.intervals.size,
      cleanupFunctions: this.cleanupFunctions.size
    }
  }
}

// Instance globale
const timeoutManager = new TimeoutManager()

// Nettoyer automatiquement à la fermeture de la page
window.addEventListener('beforeunload', () => {
  timeoutManager.cleanup()
})

// Nettoyer automatiquement lors des changements de page (SPA)
window.addEventListener('popstate', () => {
  timeoutManager.cleanup()
})

export default timeoutManager

// Hook React pour utiliser le gestionnaire
export const useTimeoutManager = () => {
  const cleanup = () => {
    timeoutManager.cleanup()
  }

  return {
    setTimeout: timeoutManager.setTimeout.bind(timeoutManager),
    setInterval: timeoutManager.setInterval.bind(timeoutManager),
    clearTimeout: timeoutManager.clearTimeout.bind(timeoutManager),
    clearInterval: timeoutManager.clearInterval.bind(timeoutManager),
    addCleanupFunction: timeoutManager.addCleanupFunction.bind(timeoutManager),
    cleanup,
    getStats: timeoutManager.getStats.bind(timeoutManager)
  }
}
