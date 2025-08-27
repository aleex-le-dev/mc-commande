import React from 'react'

/**
 * Composant de chargement de page réutilisable
 * Affiche le logo Maison Cléo avec animation de rotation
 */
const PageLoader = ({ 
  size = 'default', 
  className = '',
  message = 'Chargement...',
  showMessage = true
}) => {
  const sizeClasses = {
    small: 'w-16 h-16 border-4 text-lg',
    default: 'w-28 h-28 border-8 text-4xl',
    large: 'w-32 h-32 border-8 text-5xl'
  }

  const logoSizeClasses = {
    small: 'w-8 h-8',
    default: 'w-12 h-12',
    large: 'w-16 h-16'
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="flex-col gap-4 w-full flex items-center justify-center">
        <div className={`${sizeClasses[size]} border-gray-300 text-[var(--rose-clair-text)] animate-spin flex items-center justify-center border-t-[var(--rose-clair-text)] rounded-full ${className}`}>
          <img 
            src="/logo-mc-blanc.png" 
            alt="Logo Maison Cléo" 
            className={`${logoSizeClasses[size]} object-contain`}
          />
        </div>
        {showMessage && (
          <p className="text-white text-lg font-medium">{message}</p>
        )}
      </div>
    </div>
  )
}

export default PageLoader
