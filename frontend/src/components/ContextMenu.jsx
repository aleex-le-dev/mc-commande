import React, { useEffect, useRef } from 'react'
import { RiStickyNoteAddLine, RiStickyNoteFill } from 'react-icons/ri'

// Menu contextuel global personnalisé
// Props:
// - visible: bool d'affichage
// - position: { x, y } en px
// - items: [{ id, label, onClick, category?, icon? }]
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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const style = isMobile
    ? {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed',
        zIndex: 10000
      }
    : {
        top: Math.max(8, position.y),
        left: Math.max(8, position.x),
        position: 'fixed',
        zIndex: 10000
      }

  // Grouper par catégorie si fournie
  const groups = items.reduce((acc, item) => {
    const key = item.category || '__default__'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const orderedKeys = Object.keys(groups).sort((a, b) => {
    // Garder non catégorisés en premier, puis prioriser "Couturière" avant "Admin"
    if (a === '__default__') return -1
    if (b === '__default__') return 1
    if (a === 'Couturière' && b !== 'Couturière') return -1
    if (b === 'Couturière' && a !== 'Couturière') return 1
    return a.localeCompare(b)
  })

  const withEmoji = (cat) => {
    if (cat === 'Couturière') return '🧵 Couturière'
    if (cat === 'Admin') return '👑 Admin'
    return cat
  }

  return (
    <div ref={menuRef} style={style} className="min-w-[220px] max-w-[300px] sm:w-auto w-[90vw] max-h-[80vh] bg-[#182235] text-white border border-slate-700 rounded-xl shadow-2xl overflow-y-auto">
      <div className="py-1">
        {orderedKeys.map((key, idx) => (
          <div key={key} className="py-1">
            {key !== '__default__' && (
              <div className="px-3 py-1 text-xs uppercase tracking-wide text-slate-300 opacity-80">
                {withEmoji(key)}
              </div>
            )}
            <ul>
              {groups[key].map(item => {
                // Couleurs spécifiques pour les statuts
                let statusClass = "hover:bg-slate-700/60"
                if (item.id === 'change-status-en-cours') {
                  statusClass = "hover:bg-yellow-600/30 text-yellow-300"
                } else if (item.id === 'change-status-en-pause') {
                  statusClass = "hover:bg-orange-600/30 text-orange-300"
                } else if (item.id === 'change-status-termine') {
                  statusClass = "hover:bg-green-600/30 text-green-300"
                }
                
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => { item.onClick?.(); onClose(); }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${statusClass}`}
                    >
                      {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                      <span>{item.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {idx < orderedKeys.length - 1 && <div className="my-1 h-px bg-slate-600/40" />}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ContextMenu


