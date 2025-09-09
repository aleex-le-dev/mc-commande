import React from 'react'

/**
 * Composant de chargement de page ultra-rapide
 * Animation optimisée pour des transitions instantanées
 */
const PageLoader = ({ 
  size = 'default', 
  className = '',
  message = 'Chargement...',
  showMessage = true,
  variant = 'fast' // fast, smooth, minimal
}) => {
  const sizeClasses = {
    small: 'w-16 h-16 border-2 text-lg',
    default: 'w-24 h-24 border-3 text-3xl',
    large: 'w-28 h-28 border-4 text-4xl'
  }

  const logoSizeClasses = {
    small: 'w-6 h-6',
    default: 'w-8 h-8',
    large: 'w-10 h-10'
  }

  const animationClasses = {
    fast: 'animate-spin',
    smooth: 'animate-pulse',
    minimal: 'animate-bounce'
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-200">
      <div className="flex-col gap-3 w-full flex items-center justify-center">
        <div className={`${sizeClasses[size]} border-gray-300 text-[var(--rose-clair-text)] ${animationClasses[variant]} flex items-center justify-center border-t-[var(--rose-clair-text)] rounded-full ${className}`}>
          <img 
            src="/logo-mc-blanc.png" 
            alt="Logo Maison Cléo" 
            className={`${logoSizeClasses[size]} object-contain`}
            loading="eager"
          />
        </div>
        {showMessage && (
          <p className="text-white text-sm font-medium animate-pulse">{message}</p>
        )}
      </div>
    </div>
  )
}

export default PageLoader
