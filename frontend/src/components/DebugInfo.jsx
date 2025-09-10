/**
 * Composant de debug pour afficher les informations importantes
 * Seulement en mode développement
 */
import { useState, useEffect } from 'react'
import { logger } from '../utils/logger'

const DebugInfo = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [debugInfo, setDebugInfo] = useState({
    services: [],
    errors: [],
    performance: []
  })

  // Seulement en développement
  if (import.meta.env.PROD) {
    return null
  }

  useEffect(() => {
    // Écouter les événements de debug
    const handleServiceStart = (event) => {
      setDebugInfo(prev => ({
        ...prev,
        services: [...prev.services, {
          name: event.detail.name,
          startTime: Date.now(),
          status: 'loading'
        }]
      }))
    }

    const handleServiceSuccess = (event) => {
      setDebugInfo(prev => ({
        ...prev,
        services: prev.services.map(service => 
          service.name === event.detail.name 
            ? { ...service, status: 'success', endTime: Date.now() }
            : service
        )
      }))
    }

    const handleServiceError = (event) => {
      setDebugInfo(prev => ({
        ...prev,
        services: prev.services.map(service => 
          service.name === event.detail.name 
            ? { ...service, status: 'error', endTime: Date.now() }
            : service
        ),
        errors: [...prev.errors, {
          service: event.detail.name,
          error: event.detail.error,
          timestamp: Date.now()
        }]
      }))
    }

    // Écouter les événements
    window.addEventListener('debug-service-start', handleServiceStart)
    window.addEventListener('debug-service-success', handleServiceSuccess)
    window.addEventListener('debug-service-error', handleServiceError)

    return () => {
      window.removeEventListener('debug-service-start', handleServiceStart)
      window.removeEventListener('debug-service-success', handleServiceSuccess)
      window.removeEventListener('debug-service-error', handleServiceError)
    }
  }, [])

  const toggleVisibility = () => {
    setIsVisible(!isVisible)
  }

  if (!isVisible) {
    return (
      <button
        onClick={toggleVisibility}
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded-full shadow-lg z-50"
        title="Afficher les informations de debug"
      >
        🐛
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold">Debug Info</h3>
        <button
          onClick={toggleVisibility}
          className="text-white hover:text-gray-300"
        >
          ✕
        </button>
      </div>
      
      <div className="text-xs space-y-2">
        <div>
          <h4 className="font-semibold text-green-400">Services:</h4>
          {debugInfo.services.map((service, index) => (
            <div key={index} className="ml-2">
              {service.name}: 
              <span className={`ml-1 ${
                service.status === 'success' ? 'text-green-400' :
                service.status === 'error' ? 'text-red-400' :
                'text-yellow-400'
              }`}>
                {service.status}
              </span>
              {service.endTime && (
                <span className="text-gray-400 ml-1">
                  ({(service.endTime - service.startTime)}ms)
                </span>
              )}
            </div>
          ))}
        </div>
        
        {debugInfo.errors.length > 0 && (
          <div>
            <h4 className="font-semibold text-red-400">Erreurs:</h4>
            {debugInfo.errors.map((error, index) => (
              <div key={index} className="ml-2 text-red-300">
                {error.service}: {error.error}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DebugInfo
