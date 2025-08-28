import React, { useState } from 'react'

// Composant icône de traduction pour les cartes d'articles
const TranslationIcon = ({ article, className = "" }) => {
  const [isHovered, setIsHovered] = useState(false)

  // Fonction pour gérer le clic sur l'icône de traduction
  const handleTranslationClick = (e) => {
    e.stopPropagation() // Empêcher la propagation du clic
    
    // Ici vous pourrez ajouter la logique de traduction
    // Par exemple : ouvrir un modal, traduire le nom du produit, etc.
    console.log('Traduction demandée pour:', article.product_name)
    
    // Pour l'instant, on affiche juste une alerte
    alert(`Traduction demandée pour : ${article.product_name}`)
  }

  return (
    <button
      onClick={handleTranslationClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`w-10 h-10 rounded-full flex items-center justify-center border border-white/30 bg-transparent text-white/90 hover:bg-white/90 hover:text-black hover:border-white focus:outline-none focus:ring-2 focus:ring-white/40 transition-all duration-200 ${className}`}
      title="Traduire le nom du produit"
      aria-label="Traduire le nom du produit"
    >
      {/* Icône de traduction */}
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
    </button>
  )
}

export default TranslationIcon
