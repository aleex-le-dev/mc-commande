/**
 * Hook spécialisé pour la gestion des délais
 * Responsabilité unique: calcul des retards et gestion de la date limite
 */
import { useState, useEffect, useCallback } from 'react'
import delaiService from '../services/delaiService'

export const useDelaiManager = (article) => {
  const [dateLimite, setDateLimite] = useState(null)
  const [delaiConfig, setDelaiConfig] = useState(null)

  // Charger la configuration des délais
  useEffect(() => {
    const loadDelaiConfig = async () => {
      try {
        const response = await delaiService.getDelai()
        if (response.success && response.data && response.data.dateLimite) {
          const dateLimiteStr = response.data.dateLimite.split('T')[0]
          setDateLimite(dateLimiteStr)
          setDelaiConfig(response.data)
        }
      } catch (error) {
        console.error('Erreur chargement config délais:', error)
      }
    }
    
    if (!dateLimite) {
      loadDelaiConfig()
    }
  }, [dateLimite])

  // Calculer si l'article est en retard
  const computeIsEnRetard = useCallback((isEnRetard = false) => {
    try {
      if (isEnRetard) return true
      if (!dateLimite || !article?.orderDate) return false
      
      const dateCommande = new Date(article.orderDate)
      const dateLimiteObj = new Date(dateLimite)
      const dc = new Date(dateCommande.getFullYear(), dateCommande.getMonth(), dateCommande.getDate())
      const dl = new Date(dateLimiteObj.getFullYear(), dateLimiteObj.getMonth(), dateLimiteObj.getDate())
      
      return dc <= dl
    } catch (error) {
      console.error('Erreur calcul retard:', error)
      return false
    }
  }, [dateLimite, article?.orderDate])

  // Vérifier si l'article doit avoir un trait rouge
  const doitAvoirTraitRouge = useCallback((isEnRetard = false) => {
    return Boolean(isEnRetard || computeIsEnRetard())
  }, [computeIsEnRetard])

  return {
    dateLimite,
    delaiConfig,
    computeIsEnRetard,
    doitAvoirTraitRouge
  }
}

export default useDelaiManager
