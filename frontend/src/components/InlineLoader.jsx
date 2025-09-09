import React from 'react'

/**
 * Composant de chargement en ligne ultra-rapide
 * Optimisé pour des transitions instantanées
 */
const InlineLoader = ({ 
  size = 'default', 
  className = '',
  message = 'Chargement...',
  showMessage = false,
  variant = 'default', // default, minimal, card, fast
  animation = 'spin' // spin, pulse, bounce, none
}) => {
  const sizeClasses = {
    small: 'w-6 h-6 border-2',
    default: 'w-8 h-8 border-2',
    large: 'w-10 h-10 border-3'
  }

  const logoSizeClasses = {
    small: 'w-3 h-3',
    default: 'w-4 h-4',
    large: 'w-5 h-5'
  }

  const variants = {
    default: 'bg-black/80 backdrop-blur-sm',
    minimal: 'bg-transparent',
    card: 'bg-gray-100/90',
    fast: 'bg-transparent'
  }

  const animationClasses = {
    spin: 'animate-spin',
    pulse: 'animate-pulse',
    bounce: 'animate-bounce',
    none: ''
  }

  if (variant === 'minimal' || variant === 'fast') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className={`${sizeClasses[size]} border-gray-300 text-[var(--rose-clair-text)] ${animationClasses[animation]} flex items-center justify-center border-t-[var(--rose-clair-text)] rounded-full transition-all duration-150`}>
          <img 
            src="/logo-mc-blanc.png" 
            alt="Logo Maison Cléo" 
            className={`${logoSizeClasses[size]} object-contain`}
            loading="eager"
          />
        </div>
        {showMessage && (
          <p className="ml-2 text-gray-600 text-xs animate-pulse">{message}</p>
        )}
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className={`w-full h-full ${variants[variant]} flex items-center justify-center ${className} transition-all duration-150`}>
        <div className="flex-col gap-1 flex items-center justify-center">
          <div className={`${sizeClasses[size]} border-gray-300 text-[var(--rose-clair-text)] ${animationClasses[animation]} flex items-center justify-center border-t-[var(--rose-clair-text)] rounded-full`}>
            <img 
              src="/logo-mc-blanc.png" 
              alt="Logo Maison Cléo" 
              className={`${logoSizeClasses[size]} object-contain`}
              loading="eager"
            />
          </div>
          {showMessage && (
            <p className="text-gray-500 text-xs animate-pulse">{message}</p>
          )}
        </div>
      </div>
    )
  }

  // Variant par défaut (plein écran)
  return (
    <div className={`fixed inset-0 ${variants[variant]} flex items-center justify-center z-50 ${className} transition-all duration-200`}>
      <div className="flex-col gap-3 w-full flex items-center justify-center">
        <div className={`${sizeClasses[size]} border-gray-300 text-[var(--rose-clair-text)] ${animationClasses[animation]} flex items-center justify-center border-t-[var(--rose-clair-text)] rounded-full`}>
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

export default InlineLoader
