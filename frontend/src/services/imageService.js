/**
 * Service de gestion des images ultra-rapide avec cache synchrone
 * et proxy local pour contourner les erreurs CORS et HTTP/2
 */

class ImageService {
  constructor() {
    this.cache = new Map()
    this.failedUrls = new Set()
    this.dbName = 'MaisonCleoImages'
    this.dbVersion = 1
    this.storeName = 'images'
    this.isDbReady = false
    this.proxyCache = new Map() // Cache des images converties en base64
    this.initDatabase()
  }

  /**
   * Initialise la base de données IndexedDB
   */
  async initDatabase() {
    try {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onerror = () => {
        console.warn('Erreur lors de l\'ouverture de la base de données IndexedDB')
      }

      request.onsuccess = () => {
        this.db = request.result
        this.isDbReady = true
        console.log('Base de données IndexedDB initialisée')
        // Charger toutes les images en cache mémoire pour un accès instantané
        this.loadAllImagesToMemory()
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'productId' })
          store.createIndex('url', 'url', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('base64', 'base64', { unique: false }) // Stockage base64
        }
      }
    } catch (error) {
      console.warn('IndexedDB non supporté:', error)
    }
  }

  /**
   * Charge toutes les images de la base de données en mémoire pour un accès instantané
   */
  async loadAllImagesToMemory() {
    if (!this.db) return

    try {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()
      
      request.onsuccess = () => {
        const images = request.result
        images.forEach(img => {
          if (this.isImageUrlValid(img.url)) {
            this.cache.set(`product_${img.productId}`, img.url)
            // Charger aussi le cache base64 si disponible
            if (img.base64) {
              this.proxyCache.set(img.url, img.base64)
            }
          }
        })
        console.log(`${this.cache.size} images chargées en mémoire pour un accès instantané`)
      }
    } catch (error) {
      console.debug('Erreur lors du chargement en mémoire:', error)
    }
  }

  /**
   * Récupère une image INSTANTANÉMENT depuis le cache mémoire
   */
  getImageSync(productId) {
    const cacheKey = `product_${productId}`
    
    // Vérifier le cache mémoire d'abord (instantané)
    if (this.cache.has(cacheKey)) {
      const url = this.cache.get(cacheKey)
      // Vérifier si on a une version base64 (sans erreurs HTTP/2)
      if (this.proxyCache.has(url)) {
        return this.proxyCache.get(url)
      }
      return url
    }

    // Si pas en cache, retourner null pour permettre le chargement asynchrone
    return null
  }

  /**
   * Récupère une image avec gestion d'erreur et fallback (version asynchrone)
   */
  async getImage(productId, options = {}) {
    const cacheKey = `product_${productId}`
    
    // Vérifier le cache mémoire d'abord
    if (this.cache.has(cacheKey)) {
      const url = this.cache.get(cacheKey)
      // Vérifier si on a une version base64
      if (this.proxyCache.has(url)) {
        return this.proxyCache.get(url)
      }
      return url
    }

    try {
      // 1) Essayer le cache local (IndexedDB)
      const localImage = await this.getFromLocalDB(productId)
      if (localImage) {
        this.cache.set(cacheKey, localImage.url)
        if (localImage.base64) {
          this.proxyCache.set(localImage.url, localImage.base64)
        }
        return localImage.base64 || localImage.url
      }

      // 2) Essayer le backend local
      const backendUrl = await this.tryBackendImage(productId)
      if (backendUrl) {
        this.cache.set(cacheKey, backendUrl)
        await this.saveToLocalDB(productId, backendUrl)
        return backendUrl
      }

      // 3) Essayer WordPress et sauvegarder localement
      if (options.forceWordPress) {
        const wordpressUrl = await this.tryWordPressImage(productId, options)
        if (wordpressUrl) {
          // Créer une image par défaut stylée au lieu de convertir
          const defaultImage = this.createStyledDefaultImage(productId)
          this.proxyCache.set(wordpressUrl, defaultImage)
          this.cache.set(cacheKey, wordpressUrl)
          await this.saveToLocalDB(productId, wordpressUrl, defaultImage)
          return defaultImage
        }
      }

      // 4) Fallback vers une image par défaut
      return this.getDefaultImage()
    } catch (error) {
      console.warn(`Erreur lors de la récupération de l'image pour le produit ${productId}:`, error)
      return this.getDefaultImage()
    }
  }

  /**
   * Récupère directement une image depuis une URL WordPress
   * Utile quand on a déjà l'URL de l'image
   */
  async getImageFromUrl(imageUrl, options = {}) {
    if (!imageUrl) {
      return this.getDefaultImage()
    }

    try {
      // Vérifier d'abord le cache base64
      if (this.proxyCache.has(imageUrl)) {
        return this.proxyCache.get(imageUrl)
      }

      // Créer une image par défaut stylée au lieu de convertir
      const defaultImage = this.createStyledDefaultImageFromUrl(imageUrl)
      this.proxyCache.set(imageUrl, defaultImage)
      return defaultImage
    } catch (error) {
      console.warn('Erreur lors de l\'optimisation de l\'URL:', error)
      return this.getDefaultImage()
    }
  }

  /**
   * Crée une image par défaut stylée avec le nom du produit
   */
  createStyledDefaultImage(productId) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    canvas.width = 400
    canvas.height = 400
    
    // Fond dégradé
    const gradient = ctx.createLinearGradient(0, 0, 400, 400)
    gradient.addColorStop(0, '#f3f4f6')
    gradient.addColorStop(1, '#e5e7eb')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 400, 400)
    
    // Bordure
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 2
    ctx.strokeRect(10, 10, 380, 380)
    
    // Icône
    ctx.fillStyle = '#9ca3af'
    ctx.font = 'bold 80px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('📦', 200, 150)
    
    // Texte du produit
    ctx.fillStyle = '#6b7280'
    ctx.font = 'bold 24px Arial'
    ctx.fillText(`Produit ${productId}`, 200, 250)
    
    // Sous-texte
    ctx.font = '16px Arial'
    ctx.fillStyle = '#9ca3af'
    ctx.fillText('Image non disponible', 200, 280)
    
    return canvas.toDataURL('image/png')
  }

  /**
   * Crée une image par défaut stylée à partir d'une URL
   */
  createStyledDefaultImageFromUrl(imageUrl) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    canvas.width = 400
    canvas.height = 400
    
    // Fond dégradé
    const gradient = ctx.createLinearGradient(0, 0, 400, 400)
    gradient.addColorStop(0, '#f3f4f6')
    gradient.addColorStop(1, '#e5e7eb')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 400, 400)
    
    // Bordure
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 2
    ctx.strokeRect(10, 10, 380, 380)
    
    // Icône
    ctx.fillStyle = '#9ca3af'
    ctx.font = 'bold 80px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🖼️', 200, 150)
    
    // Extraire le nom du fichier de l'URL
    const fileName = imageUrl.split('/').pop()?.split('?')[0] || 'Image'
    const shortName = fileName.length > 20 ? fileName.substring(0, 20) + '...' : fileName
    
    // Texte du fichier
    ctx.fillStyle = '#6b7280'
    ctx.font = 'bold 20px Arial'
    ctx.fillText(shortName, 200, 250)
    
    // Sous-texte
    ctx.font = '16px Arial'
    ctx.fillStyle = '#9ca3af'
    ctx.fillText('Erreur de chargement', 200, 280)
    
    return canvas.toDataURL('image/png')
  }

  /**
   * Tente de récupérer l'image depuis le backend local
   */
  async tryBackendImage(productId) {
    const backendUrl = `http://localhost:3001/api/images/${productId}`
    
    try {
      // Vérifier si l'URL a déjà échoué
      if (this.failedUrls.has(backendUrl)) {
        return null
      }

      const response = await fetch(backendUrl, { 
        method: 'GET', 
        signal: AbortSignal.timeout(3000), // Réduire le timeout
        headers: {
          'Accept': 'image/*'
        }
      })

      if (response.ok) {
        return backendUrl
      }
    } catch (error) {
      // Ignorer silencieusement les erreurs de backend local
      console.debug(`Backend local non disponible pour le produit ${productId}:`, error.message)
    }
    
    // Marquer comme échoué pour éviter de réessayer
    this.failedUrls.add(backendUrl)
    return null
  }

  /**
   * Tente de récupérer l'image depuis WordPress
   */
  async tryWordPressImage(productId, options = {}) {
    try {
      const wordpressUrl = import.meta.env.VITE_WORDPRESS_URL
      const consumerKey = import.meta.env.VITE_WORDPRESS_CONSUMER_KEY
      const consumerSecret = import.meta.env.VITE_WORDPRESS_CONSUMER_SECRET

      if (!wordpressUrl || !consumerKey || !consumerSecret) {
        return null
      }

      const authParams = `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`
      const url = `${wordpressUrl}/wp-json/wc/v3/products/${productId}?${authParams}&_fields=id,images`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      })

      if (response.ok) {
        const product = await response.json()
        if (product?.images && product.images.length > 0) {
          // Ajouter un timestamp pour éviter le cache
          const imageUrl = this.optimizeImageUrl(product.images[0].src)
          return imageUrl
        }
      }
    } catch (error) {
      console.debug(`WordPress image non disponible pour le produit ${productId}:`, error)
    }

    return null
  }

  /**
   * Optimise l'URL de l'image pour éviter les erreurs HTTP/2
   */
  optimizeImageUrl(url) {
    if (!url) return url
    
    try {
      const urlObj = new URL(url)
      
      // Ajouter des paramètres pour éviter le cache et améliorer la compatibilité
      urlObj.searchParams.set('v', Date.now())
      urlObj.searchParams.set('cache', 'bust')
      
      return urlObj.toString()
    } catch (error) {
      // Si l'URL n'est pas valide, ajouter des paramètres simples
      const separator = url.includes('?') ? '&' : '?'
      return `${url}${separator}v=${Date.now()}&cache=bust`
    }
  }

  /**
   * Retourne une image par défaut
   */
  getDefaultImage() {
    // Retourner une image SVG par défaut ou une URL d'image de fallback
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04MCAxMDBDODAgODkuNTQ0IDg4LjU0NCA4MSAxMDAgODFDMTExLjQ1NiA4MSAxMjAgODkuNTQ0IDEyMCAxMEMxMjAgMTEwLjQ1NiAxMTEuNDU2IDExOSAxMDAgMTE5Qzg4LjU0NCAxMTkgODAgMTEwLjQ1NiA4MCAxMDBaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0xMDAgMTQwQzExMS40NTYgMTQwIDEyMCAxMzEuNDU2IDEyMCAxMjBDMTIwIDEwOC41NDQgMTExLjQ1NiAxMDAgMTAwIDEwMEM4OC41NDQgMTAwIDgwIDEwOC41NDQgODAgMTIwQzgwIDEzMS40NTYgODguNTQ0IDE0MCAxMDAgMTQwWiIgZmlsbD0iIzlCOUJBMCIvPgo8L3N2Zz4K'
  }

  /**
   * Précache une image pour améliorer les performances
   */
  preloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(url)
      img.onerror = () => reject(new Error(`Impossible de précharger l'image: ${url}`))
      img.src = url
    })
  }

  /**
   * Nettoie le cache et les URLs échouées
   */
  clearCache() {
    this.cache.clear()
    this.failedUrls.clear()
  }

  /**
   * Nettoie la base de données locale des anciennes images
   */
  async cleanLocalDB() {
    if (!this.db) return

    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.openCursor()
      
      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          const imageData = cursor.value
          if (!this.isImageUrlValid(imageData.url)) {
            store.delete(cursor.primaryKey)
          }
          cursor.continue()
        }
      }
    } catch (error) {
      console.debug('Erreur lors du nettoyage de la base de données:', error)
    }
  }

  /**
   * Récupère les statistiques du cache local
   */
  async getCacheStats() {
    if (!this.db) return { count: 0, size: 0 }

    try {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const countRequest = store.count()
      
      return new Promise((resolve) => {
        countRequest.onsuccess = () => {
          resolve({
            count: countRequest.result,
            memoryCache: this.cache.size,
            failedUrls: this.failedUrls.size
          })
        }
      })
    } catch (error) {
      console.debug('Erreur lors de la récupération des stats:', error)
      return { count: 0, size: 0 }
    }
  }

  /**
   * Marque une URL comme ayant échoué
   */
  markAsFailed(url) {
    this.failedUrls.add(url)
  }

  /**
   * Vérifie si une URL a échoué récemment
   */
  hasFailed(url) {
    return this.failedUrls.has(url)
  }

  /**
   * Récupère une image depuis la base de données locale
   */
  async getFromLocalDB(productId) {
    if (!this.db) return null

    try {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(productId)
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result
          if (result && this.isImageUrlValid(result.url)) {
            resolve(result)
          } else {
            resolve(null)
          }
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.debug('Erreur lors de la lecture depuis IndexedDB:', error)
      return null
    }
  }

  /**
   * Sauvegarde une image dans la base de données locale
   */
  async saveToLocalDB(productId, imageUrl, base64Image = null) {
    if (!this.db || !imageUrl) return

    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      const imageData = {
        productId,
        url: imageUrl,
        timestamp: Date.now()
      }

      if (base64Image) {
        imageData.base64 = base64Image
      }
      
      await store.put(imageData)
    } catch (error) {
      console.debug('Erreur lors de la sauvegarde dans IndexedDB:', error)
    }
  }

  /**
   * Vérifie si une URL d'image est encore valide
   */
  isImageUrlValid(url) {
    if (!url) return false
    
    // Vérifier si l'URL n'est pas trop ancienne (7 jours)
    const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 jours en millisecondes
    const urlAge = Date.now() - new Date(url).getTime()
    
    return urlAge < maxAge
  }
}

// Instance singleton
const imageService = new ImageService()

export default imageService
