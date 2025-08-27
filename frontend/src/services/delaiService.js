const API_BASE_URL = 'http://localhost:3001/api'

class DelaiService {
  constructor() {
    // Cache pour les jours fériés
    this.joursFeriesCache = {}
    this.cacheExpiration = {}
    this.isLoadingJoursFeries = false
  }

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
            
            // Vérifier si c'est un jour ouvrable configuré ET pas un jour férié
            if (joursOuvrables[nomJour] && !(await this.estJourFerie(dateLimite))) {
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

  // Vérifier si une date est un jour férié français (avec cache)
  async estJourFerie(date) {
    try {
      const annee = date.getFullYear()
      const jour = date.getDate().toString().padStart(2, '0')
      const mois = (date.getMonth() + 1).toString().padStart(2, '0')
      const dateStr = `${annee}-${mois}-${jour}`
      
      // Vérifier le cache d'abord
      if (this.joursFeriesCache[annee] && this.cacheExpiration[annee] > Date.now()) {
        return this.joursFeriesCache[annee][dateStr] !== undefined
      }
      
      // Si pas en cache ou expiré, charger depuis l'API
      if (!this.isLoadingJoursFeries) {
        await this.chargerJoursFeriesAnnee(annee)
      }
      
      // Retourner depuis le cache
      return this.joursFeriesCache[annee] && this.joursFeriesCache[annee][dateStr] !== undefined
    } catch (error) {
      console.warn('Erreur lors de la vérification des jours fériés:', error)
      return false
    }
  }

  // Charger les jours fériés pour une année spécifique
  async chargerJoursFeriesAnnee(annee) {
    if (this.isLoadingJoursFeries) return
    
    this.isLoadingJoursFeries = true
    
    try {
      // Utiliser notre API backend qui fait le proxy vers l'API gouvernementale
      const response = await fetch(`${API_BASE_URL}/delais/jours-feries/${annee}`)
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.success && result.data) {
          // Mettre en cache avec expiration (24h)
          this.joursFeriesCache[annee] = result.data
          this.cacheExpiration[annee] = Date.now() + (24 * 60 * 60 * 1000)
        } else {
          console.warn(`Erreur API jours fériés pour ${annee}:`, result.error)
        }
      } else {
        console.warn(`Erreur HTTP jours fériés pour ${annee}:`, response.status)
      }
    } catch (error) {
      console.warn(`Erreur lors du chargement des jours fériés pour ${annee}:`, error)
    } finally {
      this.isLoadingJoursFeries = false
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

  // Calculer une date limite avec prise en compte des jours fériés
  async calculerDateLimite(dateCommande, joursOuvrables, configurationJours) {
    try {
      const dateCommandeObj = new Date(dateCommande)
      let dateLimite = new Date(dateCommandeObj)
      let joursAjoutes = 0
      
      while (joursAjoutes < configurationJours) {
        dateLimite.setDate(dateLimite.getDate() + 1)
        
        const jourSemaine = dateLimite.getDay()
        const nomJour = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][jourSemaine]
        
        // Vérifier si c'est un jour ouvrable configuré ET pas un jour férié
        if (joursOuvrables[nomJour] && !(await this.estJourFerie(dateLimite))) {
          joursAjoutes++
        }
      }
      
      return { success: true, dateLimite: dateLimite.toISOString().split('T')[0] }
    } catch (error) {
      console.error('Erreur lors du calcul de la date limite:', error)
      return { success: false, error: error.message }
    }
  }

  // Récupérer l'historique des configurations
  async getHistorique() {
    try {
      const response = await fetch(`${API_BASE_URL}/delais/historique`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error)
      return { success: false, error: error.message }
    }
  }

  // Récupérer les jours fériés français
  async getJoursFeries() {
    try {
      const anneeActuelle = new Date().getFullYear()
      const anneeSuivante = anneeActuelle + 1
      
      // Charger les deux années si pas en cache
      if (!this.joursFeriesCache[anneeActuelle]) {
        await this.chargerJoursFeriesAnnee(anneeActuelle)
      }
      if (!this.joursFeriesCache[anneeSuivante]) {
        await this.chargerJoursFeriesAnnee(anneeSuivante)
      }
      
      // Combiner les deux années depuis le cache
      const tousJoursFeries = {
        ...(this.joursFeriesCache[anneeActuelle] || {}),
        ...(this.joursFeriesCache[anneeSuivante] || {})
      }
      
      return {
        success: true,
        joursFeries: tousJoursFeries
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des jours fériés:', error)
      return {
        success: false,
        error: error.message,
        joursFeries: {}
      }
    }
  }
}

export default new DelaiService()
