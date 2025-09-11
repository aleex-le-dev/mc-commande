/**
 * Hook spécialisé pour la gestion de l'état des grilles
 * Responsabilité unique: état des articles, assignations et tricoteuses
 */
import { useState, useEffect, useCallback } from 'react'
import { ApiService } from '../services/apiService'
import delaiService from '../services/delaiService'

export const useGridState = () => {
  const [assignments, setAssignments] = useState({})
  const [assignmentsLoading, setAssignmentsLoading] = useState(true)
  const [tricoteuses, setTricoteuses] = useState([])
  const [tricoteusesLoading, setTricoteusesLoading] = useState(true)
  const [dateLimite, setDateLimite] = useState(null)
  const [dateLimiteLoading, setDateLimiteLoading] = useState(true)

  // Charger les assignations
  const loadAssignments = useCallback(async () => {
    try {
      setAssignmentsLoading(true)
      const data = await ApiService.assignments.getAssignments()
      const assignmentsMap = {}
      data.forEach(assignment => {
        assignmentsMap[assignment.article_id] = assignment
      })
      // Fusionner avec les assignations existantes pour préserver les modifications locales
      setAssignments(prevAssignments => {
        const merged = {
          ...prevAssignments,
          ...assignmentsMap
        }
        return merged
      })
    } catch (error) {
      console.error('Erreur chargement assignations:', error)
    } finally {
      setAssignmentsLoading(false)
    }
  }, [])

  // Charger les tricoteuses
  const loadTricoteuses = useCallback(async () => {
    try {
      setTricoteusesLoading(true)
      const data = await ApiService.tricoteuses.getTricoteuses()
      setTricoteuses(data)
    } catch (error) {
      console.error('Erreur chargement tricoteuses:', error)
    } finally {
      setTricoteusesLoading(false)
    }
  }, [])

  // Charger la date limite
  const loadDateLimite = useCallback(async () => {
    try {
      setDateLimiteLoading(true)
      // Utiliser une date limite fixe pour le test
      const dateLimiteStr = '2025-08-13'
      setDateLimite(dateLimiteStr)
    } catch (error) {
      console.error('Erreur chargement date limite:', error)
    } finally {
      setDateLimiteLoading(false)
    }
  }, [])

  // Charger toutes les données
  const loadAllData = useCallback(async () => {
    await Promise.all([
      loadAssignments(),
      loadTricoteuses(),
      loadDateLimite()
    ])
  }, [])

  // Charger au montage
  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Rafraîchir les données
  const refreshData = useCallback(() => {
    loadAllData()
  }, [loadAllData])

  return {
    assignments,
    setAssignments,
    assignmentsLoading,
    tricoteuses,
    tricoteusesLoading,
    dateLimite,
    dateLimiteLoading,
    loadAssignments,
    loadTricoteuses,
    loadDateLimite,
    refreshData
  }
}

export default useGridState
