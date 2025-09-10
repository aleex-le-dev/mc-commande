/**
 * Système de logging conditionnel
 * Affiche seulement les logs importants en production
 */

const isDevelopment = import.meta.env.DEV
const isProduction = import.meta.env.PROD

// Niveaux de log
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
}

// Configuration du niveau de log selon l'environnement
const getLogLevel = () => {
  if (isDevelopment) return LOG_LEVELS.DEBUG
  if (isProduction) return LOG_LEVELS.ERROR
  return LOG_LEVELS.INFO
}

const currentLogLevel = getLogLevel()

// Fonction de logging conditionnel
export const logger = {
  error: (message, ...args) => {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      console.error(`❌ ${message}`, ...args)
    }
  },
  
  warn: (message, ...args) => {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      console.warn(`⚠️ ${message}`, ...args)
    }
  },
  
  info: (message, ...args) => {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      console.log(`ℹ️ ${message}`, ...args)
    }
  },
  
  debug: (message, ...args) => {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      console.log(`🐛 ${message}`, ...args)
    }
  },
  
  // Logs spécifiques pour les services
  service: {
    start: (serviceName) => {
      // Logs de service désactivés pour éviter la pollution
      // if (isDevelopment) {
      //   console.log(`🔄 ${serviceName} démarré...`)
      // }
    },
    
    success: (serviceName, message = '') => {
      // Logs de succès désactivés pour éviter la pollution
      // if (isDevelopment) {
      //   console.log(`✅ ${serviceName} terminé ${message}`)
      // }
    },
    
    error: (serviceName, error) => {
      console.error(`❌ ${serviceName} erreur:`, error.message)
    }
  },
  
  // Logs pour les requêtes API
  api: {
    request: (url, method = 'GET') => {
      if (isDevelopment) {
        console.log(`🌐 API ${method} ${url}`)
      }
    },
    
    response: (url, status, time) => {
      if (isDevelopment) {
        const emoji = status >= 200 && status < 300 ? '✅' : '❌'
        console.log(`${emoji} API ${url} → ${status} (${time}ms)`)
      }
    },
    
    error: (url, error) => {
      console.error(`❌ API ${url} erreur:`, error.message)
    }
  },
  
  // Logs pour les performances
  performance: {
    start: (operation) => {
      if (isDevelopment) {
        console.log(`⏱️ ${operation} démarré...`)
      }
    },
    
    end: (operation, time) => {
      if (isDevelopment) {
        console.log(`⏱️ ${operation} terminé en ${time}ms`)
      }
    }
  }
}

// Fonction pour désactiver tous les logs (mode silencieux)
export const setSilentMode = (silent = true) => {
  if (silent) {
    console.log = () => {}
    console.warn = () => {}
    console.info = () => {}
    console.debug = () => {}
  }
}

// Fonction pour réactiver les logs
export const setVerboseMode = () => {
  // Restaurer les fonctions console originales
  // (en production, on ne peut pas les restaurer complètement)
  if (isDevelopment) {
    console.log = console.log.bind(console)
    console.warn = console.warn.bind(console)
    console.info = console.info.bind(console)
    console.debug = console.debug.bind(console)
  }
}

export default logger
