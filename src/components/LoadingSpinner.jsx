import React from 'react'

const LoadingSpinner = ({ size = 'default', className = '' }) => {
  const sizes = {
    small: { container: 'py-6', width: 'w-40', travel: 'calc(100% - 2.5rem - 8px)', scissor: 'text-xl' },
    default: { container: 'py-10', width: 'w-64', travel: 'calc(100% - 2.5rem - 8px)', scissor: 'text-2xl' },
    large: { container: 'py-16', width: 'w-80', travel: 'calc(100% - 2.5rem - 8px)', scissor: 'text-3xl' }
  }

  const current = sizes[size] || sizes.default

  return (
    <div className={`flex justify-center items-center ${current.container} ${className}`}>
      <style>{`
        @keyframes mc-cut {
          0% { transform: translateY(-50%) translateX(0); }
          100% { transform: translateY(-50%) translateX(${current.travel}); }
        }
        @keyframes mc-sparkle {
          0% { opacity: 0; transform: scale(0.6); }
          50% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.6); }
        }
      `}</style>

      <div className={`relative ${current.width} h-16`}> 
        {/* Ligne en pointillés */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2">
          <div className="h-0.5 border-t-2 border-dashed border-gray-400"></div>
        </div>

        {/* Ciseaux animés */}
        <div
          className={`absolute top-1/2 -translate-y-0.5 ${current.scissor}`}
          style={{ animation: 'mc-cut 1.8s linear infinite', left: 0 }}
          aria-label="loading"
        >
          <span className="inline-block transform -rotate-90 leading-none">✂️</span>
        </div>

        {/* Étincelles minimalistes qui apparaissent le long de la coupe */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-blue-500"
            style={{
              left: `${(i + 1) * 14}%`,
              animation: `mc-sparkle 1.6s ease-in-out ${(i * 0.12).toFixed(2)}s infinite`
            }}
          />
        ))}

        {/* Monogramme au bout de la ligne */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2">
          <div className="h-10 w-10 rounded-full bg-white shadow-md flex items-center justify-center border border-gray-200">
            <span className="font-semibold text-gray-900">M</span>
          </div>
        </div>
      </div>

      {/* Texte subtil */}
      <div className="sr-only">Chargement…</div>
    </div>
  )
}

export default LoadingSpinner
