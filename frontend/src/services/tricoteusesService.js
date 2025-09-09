/**
 * Service spécialisé pour la gestion des tricoteuses
 * Optimisé pour la performance et la synchronisation
 */
import { getApiUrl } from '../config/api.js'
import CacheService, { CACHE_KEYS } from './cacheService.js'

const API_BASE_URL = getApiUrl()

/**
 * Service des tricoteuses avec cache optimisé
 */
export const TricoteusesService = {
  /**
   * Obtenir toutes les tricoteuses
   */
  async getAllTricoteuses() {
    const cacheKey = CACHE_KEYS.TRICOTEUSES
    
    // Vérifier le cache d'abord
    // Désactiver le cache pour diagnostic
    console.log(`🚫 Cache désactivé pour diagnostic: ${cacheKey}`)
    const cached = null
    if (cached) {
      console.log('👥 Tricoteuses depuis le cache')
      return cached
    }

    try {
      await CacheService.acquireSlot()
      
      const response = await fetch(`${API_BASE_URL}/tricoteuses`, {
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      const data = result.data || []
      
      // Mettre en cache
      CacheService.set(cacheKey, data)
      
      console.log(`👥 Tricoteuses récupérées: ${data.length} tricoteuses`)
      return data

    } catch (error) {
      console.error('Erreur récupération tricoteuses:', error)
      
      // Fallback: retourner les données du cache même si expirées
      const fallback = CacheService.getMemory(cacheKey)
      if (fallback) {
        console.warn('⚠️ Utilisation du cache expiré pour les tricoteuses')
        return fallback
      }
      
      // Fallback: retourner un tableau vide pour éviter le blocage
      console.warn('⚠️ Aucune tricoteuse disponible - retour tableau vide')
      return []
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Obtenir une tricoteuse par ID
   */
  async getTricoteuseById(tricoteuseId) {
    const cacheKey = `tricoteuse_${tricoteuseId}`
    
    const cached = CacheService.get(cacheKey)
    if (cached) {
      return cached
    }

    try {
      await CacheService.acquireSlot()
      
      const response = await fetch(`${API_BASE_URL}/tricoteuses/${tricoteuseId}`, {
        credentials: 'include',
        mode: 'cors'
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }

      const result = await response.json()
      const data = result.data
      
      CacheService.set(cacheKey, data)
      
      return data

    } catch (error) {
      console.error(`Erreur récupération tricoteuse ${tricoteuseId}:`, error)
      
      // Fallback: chercher dans le cache des tricoteuses
      const allTricoteuses = CacheService.get(CACHE_KEYS.TRICOTEUSES) || []
      const tricoteuse = allTricoteuses.find(t => t._id === tricoteuseId)
      
      if (tricoteuse) {
        console.warn('⚠️ Tricoteuse trouvée dans le cache')
        return tricoteuse
      }
      
      throw error
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Créer une nouvelle tricoteuse
   */
  async createTricoteuse(tricoteuseData) {
    try {
      await CacheService.acquireSlot()
      
      const response = await fetch(`${API_BASE_URL}/tricoteuses`, {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tricoteuseData)
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }

      const result = await response.json()
      const data = result.data
      
      // Invalider le cache
      this.invalidateCache()
      
      console.log(`✅ Tricoteuse créée: ${data.name}`)
      return data

    } catch (error) {
      console.error('Erreur création tricoteuse:', error)
      throw error
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Mettre à jour une tricoteuse
   */
  async updateTricoteuse(tricoteuseId, updates) {
    try {
      await CacheService.acquireSlot()
      
      const response = await fetch(`${API_BASE_URL}/tricoteuses/${tricoteuseId}`, {
        method: 'PUT',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }

      const result = await response.json()
      const data = result.data
      
      // Invalider le cache
      this.invalidateCache()
      
      console.log(`✅ Tricoteuse ${tricoteuseId} mise à jour`)
      return data

    } catch (error) {
      console.error(`Erreur mise à jour tricoteuse ${tricoteuseId}:`, error)
      throw error
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Supprimer une tricoteuse
   */
  async deleteTricoteuse(tricoteuseId) {
    try {
      await CacheService.acquireSlot()
      
      const response = await fetch(`${API_BASE_URL}/tricoteuses/${tricoteuseId}`, {
        method: 'DELETE',
        credentials: 'include',
        mode: 'cors'
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }

      // Invalider le cache
      this.invalidateCache()
      
      console.log(`❌ Tricoteuse ${tricoteuseId} supprimée`)
      return true

    } catch (error) {
      console.error(`Erreur suppression tricoteuse ${tricoteuseId}:`, error)
      throw error
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Obtenir les statistiques des tricoteuses
   */
  async getTricoteusesStats() {
    const cacheKey = 'tricoteuses_stats'
    
    const cached = CacheService.get(cacheKey)
    if (cached) {
      return cached
    }

    try {
      await CacheService.acquireSlot()
      
      const response = await fetch(`${API_BASE_URL}/tricoteuses/stats`, {
        credentials: 'include',
        mode: 'cors'
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }

      const data = await response.json()
      CacheService.set(cacheKey, data)
      
      return data

    } catch (error) {
      console.error('Erreur récupération stats tricoteuses:', error)
      
      // Fallback: calculer les stats depuis le cache
      const allTricoteuses = CacheService.get(CACHE_KEYS.TRICOTEUSES) || []
      const stats = {
        total: allTricoteuses.length,
        active: allTricoteuses.filter(t => t.status === 'active').length,
        inactive: allTricoteuses.filter(t => t.status === 'inactive').length
      }
      
      return stats
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Obtenir les tricoteuses actives
   */
  async getActiveTricoteuses() {
    const cacheKey = 'tricoteuses_active'
    
    const cached = CacheService.get(cacheKey)
    if (cached) {
      return cached
    }

    try {
      await CacheService.acquireSlot()
      
      const response = await fetch(`${API_BASE_URL}/tricoteuses/active`, {
        credentials: 'include',
        mode: 'cors'
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }

      const result = await response.json()
      const data = result.data || []
      
      CacheService.set(cacheKey, data)
      
      return data

    } catch (error) {
      console.error('Erreur récupération tricoteuses actives:', error)
      
      // Fallback: filtrer depuis le cache
      const allTricoteuses = CacheService.get(CACHE_KEYS.TRICOTEUSES) || []
      const activeTricoteuses = allTricoteuses.filter(t => t.status === 'active')
      
      return activeTricoteuses
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Invalider le cache des tricoteuses
   */
  invalidateCache() {
    const stats = CacheService.getStats()
    stats.memoryKeys.forEach(key => {
      if (key.startsWith('tricoteuse') || key.includes('tricoteuses')) {
        CacheService.delete(key)
      }
    })
    console.log('🗑️ Cache tricoteuses invalidé')
  },

  /**
   * Obtenir les tricoteuses en mode offline
   */
  getOfflineTricoteuses() {
    const cached = CacheService.get(CACHE_KEYS.TRICOTEUSES)
    if (cached) {
      console.log('📱 Mode offline: tricoteuses depuis le cache')
      return cached
    }

    return []
  }
}

export default TricoteusesService
