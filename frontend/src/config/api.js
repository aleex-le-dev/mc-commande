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
    // Backend principal (Railway - recommandé)
    backend: import.meta.env.VITE_API_URL || 'https://maisoncleo-commande-production.up.railway.app',
    description: 'Backend Railway (rapide)'
  },
  fallback: {
    // Backend de secours (Render - stable)
    backend: 'https://maisoncleo-commande.onrender.com',
    description: 'Backend Render (fallback stable)'
  }
}

// Fonction pour obtenir l'URL du backend
export const getBackendUrl = (useFallback = false) => {
  const env = import.meta.env.DEV ? 'development' : 'production'
  const config = useFallback ? API_CONFIG.fallback : API_CONFIG[env]
  
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

// Fonction pour tester la connectivité avec fallback automatique
export const testBackendConnection = async (useFallback = false) => {
  try {
    const backendUrl = getBackendUrl(useFallback)
    const response = await fetch(`${backendUrl}/api/health`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors'
    })
    
    if (response.ok) {
      console.log(`✅ Backend ${useFallback ? 'fallback' : 'principal'} connecté`)
      return { success: true, backend: backendUrl, fallback: useFallback }
    } else {
      console.warn(`⚠️ Backend ${useFallback ? 'fallback' : 'principal'} répond mais avec erreur:`, response.status)
      return { success: false, backend: backendUrl, fallback: useFallback }
    }
  } catch (error) {
    console.error(`❌ Backend ${useFallback ? 'fallback' : 'principal'} non accessible:`, error.message)
    return { success: false, backend: getBackendUrl(useFallback), fallback: useFallback }
  }
}

// Fonction pour tester les deux backends et choisir le meilleur
export const testBothBackends = async () => {
  console.log('🧪 Test des deux backends...')
  
  const [primaryResult, fallbackResult] = await Promise.all([
    testBackendConnection(false), // Railway
    testBackendConnection(true)   // Render
  ])
  
  if (primaryResult.success) {
    console.log('🚀 Utilisation du backend Railway (principal)')
    return { backend: primaryResult.backend, fallback: false }
  } else if (fallbackResult.success) {
    console.log('⚠️ Railway indisponible, utilisation de Render (fallback)')
    return { backend: fallbackResult.backend, fallback: true }
  } else {
    console.error('❌ Aucun backend disponible')
    return { backend: primaryResult.backend, fallback: false }
  }
}

// Configuration exportée
export default {
  getBackendUrl,
  getApiUrl,
  getApiUrlWithFallback,
  testBackendConnection,
  testBothBackends,
  config: API_CONFIG
}
