// En dev: backend local; en prod: Render ou VITE_API_URL
const API_BASE_URL = `${(import.meta.env.DEV ? 'http://localhost:3001' : (import.meta.env.VITE_API_URL || 'https://maisoncleo-commande.onrender.com'))}/api`

// Petit wrapper avec retry/backoff pour limiter les erreurs réseau au démarrage
async function fetchWithRetry(url, options = {}, retries = 2) {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    /* log désactivé */
    controller.abort()
  }, options.timeoutMs || 15000) // Augmenté à 15 secondes
  
  try {
    const res = await fetch(url, { credentials: 'include', ...options, signal: controller.signal })
    if (!res.ok) {
      if (retries > 0 && res.status >= 500) {
        /* log désactivé */
        await new Promise(r => setTimeout(r, (options.backoffMs || 300) * (3 - retries)))
        return fetchWithRetry(url, options, retries - 1)
      }
    }
    return res
  } catch (e) {
    if (e && e.name === 'AbortError') {
      /* log désactivé */
      throw e
    }
    if (retries > 0) {
      /* log désactivé */
      await new Promise(r => setTimeout(r, (options.backoffMs || 300) * (3 - retries)))
      return fetchWithRetry(url, options, retries - 1)
    }
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

class DelaiService {
  constructor() {
    // Cache pour les jours fériés
    this.joursFeriesCache = {}
    this.cacheExpiration = {}
    this.isLoadingJoursFeries = false
    // Anti-rafale en cas d'échec backend
    this.lastFailureAt = {}
    this.failureCooldownMs = 10 * 60 * 1000
    // Nouveaux attributs pour getDateLimiteActuelle
    this.isLoadingDateLimite = false
    this.lastDateLimiteFailure = 0
  }

  // Récupérer la configuration actuelle du délai
  async getDelai() {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/delais/configuration`, {
        timeoutMs: 8000 // Réduit à 8 secondes
      })
      const data = await response.json()
      return data
    } catch (error) {
      if (error.name === 'AbortError') {
        /* log désactivé */
        return { success: false, error: 'Timeout - serveur trop lent' }
      }
      /* log désactivé */
      return { success: false, error: error.message }
    }
  }

  // Récupérer la date limite actuelle depuis la configuration
  async getDateLimiteActuelle() {
    try {
      // Éviter les appels multiples simultanés
      if (this.isLoadingDateLimite) {
        return { success: false, error: 'Chargement en cours' }
      }
      
      // Éviter les appels répétés en cas d'échec récent (5 minutes)
      if (this.lastDateLimiteFailure && (Date.now() - this.lastDateLimiteFailure) < 5 * 60 * 1000) {
        /* log désactivé */
        return { success: false, error: 'Échec récent, réessayez plus tard' }
      }
      
      this.isLoadingDateLimite = true
      
      const configuration = await this.getDelai() // Utiliser getDelai pour obtenir la configuration
      
      if (!configuration || !configuration.data || !configuration.data.joursOuvrables) {
        this.isLoadingDateLimite = false
        return { success: false, error: 'Configuration des délais non trouvée' }
      }
      
      const dateLimite = await this.calculerDateLimite(
        new Date().toISOString(),
        configuration.data.joursOuvrables,
        configuration.data.delaiJours
      )
      
      this.isLoadingDateLimite = false
      return dateLimite
    } catch (error) {
      this.isLoadingDateLimite = false
      this.lastDateLimiteFailure = Date.now()
      
      if (error.name === 'AbortError') {
        /* log désactivé */
        return { success: false, error: 'Timeout - serveur trop lent' }
      }
      
      /* log désactivé */
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
      
      // Si pas en cache ou expiré, charger depuis l'API (sauf si cooldown suite à un échec récent)
      const lastFail = this.lastFailureAt[annee] || 0
      const inCooldown = Date.now() - lastFail < this.failureCooldownMs
      if (!this.isLoadingJoursFeries && !inCooldown) {
        await this.chargerJoursFeriesAnnee(annee)
      }
      
      // Retourner depuis le cache
      return this.joursFeriesCache[annee] && this.joursFeriesCache[annee][dateStr] !== undefined
    } catch (error) {
      /* log désactivé */
      return false
    }
  }

  // Charger les jours fériés pour une année spécifique
  async chargerJoursFeriesAnnee(annee) {
    if (this.isLoadingJoursFeries) return
    
    this.isLoadingJoursFeries = true
    
    try {
      // Utiliser notre API backend qui fait le proxy vers l'API gouvernementale
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout pour production lente
      
      const response = await fetch(`${API_BASE_URL}/delais/jours-feries/${annee}`, { 
        credentials: 'include',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.success && result.data) {
          // Mettre en cache avec expiration (24h)
          this.joursFeriesCache[annee] = result.data
          this.cacheExpiration[annee] = Date.now() + (24 * 60 * 60 * 1000)
        } else {
          /* log désactivé */
        }
      } else {
        /* log désactivé */
        this.lastFailureAt[annee] = Date.now()
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn(`[DELAI] Timeout jours fériés ${annee}`)
      }
      this.lastFailureAt[annee] = Date.now()
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
        body: JSON.stringify(configuration),
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde de la configuration')
      }
      
      return await response.json()
    } catch (error) {
      /* log désactivé */
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
      /* log désactivé */
      return { success: false, error: error.message }
    }
  }

  // Récupérer l'historique des configurations
  async getHistorique() {
    try {
      const response = await fetch(`${API_BASE_URL}/delais/historique`, { credentials: 'include' })
      const data = await response.json()
      return data
    } catch (error) {
      /* log désactivé */
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
      /* log désactivé */
      return {
        success: false,
        error: error.message,
        joursFeries: {}
      }
    }
  }
}

export default new DelaiService()
