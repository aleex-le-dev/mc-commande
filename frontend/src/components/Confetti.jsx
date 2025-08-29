import React from 'react'
import ConfettiExplosion from 'react-confetti-explosion'

const Confetti = ({ isActive, position = { x: 0, y: 0 } }) => {
  if (!isActive) return null

  return (
    <div 
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 2147483647,
        pointerEvents: 'none',
        isolation: 'isolate',
        transform: 'translate(-50%, -50%)'
      }}
    >
      <ConfettiExplosion
        force={0.6}
        duration={2500}
        particleCount={80}
        width={800}
        colors={['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd']}
      />
    </div>
  )
}

export default Confetti
