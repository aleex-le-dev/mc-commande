// Service d'authentification simple contre l'API backend
// En dev: utilise automatiquement le backend local. En prod: Render ou VITE_API_URL si fourni.
const API_BASE = (import.meta.env.DEV
  ? 'http://localhost:3001'
  : (import.meta.env.VITE_API_URL || 'https://maisoncleo-commande.onrender.com'))

const authService = {
  async setPassword(password) {
    const res = await fetch(`${API_BASE}/api/auth/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
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
  }
}

export default authService


