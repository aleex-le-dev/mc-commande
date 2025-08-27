import React from 'react'

/**
 * Composant de chargement en ligne réutilisable
 * Pour les chargements dans les composants (non plein écran)
 */
const InlineLoader = ({ 
  size = 'default', 
  className = '',
  message = 'Chargement...',
  showMessage = false,
  variant = 'default' // default, minimal, card
}) => {
  const sizeClasses = {
    small: 'w-8 h-8 border-2',
    default: 'w-12 h-12 border-4',
    large: 'w-16 h-16 border-4'
  }

  const logoSizeClasses = {
    small: 'w-4 h-4',
    default: 'w-6 h-6',
    large: 'w-8 h-8'
  }

  const variants = {
    default: 'bg-black',
    minimal: 'bg-transparent',
    card: 'bg-gray-100'
  }

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className={`${sizeClasses[size]} border-gray-300 text-[var(--rose-clair-text)] animate-spin flex items-center justify-center border-t-[var(--rose-clair-text)] rounded-full`}>
          <img 
            src="/logo-mc-blanc.png" 
            alt="Logo Maison Cléo" 
            className={`${logoSizeClasses[size]} object-contain`}
          />
        </div>
        {showMessage && (
          <p className="ml-3 text-gray-600 text-sm">{message}</p>
        )}
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className={`w-full h-full ${variants[variant]} flex items-center justify-center ${className}`}>
        <div className="flex-col gap-2 flex items-center justify-center">
          <div className={`${sizeClasses[size]} border-gray-300 text-[var(--rose-clair-text)] animate-spin flex items-center justify-center border-t-[var(--rose-clair-text)] rounded-full`}>
            <img 
              src="/logo-mc-blanc.png" 
              alt="Logo Maison Cléo" 
              className={`${logoSizeClasses[size]} object-contain`}
            />
          </div>
          {showMessage && (
            <p className="text-gray-500 text-xs">{message}</p>
          )}
        </div>
      </div>
    )
  }

  // Variant par défaut (plein écran)
  return (
    <div className={`fixed inset-0 ${variants[variant]} flex items-center justify-center z-50 ${className}`}>
      <div className="flex-col gap-4 w-full flex items-center justify-center">
        <div className={`${sizeClasses[size]} border-gray-300 text-[var(--rose-clair-text)] animate-spin flex items-center justify-center border-t-[var(--rose-clair-text)] rounded-full`}>
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

export default InlineLoader
