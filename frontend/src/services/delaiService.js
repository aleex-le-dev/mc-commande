const API_BASE_URL = 'http://localhost:3001/api'

class DelaiService {
  // Récupérer la configuration des délais
  async getDelai() {
    try {
      const response = await fetch(`${API_BASE_URL}/delais/configuration`)
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de la configuration')
      }
      return await response.json()
    } catch (error) {
      console.error('Erreur DelaiService.getDelai:', error)
      throw error
    }
  }

  // Sauvegarder la configuration des délais
  async saveDelai(configuration) {
    try {
      const response = await fetch(`${API_BASE_URL}/delais/configuration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configuration)
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde de la configuration')
      }
      
      return await response.json()
    } catch (error) {
      console.error('Erreur DelaiService.saveDelai:', error)
      throw error
    }
  }

  // Calculer la date limite pour une commande donnée
  async calculerDateLimite(dateCommande, joursOuvrables, configurationJours) {
    try {
      const response = await fetch(`${API_BASE_URL}/delais/calculer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateCommande,
          joursOuvrables,
          configurationJours
        })
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors du calcul de la date limite')
      }
      
      return await response.json()
    } catch (error) {
      console.error('Erreur DelaiService.calculerDateLimite:', error)
      throw error
    }
  }

  // Récupérer l'historique des configurations
  async getHistorique() {
    try {
      const response = await fetch(`${API_BASE_URL}/delais/historique`)
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de l\'historique')
      }
      return await response.json()
    } catch (error) {
      console.error('Erreur DelaiService.getHistorique:', error)
      throw error
    }
  }
}

export default new DelaiService()
