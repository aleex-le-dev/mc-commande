import React, { useEffect, useMemo, useState } from 'react'
import authService from '../services/authService'
import { ApiService } from '../services/apiService'

// Composant portail d'authentification minimaliste en plein écran.
// Bloque totalement l'accès à l'application tant que le mot de passe n'est pas validé.
// Le mot de passe est fourni via la variable d'environnement VITE_APP_PASSWORD.
// L'état est stocké en sessionStorage pour ne pas redemander sur chaque rafraîchissement d'onglet.
const AuthGate = ({ children, onAuthenticated }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const STORAGE_KEY = 'mc-auth-ok-v2'
  const [password, setPassword] = useState('')
  const requiredPassword = useMemo(() => (import.meta.env.VITE_APP_PASSWORD || '').toString(), [])
  // plus d'affichage de logs, uniquement console

  // Restaurer la session pour les rafraîchissements d'onglet (sessionStorage)
  useEffect(() => {
    // Définir le favicon cadenas pour la page d'auth
    try {
      const setFavicon = (emoji) => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" height="64" width="64"><text y="50%" x="50%" dominant-baseline="middle" text-anchor="middle" font-size="52">${emoji}</text></svg>`
        const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
        let link = document.querySelector('link[rel="icon"]')
        if (!link) {
          link = document.createElement('link')
          link.rel = 'icon'
          document.head.appendChild(link)
        }
        link.href = url
      }
      setFavicon('🔒')
      document.title = 'Mot de passe – Maisoncléo'
    } catch {}
    const flag = sessionStorage.getItem(STORAGE_KEY)
    if (flag === '1') {
      setIsAuthenticated(true)
      if (typeof onAuthenticated === 'function') onAuthenticated()
    }
  }, [onAuthenticated])

  // Démarrer le préchargement si pas fait (aucune requête protégée)
  useEffect(() => {
    const prefetchDone = sessionStorage.getItem('mc-prefetch-ok-v1') === '1'
    if (!prefetchDone) {
      try { ApiService.prefetchAppData() } catch {}
    }
    // Ne plus pinger les logs côté non-authentifié pour éviter 401
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (requiredPassword) {
        // Mode mot de passe build-time (fallback)
        if (password === requiredPassword) {
          sessionStorage.setItem(STORAGE_KEY, '1')
          setIsAuthenticated(true)
          if (typeof onAuthenticated === 'function') onAuthenticated()
          try {
            // Nettoyer favicon pour laisser l'app principale le gérer ensuite
            const link = document.querySelector('link[rel="icon"]')
            if (link) link.href = '/vite.svg'
          } catch {}
          return
        }
        throw new Error('Mot de passe incorrect')
      }
      // Sinon, vérifier auprès du backend (mode gestion serveur)
      await authService.verify(password)
      sessionStorage.setItem(STORAGE_KEY, '1')
      setIsAuthenticated(true)
      if (typeof onAuthenticated === 'function') onAuthenticated()
      return
    } catch (err) {
      // Échec: animer le formulaire
    }
    // Échec: ne pas révéler d'information, secouer légèrement le formulaire
    const form = e?.currentTarget
    if (!form) return
    form.classList.remove('shake')
    // forcer reflow
    // eslint-disable-next-line no-unused-expressions
    form.offsetHeight
    form.classList.add('shake')
  }

  // Ne pas court-circuiter: si aucun VITE_APP_PASSWORD, on utilisera la vérification backend.

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: '#0b0b0d' }}>
        <div className="w-full max-w-sm mx-4 rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: '#ffffff' }}>
          <div className="text-center mb-4">
            <img src="/mclogosite.png" alt="Maisoncléo" className="mx-auto h-6" />
          </div>
          <h1 className="text-lg font-semibold text-center mb-2" style={{ color: '#111827' }}>Accès protégé et sécurisé</h1>
          {/* Message de préchargement retiré : on garde uniquement l'exécution en arrière-plan et le log console */}
          <form onSubmit={handleSubmit} className="transition-transform" style={{ transformOrigin: 'center' }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full border rounded-lg px-3 py-2 mb-3"
              style={{ borderColor: '#d1d5db', color: '#111827' }}
              autoFocus
            />
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 font-medium cursor-pointer"
              style={{ backgroundColor: '#111827', color: '#ffffff' }}
            >
              Entrer
            </button>
          </form>
          <style>{`
            .shake { animation: mc-shake 0.25s ease-in-out 2; }
            @keyframes mc-shake {
              0% { transform: translateX(0); }
              25% { transform: translateX(-6px); }
              50% { transform: translateX(6px); }
              75% { transform: translateX(-4px); }
              100% { transform: translateX(0); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default AuthGate


