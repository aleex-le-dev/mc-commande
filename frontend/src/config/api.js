/**
 * Configuration centralisée des URLs API
 * Permet de basculer facilement entre Render et Railway
 */

// Configuration des environnements
const API_CONFIG = {
  development: {
    backend: 'http://localhost:3001',
    description: 'Backend local'
  },
  production: {
    // Backend Railway uniquement
    backend: 'https://maisoncleo-commande-production.up.railway.app',
    description: 'Backend Railway (rapide)'
  }
}

// Fonction pour obtenir l'URL du backend
export const getBackendUrl = () => {
  const env = import.meta.env.DEV ? 'development' : 'production'
  const config = API_CONFIG[env]
  
  console.log(`🔗 Backend: ${config.description} (${config.backend})`)
  return config.backend
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

// Fonction pour tester la connectivité Railway
export const testBackendConnection = async () => {
  try {
    const backendUrl = getBackendUrl()
    const response = await fetch(`${backendUrl}/api/health`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors'
    })
    
    if (response.ok) {
      console.log('✅ Backend Railway connecté')
      return { success: true, backend: backendUrl }
    } else {
      console.warn('⚠️ Backend Railway répond mais avec erreur:', response.status)
      return { success: false, backend: backendUrl }
    }
  } catch (error) {
    console.error('❌ Backend Railway non accessible:', error.message)
    return { success: false, backend: getBackendUrl() }
  }
}

// Configuration exportée
export default {
  getBackendUrl,
  getApiUrl,
  getApiUrlWithFallback,
  testBackendConnection,
  config: API_CONFIG
}
