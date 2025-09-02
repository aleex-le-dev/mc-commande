import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.jsx'
import { prefetchAppData } from './services/mongodbService.js'
import AuthGate from './components/AuthGate.jsx'

const Root = () => {
  const handleAuthenticated = () => {
    prefetchAppData()
  }
  return (
    <AuthGate onAuthenticated={handleAuthenticated}>
      <App />
    </AuthGate>
  )
}

const root = createRoot(document.getElementById('root'))
root.render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
