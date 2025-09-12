/**
 * Service spécialisé pour la gestion des assignations
 * Responsabilité unique : gestion des assignations d'articles aux tricoteuses
 */
import HttpClientService from '../http/httpClientService.js'
import { HttpCacheService } from '../cache/httpCacheService.js'

/**
 * Service des assignations
 */
export const AssignmentsService = {
  /**
   * Récupérer toutes les assignations
   */
  async getAssignments() {
    try {
      console.log('🔍 [DEBUG] Récupération des assignations...')
      
      // Forcer le rechargement à chaque appel après une mutation via invalidation explicite
      const response = await HttpClientService.get('/assignments')
      
      console.log('🔍 [DEBUG] Réponse API:', response.status, response.ok)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('🔍 [DEBUG] Données reçues:', data)
      
      const assignments = data.assignments || data.data || []
      console.log('🔍 [DEBUG] Assignations extraites:', assignments.length, assignments)
      
      return assignments
    } catch (error) {
      console.error('❌ [DEBUG] Erreur récupération assignations:', error)
      return []
    }
  },

  /**
   * Créer une nouvelle assignation
   */
  async createAssignment(assignmentData) {
    try {
      const response = await HttpClientService.post('/assignments', assignmentData)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const created = await response.json()
      const newAssignment = created.assignment || created.data || created
      
      // Invalider le cache
      HttpCacheService.delete('assignments')
      
      return newAssignment
    } catch (error) {
      console.error('Erreur création assignation:', error)
      throw error
    }
  },

  /**
   * Mettre à jour une assignation
   */
  async updateAssignment(assignmentId, updateData) {
    try {
      const response = await HttpClientService.put(`/assignments/${assignmentId}`, updateData)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const updatedAssignment = await response.json()
      
      // Invalider le cache
      HttpCacheService.delete('assignments')
      
      return updatedAssignment
    } catch (error) {
      console.error('Erreur mise à jour assignation:', error)
      throw error
    }
  },

  /**
   * Supprimer une assignation
   */
  async deleteAssignment(assignmentId) {
    try {
      const response = await HttpClientService.delete(`/assignments/${assignmentId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      // Invalider le cache
      HttpCacheService.delete('assignments')
      
      return true
    } catch (error) {
      console.error('Erreur suppression assignation:', error)
      throw error
    }
  },

  /**
   * Récupérer une assignation par ID d'article
   */
  async getAssignmentByArticleId(articleId) {
    try {
      const response = await HttpClientService.get(`/assignments/by-article/${articleId}`)
      if (!response.ok) {
        if (response.status === 404) {
          return null // Pas d'assignation trouvée
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Erreur récupération assignation par article:', error)
      return null
    }
  },

  /**
   * Récupérer les assignations d'une tricoteuse
   */
  async getAssignmentsByTricoteuse(tricoteuseId) {
    try {
      const response = await HttpClientService.get(`/assignments/by-tricoteuse/${tricoteuseId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.assignments || []
    } catch (error) {
      console.error('Erreur récupération assignations par tricoteuse:', error)
      return []
    }
  },

  /**
   * Récupérer les assignations actives
   */
  async getActiveAssignments() {
    try {
      const response = await HttpClientService.get('/assignments/active')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.assignments || []
    } catch (error) {
      console.error('Erreur récupération assignations actives:', error)
      return []
    }
  },

  /**
   * Récupérer les statistiques des assignations
   */
  async getAssignmentsStats() {
    try {
      const response = await HttpClientService.get('/assignments/stats')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Erreur récupération stats assignations:', error)
      return { total: 0, active: 0, completed: 0 }
    }
  }
}

export default AssignmentsService
