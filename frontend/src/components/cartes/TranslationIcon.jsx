import React, { useState } from 'react'
import translationService from '../../services/translationService'

// Composant icône de traduction pour les cartes d'articles
const TranslationIcon = ({ article, className = "", onTranslate, isTranslated = false }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)

  // Fonction pour gérer le clic sur l'icône de traduction
  const handleTranslationClick = async (e) => {
    e.stopPropagation() // Empêcher la propagation du clic
    
    if (isTranslating) return // Éviter les clics multiples
    
    try {
      if (isTranslated) {
        // Si déjà traduit, remettre le texte original
        if (onTranslate) {
          onTranslate(null) // null pour indiquer qu'on revient au texte original
        }
      } else {
        // Sinon, traduire avec le service intelligent
        setIsTranslating(true)
        
        // Traduire le titre de l'article
        const translatedTitle = await translationService.translateToFrench(article.product_name || '')
        
        // Traduire la note si elle existe
        let translatedNote = null
        if (article.customerNote) {
          translatedNote = await translationService.translateToFrench(article.customerNote)
        }
        
        // Appeler la fonction de callback pour mettre à jour la carte
        if (onTranslate) {
          onTranslate({
            product_name: translatedTitle,
            customerNote: translatedNote
          })
        }
      }
      
    } catch (error) {
      console.error('Erreur lors de la traduction:', error)
    } finally {
      setIsTranslating(false)
    }
  }

  return (
    <button
      onClick={handleTranslationClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isTranslating}
      className={`w-10 h-10 rounded-full flex items-center justify-center border border-white/30 bg-transparent text-white/90 hover:bg-white/90 hover:text-black hover:border-white focus:outline-none focus:ring-2 focus:ring-white/40 transition-all duration-200 dark:hover:bg-white/20 dark:hover:text-white ${isTranslating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isTranslated ? 'bg-white/20 border-white/50' : ''} ${className}`}
      title={isTranslating ? "Traduction en cours..." : isTranslated ? "Remettre le texte original" : "Traduire en français"}
      aria-label={isTranslating ? "Traduction en cours" : isTranslated ? "Remettre le texte original" : "Traduire en français"}
    >
      {/* Icône de traduction avec indicateur de chargement */}
      {isTranslating ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="w-5 h-5"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 8l6 6" />
          <path d="M4 14l6-6 2-3" />
          <path d="M2 5h12" />
          <path d="M7 2h1" />
          <path d="M22 22l-5-10-5 10" />
          <path d="M14 18h6" />
        </svg>
      )}
    </button>
  )
}

export default TranslationIcon
