import React, { useState } from 'react'

// Composant pour afficher et dérouler les notes
const NoteExpander = ({ note }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const toggleNote = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setIsExpanded(!isExpanded)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const closeNote = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setIsExpanded(false)
    setTimeout(() => setIsAnimating(false), 300)
  }

  return (
    <div className="mb-4">
      {/* Bouton pour voir la note */}
      <button
        onClick={toggleNote}
        className="w-full flex items-center justify-between p-3 transition-all duration-300 cursor-pointer note-panel"
        id="mc-note-toggle"
        style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.5rem' }}
      >
        <div className="flex items-center">
          <span className="text-amber-600 mr-2">📝</span>
          <span className="text-sm font-medium note-text">Voir la note</span>
        </div>
        <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Note déroulée */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
      }`}>
        <div className="relative p-4 note-panel" id="mc-note-panel" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.5rem' }}>
          {/* Bouton de fermeture */}
          <button
            onClick={closeNote}
            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full transition-colors duration-200"
          >
            <svg className="w-4 h-4 text-amber-700 hover:text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Contenu de la note */}
          <div className="pr-8">
            <div className="text-sm note-text leading-relaxed" style={{ color: '#92400e' }}>
              <span className="font-medium">Note client:</span>
              <div className="mt-2 italic">"{note}"</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NoteExpander
