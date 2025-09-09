/**
 * Configuration centralisée des URLs API optimisée pour Render
 * Gestion intelligente des timeouts et retry automatique
 */

// Configuration des environnements optimisée pour Render
const API_CONFIG = {
  development: {
    backend: 'http://localhost:3001',
    description: 'Backend local',
    timeout: 10000,
    retryAttempts: 2
  },
  production: {
    // Backend Render (stable) avec optimisations
    backend: 'https://maisoncleo-commande.onrender.com',
    description: 'Backend Render (optimisé)',
    timeout: 60000, // Augmenté pour Render très lent
    retryAttempts: 3
  }
}

// Fonction pour obtenir l'URL du backend
export const getBackendUrl = () => {
  const env = import.meta.env.DEV ? 'development' : 'production'
  const config = API_CONFIG[env]
  
  console.log(`🔗 Backend: ${config.description} (${config.backend})`)
  return config.backend
}

// Fonction pour obtenir la configuration complète
export const getApiConfig = () => {
  const env = import.meta.env.DEV ? 'development' : 'production'
  return API_CONFIG[env]
}

// Fonction pour obtenir l'URL de l'API avec fallback automatique
export const getApiUrlWithFallback = (endpoint = '') => {
  const baseUrl = getBackendUrl()
  return `${baseUrl}/api${endpoint ? `/${endpoint}` : ''}`
}

// Fonction pour obtenir l'URL de l'API complète
export const getApiUrl = (endpoint = '') => {
  const baseUrl = getBackendUrl()
  return `${baseUrl}/api${endpoint ? `/${endpoint}` : ''}`
}

// Fonction pour tester la connectivité avec retry automatique
export const testBackendConnection = async () => {
  const config = getApiConfig()
  const backendUrl = getBackendUrl()
  
  for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), config.timeout)
      
      const response = await fetch(`${backendUrl}/api/health`, {
        method: 'GET',
        credentials: 'include',
        mode: 'cors',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        console.log(`✅ Backend Render connecté (tentative ${attempt})`)
        return { success: true, backend: backendUrl, attempt }
      } else {
        console.warn(`⚠️ Backend Render répond mais avec erreur (tentative ${attempt}):`, response.status)
        if (attempt === config.retryAttempts) {
          return { success: false, backend: backendUrl, attempt }
        }
      }
    } catch (error) {
      console.warn(`❌ Backend Render non accessible (tentative ${attempt}):`, error.message)
      if (attempt === config.retryAttempts) {
        return { success: false, backend: backendUrl, attempt, error: error.message }
      }
      // Attendre avant la prochaine tentative
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
  
  return { success: false, backend: backendUrl }
}

// Fonction pour faire des appels API avec retry automatique
export const apiCallWithRetry = async (endpoint, options = {}) => {
  const config = getApiConfig()
  const backendUrl = getBackendUrl()
  const url = `${backendUrl}/api${endpoint}`
  
  for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), config.timeout)
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          ...options.headers
        }
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        return response
      } else if (attempt < config.retryAttempts) {
        console.warn(`⚠️ Erreur API (tentative ${attempt}):`, response.status)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        continue
      } else {
        throw new Error(`API Error: ${response.status}`)
      }
    } catch (error) {
      if (attempt === config.retryAttempts) {
        throw error
      }
      console.warn(`❌ Erreur API (tentative ${attempt}):`, error.message)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
}

// Configuration exportée
export default {
  getBackendUrl,
  getApiUrl,
  getApiUrlWithFallback,
  getApiConfig,
  testBackendConnection,
  apiCallWithRetry,
  config: API_CONFIG
}
