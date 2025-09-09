/**
 * Service spécialisé pour la gestion des assignations
 * Optimisé pour la performance et la synchronisation
 */
import { getApiUrl } from '../config/api.js'
import CacheService, { CACHE_KEYS } from './cacheService.js'

const API_BASE_URL = getApiUrl()

/**
 * Service des assignations avec cache optimisé
 */
export const AssignmentsService = {
  /**
   * Obtenir toutes les assignations
   */
  async getAllAssignments() {
    const cacheKey = CACHE_KEYS.ASSIGNMENTS
    
    // Vérifier le cache d'abord
    // Désactiver le cache pour diagnostic
    console.log(`🚫 Cache désactivé pour diagnostic: ${cacheKey}`)
    const cached = null
    if (cached) {
      console.log('📋 Assignations depuis le cache')
      return cached
    }

    try {
      await CacheService.acquireSlot()
      
      const response = await fetch(`${API_BASE_URL}/assignments`, {
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
      
      console.log(`📋 Assignations récupérées: ${data.length} assignations`)
      return data

    } catch (error) {
      console.error('Erreur récupération assignations:', error)
      
      // Fallback: retourner les données du cache même si expirées
      const fallback = CacheService.getMemory(cacheKey)
      if (fallback) {
        console.warn('⚠️ Utilisation du cache expiré pour les assignations')
        return fallback
      }
      
      // Fallback: retourner un tableau vide pour éviter le blocage
      console.warn('⚠️ Aucune assignation disponible - retour tableau vide')
      return []
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Obtenir les assignations actives
   */
  async getActiveAssignments() {
    const cacheKey = 'assignments_active'
    
    const cached = CacheService.get(cacheKey)
    if (cached) {
      return cached
    }

    try {
      await CacheService.acquireSlot()
      
      const response = await fetch(`${API_BASE_URL}/assignments/active`, {
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
      console.error('Erreur récupération assignations actives:', error)
      
      // Fallback: filtrer les assignations actives depuis le cache
      const allAssignments = CacheService.get(CACHE_KEYS.ASSIGNMENTS) || []
      const activeAssignments = allAssignments.filter(a => a.status === 'en_cours')
      
      if (activeAssignments.length > 0) {
        console.warn('⚠️ Utilisation du cache pour les assignations actives')
        return activeAssignments
      }
      
      return []
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Obtenir les assignations d'une tricoteuse
   */
  async getAssignmentsByTricoteuse(tricoteuseId) {
    const cacheKey = `assignments_tricoteuse_${tricoteuseId}`
    
    const cached = CacheService.get(cacheKey)
    if (cached) {
      return cached
    }

    try {
      await CacheService.acquireSlot()
      
      const response = await fetch(`${API_BASE_URL}/assignments/tricoteuse/${tricoteuseId}`, {
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
      console.error(`Erreur récupération assignations tricoteuse ${tricoteuseId}:`, error)
      
      // Fallback: filtrer depuis le cache
      const allAssignments = CacheService.get(CACHE_KEYS.ASSIGNMENTS) || []
      const tricoteuseAssignments = allAssignments.filter(a => a.tricoteuse_id === tricoteuseId)
      
      return tricoteuseAssignments
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Assigner un article à une tricoteuse
   */
  async assignArticle(articleId, tricoteuseId) {
    try {
      await CacheService.acquireSlot()
      
      const response = await fetch(`${API_BASE_URL}/assignments`, {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          article_id: articleId,
          tricoteuse_id: tricoteuseId
        })
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }

      const data = await response.json()
      
      // Invalider le cache
      this.invalidateCache()
      
      console.log(`✅ Article ${articleId} assigné à tricoteuse ${tricoteuseId}`)
      return data

    } catch (error) {
      console.error(`Erreur assignation article ${articleId}:`, error)
      throw error
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Désassigner un article
   */
  async unassignArticle(articleId) {
    try {
      await CacheService.acquireSlot()
      
      const response = await fetch(`${API_BASE_URL}/assignments/${articleId}`, {
        method: 'DELETE',
        credentials: 'include',
        mode: 'cors'
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }

      // Invalider le cache
      this.invalidateCache()
      
      console.log(`❌ Article ${articleId} désassigné`)
      return true

    } catch (error) {
      console.error(`Erreur désassignation article ${articleId}:`, error)
      throw error
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Mettre à jour une assignation
   */
  async updateAssignment(assignmentId, updates) {
    try {
      await CacheService.acquireSlot()
      
      const response = await fetch(`${API_BASE_URL}/assignments/${assignmentId}`, {
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

      const data = await response.json()
      
      // Invalider le cache
      this.invalidateCache()
      
      return data

    } catch (error) {
      console.error(`Erreur mise à jour assignation ${assignmentId}:`, error)
      throw error
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Obtenir les statistiques des assignations
   */
  async getAssignmentsStats() {
    const cacheKey = 'assignments_stats'
    
    const cached = CacheService.get(cacheKey)
    if (cached) {
      return cached
    }

    try {
      await CacheService.acquireSlot()
      
      const response = await fetch(`${API_BASE_URL}/assignments/stats`, {
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
      console.error('Erreur récupération stats assignations:', error)
      
      // Fallback: calculer les stats depuis le cache
      const allAssignments = CacheService.get(CACHE_KEYS.ASSIGNMENTS) || []
      const stats = {
        total: allAssignments.length,
        active: allAssignments.filter(a => a.status === 'en_cours').length,
        completed: allAssignments.filter(a => a.status === 'termine').length
      }
      
      return stats
    } finally {
      CacheService.releaseSlot()
    }
  },

  /**
   * Invalider le cache des assignations
   */
  invalidateCache() {
    const stats = CacheService.getStats()
    stats.memoryKeys.forEach(key => {
      if (key.startsWith('assignments') || key.includes('tricoteuse')) {
        CacheService.delete(key)
      }
    })
    console.log('🗑️ Cache assignations invalidé')
  },

  /**
   * Obtenir les assignations en mode offline
   */
  getOfflineAssignments() {
    const cached = CacheService.get(CACHE_KEYS.ASSIGNMENTS)
    if (cached) {
      console.log('📱 Mode offline: assignations depuis le cache')
      return cached
    }

    return []
  }
}

export default AssignmentsService
