import React from 'react'

/**
 * Spinner ultra-rapide optimisé pour Render
 * Animations minimales et transitions instantanées
 */
const UltraFastSpinner = ({ 
  size = 'default', 
  variant = 'minimal',
  className = '',
  message = '',
  showMessage = false
}) => {
  const sizeClasses = {
    tiny: 'w-3 h-3',
    small: 'w-4 h-4',
    default: 'w-6 h-6',
    large: 'w-8 h-8'
  }

  const variants = {
    minimal: 'border-gray-300 border-t-blue-500',
    fast: 'border-gray-200 border-t-green-500',
    smooth: 'border-gray-100 border-t-purple-500',
    pulse: 'bg-blue-500'
  }

  const animationClasses = {
    minimal: 'animate-spin',
    fast: 'animate-pulse',
    smooth: 'animate-bounce',
    pulse: 'animate-ping'
  }

  if (variant === 'pulse') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className={`${sizeClasses[size]} ${variants[variant]} rounded-full ${animationClasses[variant]}`}></div>
        {showMessage && message && (
          <span className="ml-2 text-xs text-gray-600 animate-pulse">{message}</span>
        )}
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} border-2 ${variants[variant]} rounded-full ${animationClasses[variant]}`}></div>
      {showMessage && message && (
        <span className="ml-2 text-xs text-gray-600 animate-pulse">{message}</span>
      )}
    </div>
  )
}

export default UltraFastSpinner
