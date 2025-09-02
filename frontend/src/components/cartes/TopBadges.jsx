import React from 'react'

// Affiche les bandeaux supérieurs: EN RETARD et URGENT
const TopBadges = ({ showRetard, showUrgent }) => {
  return (
    <>
      {showRetard && (
        <div className="absolute top-0 left-0 right-0 h-2 bg-red-500 z-5 flex items-center justify-center">
          <span className="text-white text-xs font-bold px-2 py-1 bg-red-500 rounded-full clignoter mt-2">
            ⚠️ EN RETARD
          </span>
        </div>
      )}
      {showUrgent && (
        <div className="absolute top-0 left-0 right-0 h-2 bg-amber-500 z-5 flex items-center justify-center" style={{ marginTop: showRetard ? '14px' : '0' }}>
          <span className="text-white text-xs font-bold px-2 py-1 bg-amber-500 rounded-full mt-2">
            🚨 URGENT
          </span>
        </div>
      )}
    </>
  )
}

export default TopBadges


