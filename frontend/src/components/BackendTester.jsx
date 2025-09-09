/**
 * Composant pour tester la connectivité des backends
 * Affiche le statut des backends Railway et Render
 */
import React, { useState, useEffect } from 'react'
import { testBothBackends } from '../config/api.js'

const BackendTester = ({ showDetails = false }) => {
  const [status, setStatus] = useState({
    testing: true,
    primary: null,
    fallback: null,
    selected: null,
    error: null
  })

  useEffect(() => {
    const testBackends = async () => {
      try {
        setStatus(prev => ({ ...prev, testing: true, error: null }))
        
        const result = await testBothBackends()
        
        setStatus({
          testing: false,
          primary: result.fallback ? 'Railway' : 'Railway',
          fallback: 'Render',
          selected: result.fallback ? 'Render (fallback)' : 'Railway (principal)',
          error: null
        })
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          testing: false,
          error: error.message
        }))
      }
    }

    testBackends()
  }, [])

  if (!showDetails && !status.testing && !status.error) {
    return null // Masquer si tout va bien
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${
          status.testing ? 'bg-yellow-400 animate-pulse' :
          status.error ? 'bg-red-500' : 'bg-green-500'
        }`}></div>
        <span className="font-medium text-sm">
          {status.testing ? 'Test backends...' : 
           status.error ? 'Erreur backends' : 'Backends OK'}
        </span>
      </div>
      
      {showDetails && (
        <div className="text-xs text-gray-600 space-y-1">
          <div>Principal: {status.primary}</div>
          <div>Fallback: {status.fallback}</div>
          <div>Utilisé: {status.selected}</div>
          {status.error && (
            <div className="text-red-500">Erreur: {status.error}</div>
          )}
        </div>
      )}
    </div>
  )
}

export default BackendTester
