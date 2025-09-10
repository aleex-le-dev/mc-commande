/**
 * Hook spécialisé pour la gestion des formulaires
 * Responsabilité unique: état des formulaires et validation
 */
import { useState, useCallback } from 'react'

export const useFormState = (initialData = {}) => {
  const [formData, setFormData] = useState(initialData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  // Mettre à jour un champ du formulaire
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }))
    }
  }, [errors])

  // Mettre à jour plusieurs champs
  const updateFields = useCallback((updates) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }))
  }, [])

  // Réinitialiser le formulaire
  const resetForm = useCallback((newData = initialData) => {
    setFormData(newData)
    setErrors({})
    setIsSubmitting(false)
  }, [initialData])

  // Valider le formulaire
  const validateForm = useCallback((validationRules) => {
    const newErrors = {}
    
    Object.keys(validationRules).forEach(field => {
      const rule = validationRules[field]
      const value = formData[field]
      
      if (rule.required && (!value || value.toString().trim() === '')) {
        newErrors[field] = rule.message || `${field} est requis`
      } else if (rule.pattern && !rule.pattern.test(value)) {
        newErrors[field] = rule.message || `${field} n'est pas valide`
      } else if (rule.custom && !rule.custom(value)) {
        newErrors[field] = rule.message || `${field} n'est pas valide`
      }
    })
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  // Soumettre le formulaire
  const submitForm = useCallback(async (submitFn, validationRules = {}) => {
    if (Object.keys(validationRules).length > 0 && !validateForm(validationRules)) {
      return false
    }

    setIsSubmitting(true)
    try {
      const result = await submitFn(formData)
      return result
    } catch (error) {
      console.error('Erreur soumission formulaire:', error)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, validateForm])

  return {
    formData,
    isSubmitting,
    errors,
    updateField,
    updateFields,
    resetForm,
    validateForm,
    submitForm
  }
}

export default useFormState
