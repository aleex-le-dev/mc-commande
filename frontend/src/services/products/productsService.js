/**
 * Service spécialisé pour la gestion des produits
 * Responsabilité unique : gestion des produits et permalinks
 */
import HttpClientService from '../http/httpClientService.js'

/**
 * Service des produits
 */
export const ProductsService = {
  /**
   * Récupérer le permalink d'un produit
   */
  async getProductPermalink(productId) {
    try {
      const response = await HttpClientService.get(`/products/${productId}/permalink`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.permalink || null
    } catch (error) {
      console.error('Erreur récupération permalink produit:', error)
      return null
    }
  },

  /**
   * Récupérer les permalinks de plusieurs produits en lot
   */
  async getProductPermalinksBatch(productIds) {
    try {
      const response = await HttpClientService.post('/products/permalinks/batch', {
        product_ids: productIds
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      return data.permalinks || {}
    } catch (error) {
      console.error('Erreur récupération permalinks batch:', error)
      return {}
    }
  },

  /**
   * Récupérer les informations d'un produit
   */
  async getProduct(productId) {
    try {
      const response = await HttpClientService.get(`/products/${productId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Erreur récupération produit:', error)
      return null
    }
  },

  /**
   * Récupérer les images d'un produit
   */
  async getProductImages(productId) {
    try {
      const response = await HttpClientService.get(`/products/${productId}/images`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.images || []
    } catch (error) {
      console.error('Erreur récupération images produit:', error)
      return []
    }
  }
}

export default ProductsService
