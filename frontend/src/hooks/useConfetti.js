/**
 * Hook spécialisé pour la gestion des confettis
 * Responsabilité unique: affichage et animation des confettis
 */
import { useState, useEffect, useCallback } from 'react'

export const useConfetti = () => {
  const [showConfetti, setShowConfetti] = useState(false)
  const [confettiPosition, setConfettiPosition] = useState({ x: 0, y: 0 })

  // Auto-masquer les confettis après 2.5 secondes
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 2500)
      return () => clearTimeout(timer)
    }
  }, [showConfetti])

  // Déclencher les confettis au centre de l'écran
  const triggerConfetti = useCallback(() => {
    const rect = document.body.getBoundingClientRect()
    setConfettiPosition({ 
      x: rect.left + rect.width / 2, 
      y: rect.top + rect.height / 2 
    })
    setShowConfetti(true)
  }, [])

  // Déclencher les confettis à une position spécifique
  const triggerConfettiAt = useCallback((x, y) => {
    setConfettiPosition({ x, y })
    setShowConfetti(true)
  }, [])

  return {
    showConfetti,
    confettiPosition,
    triggerConfetti,
    triggerConfettiAt
  }
}

export default useConfetti
