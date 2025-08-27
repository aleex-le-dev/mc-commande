const API_BASE_URL = 'http://localhost:3001/api'

class DelaiService {
  // Récupérer la configuration actuelle du délai
  async getDelai() {
    try {
      const response = await fetch(`${API_BASE_URL}/delais/configuration`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Erreur lors de la récupération du délai:', error)
      return { success: false, error: error.message }
    }
  }

  // Récupérer la date limite actuelle calculée
  async getDateLimiteActuelle() {
    try {
      const response = await fetch(`${API_BASE_URL}/delais/configuration`)
      const data = await response.json()
      
      if (data.success && data.data) {
        // Calculer la date limite actuelle basée sur la configuration
        const aujourdhui = new Date()
        const { joursDelai, joursOuvrables } = data.data
        
        if (joursDelai && joursOuvrables) {
          let dateLimite = new Date(aujourdhui)
          let joursRetires = 0
          
          // Remonter dans le temps pour trouver la date limite
          while (joursRetires < joursDelai) {
            dateLimite.setDate(dateLimite.getDate() - 1)
            
            const jourSemaine = dateLimite.getDay()
            const nomJour = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][jourSemaine]
            
            if (joursOuvrables[nomJour]) {
              joursRetires++
            }
          }
          
          return { success: true, dateLimite: dateLimite.toISOString().split('T')[0] }
        }
      }
      
      return { success: false, dateLimite: null }
    } catch (error) {
      console.error('Erreur lors de la récupération de la date limite:', error)
      return { success: false, error: error.message }
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
