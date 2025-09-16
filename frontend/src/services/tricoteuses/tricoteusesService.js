/**
 * Service spécialisé pour la gestion des tricoteuses
 * Responsabilité unique : gestion des tricoteuses
 */
import HttpClientService from '../http/httpClientService.js'
import { HttpCacheService } from '../cache/httpCacheService.js'

/**
 * Service des tricoteuses
 */
export const TricoteusesService = {
  /**
   * Récupérer toutes les tricoteuses
   */
  async getTricoteuses() {
    try {
      // Vérifier le cache d'abord (ne pas renvoyer un cache vide)
      const cached = HttpCacheService.get('tricoteuses')
      if (Array.isArray(cached) && cached.length > 0) {
        return cached
      }
      // Si le cache existe mais est vide, on l'invalide pour forcer un refetch
      if (Array.isArray(cached) && cached.length === 0) {
        HttpCacheService.delete('tricoteuses')
      }

      const response = await HttpClientService.get('/tricoteuses')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      const raw = data.data || data.tricoteuses || []
      // Normaliser le schéma (photoUrl peut être photo_url ou photo)
      const tricoteuses = Array.isArray(raw)
        ? raw.map(t => ({
            ...t,
            photoUrl: t.photoUrl || t.photo_url || t.photo || ''
          }))
        : []
      
      // Mettre en cache seulement si non vide
      if (tricoteuses.length > 0) {
        HttpCacheService.set('tricoteuses', tricoteuses)
      } else {
        // S'assurer que le prochain appel retentera depuis le réseau
        HttpCacheService.delete('tricoteuses')
      }
      
      // Notifier l'application d'une mise à jour des tricoteuses
      try { window.dispatchEvent(new Event('mc-tricoteuses-updated')) } catch {}
      
      return tricoteuses
    } catch (error) {
      console.error('Erreur récupération tricoteuses:', error)
      return []
    }
  },

  /**
   * Créer une nouvelle tricoteuse
   */
  async createTricoteuse(tricoteuseData) {
    try {
      const response = await HttpClientService.post('/tricoteuses', tricoteuseData)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const newTricoteuse = await response.json()
      
      // Invalider le cache
      HttpCacheService.delete('tricoteuses')
      
      return newTricoteuse
    } catch (error) {
      console.error('Erreur création tricoteuse:', error)
      throw error
    }
  },

  /**
   * Mettre à jour une tricoteuse
   */
  async updateTricoteuse(tricoteuseId, updateData) {
    try {
      const response = await HttpClientService.put(`/tricoteuses/${tricoteuseId}`, updateData)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const updatedTricoteuse = await response.json()
      
      // Invalider le cache
      HttpCacheService.delete('tricoteuses')
      
      return updatedTricoteuse
    } catch (error) {
      console.error('Erreur mise à jour tricoteuse:', error)
      throw error
    }
  },

  /**
   * Supprimer une tricoteuse
   */
  async deleteTricoteuse(tricoteuseId) {
    try {
      const response = await HttpClientService.delete(`/tricoteuses/${tricoteuseId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      // Invalider le cache
      HttpCacheService.delete('tricoteuses')
      
      return true
    } catch (error) {
      console.error('Erreur suppression tricoteuse:', error)
      throw error
    }
  },

  /**
   * Récupérer une tricoteuse par ID
   */
  async getTricoteuseById(tricoteuseId) {
    try {
      const response = await HttpClientService.get(`/tricoteuses/${tricoteuseId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Erreur récupération tricoteuse par ID:', error)
      return null
    }
  },

  /**
   * Récupérer les statistiques des tricoteuses
   */
  async getTricoteusesStats() {
    try {
      const response = await HttpClientService.get('/tricoteuses/stats')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Erreur récupération stats tricoteuses:', error)
      return { total: 0, active: 0, inactive: 0 }
    }
  }
}

export default TricoteusesService
