import React, { useEffect, useRef } from 'react'

// Menu contextuel global personnalisé
// Props:
// - visible: bool d'affichage
// - position: { x, y } en px
// - items: [{ id, label, onClick }]
// - onClose: fermeture
const ContextMenu = ({ visible, position, items = [], onClose }) => {
  const menuRef = useRef(null)

  useEffect(() => {
    if (!visible) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('mousedown', handleClick, true)
    window.addEventListener('keydown', handleEsc, true)
    return () => {
      window.removeEventListener('mousedown', handleClick, true)
      window.removeEventListener('keydown', handleEsc, true)
    }
  }, [visible, onClose])

  if (!visible) return null

  const style = {
    top: Math.max(8, position.y),
    left: Math.max(8, position.x),
    position: 'fixed',
    zIndex: 10000
  }

  return (
    <div ref={menuRef} style={style} className="min-w-[180px] max-w-[260px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden">
      <ul className="py-1">
        {items.map(item => (
          <li key={item.id}>
            <button
              onClick={() => { item.onClick?.(); onClose(); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100"
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ContextMenu


