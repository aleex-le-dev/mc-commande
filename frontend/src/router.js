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

// Déduire le sous-onglet des paramètres depuis l'URL
export const getParametresSubTabFromLocation = () => {
  try {
    const path = (window.location.hash?.replace(/^#/, '') || window.location.pathname || '').toLowerCase()
    if (path.includes('/parametres/couturiere') || path.includes('/paramètres/couturière')) return 'tricoteuses'
    if (path.includes('/parametres/date-limite') || path.includes('/paramètres/date-limite')) return 'dateLimite'
    if (path.includes('/parametres/stats') || path.includes('/paramètres/stats')) return 'stats'
    if (path.includes('/parametres/status') || path.includes('/paramètres/status')) return 'status'
  } catch {}
  return 'tricoteuses' // Par défaut
}

// Navigation programmée
export const navigateToTab = (tabId) => {
  try {
    const path = `/${tabId}`
    // Forcer le mode hash en production pour éviter les 404 côté serveur
    if (window.location.hash !== `#${path}`) window.location.hash = `#${path}`
    // Notifier le routeur interne pour mettre à jour l'état immédiatement
    window.dispatchEvent(new Event('mc-route-update'))
  } catch {}
}

// Navigation vers un sous-onglet des paramètres
export const navigateToParametresSubTab = (subTabId) => {
  try {
    const path = `/parametres/${subTabId}`
    const isHashMode = window.location.hash && window.location.hash.startsWith('#/')
    if (isHashMode) {
      if (window.location.hash !== `#${path}`) window.location.hash = `#${path}`
    } else {
      if (window.location.pathname !== path) window.history.pushState({ tab: 'parametres', subTab: subTabId }, '', path)
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
      const path = (window.location.pathname || '').toLowerCase()
      const hash = window.location.hash || ''
      // Si on est arrivé via /couture (sans hash), convertir en hash pour éviter 404 en prod
      if (!hash.startsWith('#/')) {
        if (path && path !== '/' && path !== '/index.html') {
          const newHash = `#${path}`
          window.location.replace(newHash)
          return
        }
      }
      const hasRoute = (hash && hash.length > 2)
      if (!hasRoute) navigateToTab('couture')
    } catch {}
  }, [])

  // Rediriger /parametres vers /parametres/couturiere
  useEffect(() => {
    try {
      const path = (window.location.hash?.replace(/^#/, '') || window.location.pathname || '').toLowerCase()
      if (path === '/parametres' || path === '/paramètres') {
        navigateToParametresSubTab('couturiere')
      }
    } catch {}
  }, [])

  return { activeTab }
}


