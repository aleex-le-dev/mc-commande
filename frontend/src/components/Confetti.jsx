import React from 'react'
import ConfettiExplosion from 'react-confetti-explosion'

const Confetti = ({ isActive, position = { x: 0, y: 0 } }) => {
  if (!isActive) {
    return null
  }

  console.log('🎉 Confetti rendu à la position:', position)

  return (
    <div style={{ 
      position: 'relative',
      zIndex: 999999999,
      pointerEvents: 'none'
    }}>
      <ConfettiExplosion
        force={0.6}
        duration={3000}
        particleCount={100}
        width={800}
        zIndex={999999999}
        portal={false}
        colors={['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd']}
      />
    </div>
  )
}

export default Confetti
