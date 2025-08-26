import React from 'react'

// Composant pour injecter les styles CSS des cartes
const CardStyles = () => {
  const cardStyles = `
    :root {
      --accent-pink: 236, 72, 153; /* RGB du rose réutilisable */
    }
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes pinkBlink {
      0%, 100% { box-shadow: 0 0 0 0 rgba(var(--accent-pink), 0.0); }
      50% { box-shadow: 0 0 0 4px rgba(var(--accent-pink), 0.35); }
    }
    .animate-pink-blink { animation: pinkBlink 1s ease-in-out infinite; }
    .border-accent { border-color: rgba(var(--accent-pink), 0.75); }
    .highlight-accent { background-color: rgba(var(--accent-pink), 0.25); color: rgb(var(--accent-pink)); border-radius: 0.25rem; padding: 0 0.15rem; }
    
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `

  return <style dangerouslySetInnerHTML={{ __html: cardStyles }} />
}

export default CardStyles
