import React from 'react'

const LoadingSpinner = ({ size = 'default', className = '' }) => {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="flex-col gap-4 w-full flex items-center justify-center">
        <div className="w-28 h-28 border-8 text-[var(--rose-clair-text)] text-4xl animate-spin border-gray-300 flex items-center justify-center border-t-[var(--rose-clair-text)] rounded-full">
          <img 
            src="/logo-mc-blanc.png" 
            alt="Logo Maison Cléo" 
            className="w-12 h-12 object-contain"
          />
        </div>
      </div>
    </div>
  )
}

export default LoadingSpinner
