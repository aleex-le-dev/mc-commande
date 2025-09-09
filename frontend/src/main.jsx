import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.jsx'
import { prefetchAppData } from './services/mongodbService.js'
import AuthGate from './components/AuthGate.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
})

const Root = () => {
  // Démarrer le préchargement (sans synchronisation) en arrière-plan, avant l'authentification
  useEffect(() => {
    const already = sessionStorage.getItem('mc-prefetch-ok-v1') === '1'
    if (!already) {
      prefetchAppData()
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

  // Diagnostic production: healthcheck backend et timings
  useEffect(() => {
    if (!import.meta.env.PROD) return
    const t0 = performance.now()
    const base = (import.meta.env.VITE_API_URL || 'https://maisoncleo-commande.onrender.com')
    const url = `${base}/api/health`
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 15000) // Augmenté à 15s
    ;(async () => {
      try {
        console.log('[BOOT] Healthcheck →', url)
        const res = await fetch(url, { 
          signal: ctrl.signal,
          credentials: 'include',
          mode: 'cors'
        })
        const t = Math.round(performance.now() - t0)
        if (!res.ok) {
          console.error(`[BOOT] Healthcheck HTTP ${res.status} en ${t}ms`)
          return
        }
        const data = await res.json()
        console.log(`[BOOT] Backend OK en ${t}ms`, data)
      } catch (e) {
        const t = Math.round(performance.now() - t0)
        console.error(`[BOOT] Healthcheck échec en ${t}ms →`, e?.name || e?.message || e)
      } finally {
        clearTimeout(timeout)
      }
    })()
    return () => clearTimeout(timeout)
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
