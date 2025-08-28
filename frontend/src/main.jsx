import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.jsx'
import { prefetchAppData } from './services/mongodbService.js'

const Root = () => {
  useEffect(() => {
    prefetchAppData()
  }, [])
  return <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
