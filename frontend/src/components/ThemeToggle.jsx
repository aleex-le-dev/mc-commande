import React, { useEffect, useState } from 'react'

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
      className="p-2 rounded-md border border-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer mr-2"
      title={isDark ? 'Thème sombre activé' : 'Activer le thème sombre'}
      aria-label="Basculer le thème"
    >
      {isDark ? '🌙' : '☀️'}
    </button>
  )
}

export default ThemeToggle


