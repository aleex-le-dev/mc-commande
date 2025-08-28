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

const root = createRoot(document.getElementById('root'))
root.render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
