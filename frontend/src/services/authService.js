// Service d'authentification simple contre l'API backend
import { getBackendUrl } from '../config/api.js'
const API_BASE = getBackendUrl()

const authService = {
  async setPassword(current, password) {
    const res = await fetch(`${API_BASE}/api/auth/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current, password }),
      credentials: 'include'
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'Erreur set-password')
    return true
  },

  async verify(password) {
    const res = await fetch(`${API_BASE}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      credentials: 'include'
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'Mot de passe incorrect')
    return true
  },

  async logout() {
    const res = await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    })
    return res.ok
  },

  async forgot() {
    const res = await fetch(`${API_BASE}/api/auth/forgot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.success !== true) throw new Error(data.error || 'Erreur génération mot de passe')
    return true
  }
}

export default authService


