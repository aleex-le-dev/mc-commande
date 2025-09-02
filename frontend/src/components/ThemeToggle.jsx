import React, { useEffect, useState } from 'react'
import { MdOutlineWbSunny } from 'react-icons/md'
import { FaMoon } from 'react-icons/fa6'

// Bouton de bascule thème clair/sombre, persistant via localStorage
const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('mc_theme')
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const useDark = saved ? saved === 'dark' : prefersDark
    setIsDark(useDark)
    document.documentElement.classList.toggle('dark', useDark)
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('mc_theme', next ? 'dark' : 'light')
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors cursor-pointer hover:bg-[var(--bg-tertiary)]"
      style={{ color: 'var(--text-secondary)' }}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
      aria-label={isDark ? 'Mode clair' : 'Mode sombre'}
    >
      {isDark ? (
        <MdOutlineWbSunny aria-hidden="true" className="w-5 h-5" style={{ color: '#fbbf24' }} />
      ) : (
        <FaMoon aria-hidden="true" className="w-5 h-5" />
      )}
    </button>
  )
}

export default ThemeToggle


