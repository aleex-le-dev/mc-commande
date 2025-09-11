// Router minimal sans dépendance
// - Synchronise l'onglet actif avec l'URL (/couture, /maille, /termine, /fourniture)
// - Gère navigation, hash et HTML5 history

import { useEffect, useState } from 'react'

// Déduire l'onglet depuis l'URL actuelle
export const getTabFromLocation = () => {
  try {
    const path = (window.location.hash?.replace(/^#/, '') || window.location.pathname || '').toLowerCase()
    if (path.includes('/maille')) return 'maille'
    if (path.includes('/termine') || path.includes('/terminé')) return 'termine'
    if (path.includes('/fourniture')) return 'fourniture'
    if (path.includes('/parametres') || path.includes('/paramètres')) return 'parametres'
    if (path.includes('/couture')) return 'couture'
  } catch {}
  return 'couture'
}

// Navigation programmée
export const navigateToTab = (tabId) => {
  try {
    const path = `/${tabId}`
    const isHashMode = window.location.hash && window.location.hash.startsWith('#/')
    if (isHashMode) {
      if (window.location.hash !== `#${path}`) window.location.hash = `#${path}`
    } else {
      if (window.location.pathname !== path) window.history.pushState({ tab: tabId }, '', path)
    }
    // Notifier le routeur interne pour mettre à jour l'état immédiatement
    window.dispatchEvent(new Event('mc-route-update'))
  } catch {}
}

// Hook pour synchroniser l'état courant avec l'URL
export const useRouteSync = () => {
  const [activeTab, setActiveTab] = useState(getTabFromLocation())

  useEffect(() => {
    const onNav = () => setActiveTab(getTabFromLocation())
    window.addEventListener('popstate', onNav)
    window.addEventListener('hashchange', onNav)
    window.addEventListener('mc-route-update', onNav)
    return () => {
      window.removeEventListener('popstate', onNav)
      window.removeEventListener('hashchange', onNav)
      window.removeEventListener('mc-route-update', onNav)
    }
  }, [])

  // Rediriger la racine vers /couture
  useEffect(() => {
    try {
      const isHashMode = window.location.hash && window.location.hash.startsWith('#/')
      const hasRoute = (isHashMode && window.location.hash.length > 2) || (!isHashMode && window.location.pathname && window.location.pathname !== '/')
      if (!hasRoute) {
        navigateToTab('couture')
        setActiveTab('couture')
      }
    } catch {}
  }, [])

  return { activeTab }
}


