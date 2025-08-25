import React from 'react'

const LoadingSpinner = ({ 
  size = 'default', 
  centerLetter = 'M', 
  topEmoji = '🧵', 
  rightEmoji = '🪡', 
  bottomEmoji = '🧵', 
  leftEmoji = '🪡',
  className = ''
}) => {
  // Tailles prédéfinies
  const sizes = {
    small: {
      center: 'text-2xl',
      emojis: 'text-lg',
      container: 'py-6'
    },
    default: {
      center: 'text-4xl',
      emojis: 'text-2xl',
      container: 'py-12'
    },
    large: {
      center: 'text-6xl',
      emojis: 'text-3xl',
      container: 'py-16'
    }
  }

  const currentSize = sizes[size] || sizes.default

  return (
    <div className={`flex justify-center items-center ${currentSize.container} ${className}`}>
      <div className="relative">
        {/* Lettre au centre */}
        <div className={`${currentSize.center} font-bold text-black z-10 relative`}>
          {centerLetter}
        </div>
        
        {/* Emojis qui tournent autour */}
        <div className="absolute inset-0 animate-spin">
          <div className={`absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${currentSize.emojis}`} style={{ marginTop: '-20px' }}>
            {topEmoji}
          </div>
          <div className={`absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 ${currentSize.emojis}`} style={{ marginRight: '-20px' }}>
            {rightEmoji}
          </div>
          <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 ${currentSize.emojis}`} style={{ marginBottom: '-20px' }}>
            {bottomEmoji}
          </div>
          <div className={`absolute top-1/2 left-0 transform -translate-x-1/2 -translate-y-1/2 ${currentSize.emojis}`} style={{ marginLeft: '-20px' }}>
            {leftEmoji}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoadingSpinner
