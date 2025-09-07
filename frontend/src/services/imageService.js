/**
 * Service de gestion des images ultra-simple et ultra-rapide
 * Affichage direct depuis MongoDB - code ultra-propre
 */

class ImageService {
  constructor() {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    this.backendUrl = `${apiBase}/api/images`
  }

  /**
   * Récupère une image directement depuis MongoDB (ultra-rapide)
   */
  getImage(productId) {
    if (!productId) return this.getDefaultPlaceholder()
    
    // Retour direct de l'URL MongoDB - pas de cache !
    return `${this.backendUrl}/${productId}`
  }

  /**
   * Placeholder SVG ultra-léger
   */
  getDefaultPlaceholder() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIyMCIgZmlsbD0iIzlCOUJBMCIvPgo8cmVjdCB4PSI3MCIgeT0iMTEwIiB3aWR0aD0iNjAiIGhlaWdodD0iOCIgcng9IjQiIGZpbGw9IiM5QjlCQTAiLz4KPHJlY3QgeD0iODAiIHk9IjEyNSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjYiIHJ4PSIzIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPgo='
  }
}

// Instance singleton
const imageService = new ImageService()

export default imageService
