import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.jsx'
import { ApiService } from './services/apiService.js'
import AuthGate from './components/AuthGate.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './utils/circuitBreakerReset.js'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0, // Pas de retry pour accélérer
      refetchOnWindowFocus: false,
      staleTime: 30 * 60 * 1000, // 30 minutes de cache
      gcTime: 60 * 60 * 1000 // 60 minutes de garbage collection
    }
  }
})

const Root = () => {
  // Démarrer le préchargement (sans synchronisation) en arrière-plan, avant l'authentification
  useEffect(() => {
    const already = sessionStorage.getItem('mc-prefetch-ok-v1') === '1'
    if (!already) {
      ApiService.prefetchAppData()
    }
  }, [])

  // Empreinte console: une seule ligne cliquable
  useEffect(() => {
    try {
      if (!window.__alexPrintOnce) {
        const style = 'color:#10b981;background:#0b1220;padding:6px 10px;border-radius:12px;font-weight:700;letter-spacing:.03em;font-size:12px'
        console.log('%cCreated by AleexLeDev · https://salutalex.fr', style)
        window.__alexPrintOnce = true
      }
    } catch {}
  }, [])

  // Diagnostic production: healthcheck backend et timings (désactivé temporairement)
  useEffect(() => {
    if (!import.meta.env.PROD) return
    // Désactivé temporairement car le backend est trop lent en production
    console.log('[BOOT] Healthcheck désactivé (backend lent)')
  }, [])
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <App />
      </AuthGate>
    </QueryClientProvider>
  )
}

const container = document.getElementById('root')
let root = container._mcRoot
if (!root) {
  root = createRoot(container)
  container._mcRoot = root
}
root.render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
