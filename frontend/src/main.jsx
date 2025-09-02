import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.jsx'
import { prefetchAppData } from './services/mongodbService.js'
import AuthGate from './components/AuthGate.jsx'

const Root = () => {
  // Démarrer le préchargement immédiatement en arrière-plan, avant l'authentification
  useEffect(() => {
    const already = sessionStorage.getItem('mc-prefetch-ok-v1') === '1'
    if (!already) {
      prefetchAppData()
    }
  }, [])
  return (
    <AuthGate>
      <App />
    </AuthGate>
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
