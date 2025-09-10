/**
 * Service de préchargement global des images
 * Gère le préchargement intelligent en arrière-plan
 */

import ImageOptimizationService from './imageOptimizationService'

class GlobalPreloadService {
  constructor() {
    this.isInitialized = false
    this.preloadQueue = new Set()
    this.isPreloading = false
    this.preloadedPages = new Set() // Cache des pages déjà préchargées
  }

  /**
   * Initialiser le service de préchargement global
   */
  async initialize() {
    if (this.isInitialized) return
    
    this.isInitialized = true
    console.log('🚀 Service de préchargement global initialisé')
    
    // Vérifier s'il y a des articles avant de démarrer le préchargement
    const hasArticles = await this.checkForArticles()
    if (hasArticles) {
      // Démarrer le préchargement intelligent en arrière-plan
      this.startIntelligentPreloading()
    } else {
      console.log('🚫 Aucun article trouvé, préchargement d\'images annulé')
    }
  }

  /**
   * Vérifier s'il y a des articles dans la base de données
   */
  async checkForArticles() {
    try {
      // Utiliser le cache d'abord
      const cachedOrders = sessionStorage.getItem('mc-orders-cache')
      if (cachedOrders) {
        const orders = JSON.parse(cachedOrders)
        return orders && orders.length > 0
      }
      
      // Sinon, faire une requête rapide avec l'URL complète du backend
      const backendUrl = import.meta.env.DEV ? 'http://localhost:3001' : 'https://maisoncleo-commande.onrender.com'
      const response = await fetch(`${backendUrl}/api/orders?limit=1`)
      if (!response.ok) return false
      
      const data = await response.json()
      return data.orders && data.orders.length > 0
    } catch (error) {
      console.warn('Erreur vérification articles:', error)
      return false
    }
  }

  /**
   * Démarrer le préchargement intelligent
   */
  startIntelligentPreloading() {
    // Précharger les images les plus communes après un délai
    setTimeout(() => {
      this.preloadCommonImages()
    }, 2000) // Attendre 2 secondes après le chargement initial
  }

  /**
   * Précharger les images communes
   */
  async preloadCommonImages() {
    if (this.isPreloading) return
    
    this.isPreloading = true
    
    try {
      console.log('🔄 Préchargement intelligent des images communes...')
      
      // Récupérer les images des articles les plus récents
      // (Cette logique sera implémentée plus tard avec de vraies données)
      
      console.log('✅ Préchargement intelligent terminé')
    } catch (error) {
      console.warn('Erreur préchargement intelligent:', error)
    } finally {
      this.isPreloading = false
    }
  }

  /**
   * Précharger les images d'une page spécifique
   */
  async preloadPageImages(articles = [], pageType = 'unknown') {
    if (!articles || articles.length === 0) return

    try {
      // Vérifier si cette page a déjà été préchargée
      if (this.preloadedPages.has(pageType)) {
        const stats = ImageOptimizationService.getCacheStats()
        console.log(`⚡ Page ${pageType} déjà préchargée - navigation instantanée (cache: ${stats.cacheSize} images)`)
        return
      }

      // Vérifier si les images sont déjà en cache
      const stats = ImageOptimizationService.getCacheStats()
      if (stats.cacheSize > 10) { // Seuil plus élevé pour éviter les faux positifs
        console.log(`⚡ Images déjà en cache (${stats.cacheSize} images) - navigation instantanée`)
        this.preloadedPages.add(pageType)
        return
      }

      console.log(`🔄 Préchargement page ${pageType}: ${articles.length} articles (cache actuel: ${stats.cacheSize} images)`)
      await ImageOptimizationService.preloadPageImages(articles)
      
      // Vérifier le cache après préchargement
      const finalStats = ImageOptimizationService.getCacheStats()
      console.log(`✅ Page ${pageType} préchargée (cache final: ${finalStats.cacheSize} images)`)
      this.preloadedPages.add(pageType)
    } catch (error) {
      console.warn('Erreur préchargement page:', error)
    }
  }

  /**
   * Obtenir les statistiques du service
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      isPreloading: this.isPreloading,
      queueSize: this.preloadQueue.size,
      cacheStats: ImageOptimizationService.getCacheStats()
    }
  }
}

// Instance singleton
const globalPreloadService = new GlobalPreloadService()

export default globalPreloadService
