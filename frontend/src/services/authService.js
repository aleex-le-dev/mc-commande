// Service d'authentification simple contre l'API backend
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const authService = {
  async setPassword(password) {
    const res = await fetch(`${API_BASE}/api/auth/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'Erreur set-password')
    return true
  },

  async verify(password) {
    const res = await fetch(`${API_BASE}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'Mot de passe incorrect')
    return true
  }
}

export default authService


