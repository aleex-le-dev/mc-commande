import React, { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OrderList from './components/OrderList'
import OrderForm from './components/OrderForm'
import ParametresPanel from './components/ParametresPanel'
import CardStyles from './components/cartes/CardStyles'
import ThemeToggle from './components/ThemeToggle'
import './App.css'

// Configuration du client React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  const [activeTab, setActiveTab] = useState('couture') // Démarrer directement sur Couture

  // Changer le titre de la page et le favicon selon l'onglet actif
  useEffect(() => {
    const getPageTitle = () => {
      switch (activeTab) {
        case 'couture':
          return 'Couture - Maisoncléo'
        case 'maille':
          return 'Maille - Maisoncléo'
        case 'termine':
          return 'Terminé - Maisoncléo'
        case 'parametres':
          return 'Admin - Maisoncléo'
        default:
          return 'Maisoncléo'
      }
    }
    
    const getFavicon = () => {
      switch (activeTab) {
        case 'couture':
          return '🧵'
        case 'maille':
          return '🪡'
        case 'termine':
          return '✅'
        case 'parametres':
          return '👑'
        default:
          return '🏠'
      }
    }
    
    document.title = getPageTitle()
    
    // Changer le favicon avec l'emoji
    const favicon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]')
    if (favicon) {
      favicon.href = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50%" x="50%" dominant-baseline="middle" text-anchor="middle" font-size="60">${getFavicon()}</text></svg>`
    }
  }, [activeTab])

  const tabs = [
    { id: 'couture', label: 'Couture', icon: '🧵' },
    { id: 'maille', label: 'Maille', icon: '🪡' },
    { id: 'termine', label: 'Terminé', icon: '✅' },
    { id: 'parametres', label: 'Admin', icon: '👑' }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'couture':
        return <OrderList onNavigateToType={setActiveTab} selectedType="couture" />
      case 'maille':
        return <OrderList onNavigateToType={setActiveTab} selectedType="maille" />
      case 'termine':
        return <OrderList onNavigateToType={setActiveTab} selectedType="termine" />
      case 'parametres':
        return <ParametresPanel />
      default:
        return <OrderList onNavigateToType={setActiveTab} selectedType="couture" />
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <CardStyles />
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Navigation principale */}
        <nav className="shadow-lg border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo et titre */}
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <img 
                    src="/mclogosite.png" 
                    alt="Maisoncléo" 
                    className="h-5 w-auto"
                  />
                </div>
              </div>

              {/* Onglets centrés */}
              <div className="flex-1 flex justify-center">
                <div className="flex space-x-1">
                  {tabs.filter(tab => tab.id !== 'parametres').map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer ${
                        activeTab === tab.id
                          ? 'bg-[var(--rose-clair)] text-[var(--rose-clair-text)] border border-[var(--rose-clair-border)]'
                          : 'hover:bg-[var(--bg-tertiary)]'
                      }`}
                      style={{ 
                        color: activeTab === tab.id ? 'var(--rose-clair-text)' : 'var(--text-secondary)',
                        backgroundColor: activeTab === tab.id ? 'var(--rose-clair)' : 'transparent'
                      }}
                    >
                      <span className="mr-1">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paramètres à droite */}
              <div className="flex items-center">
                <ThemeToggle />
                {tabs.filter(tab => tab.id === 'parametres').map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-[var(--rose-clair)] text-[var(--rose-clair-text)] border border-[var(--rose-clair-border)]'
                        : 'hover:bg-[var(--bg-tertiary)]'
                    }`}
                    style={{ 
                      color: activeTab === tab.id ? 'var(--rose-clair-text)' : 'var(--text-secondary)',
                      backgroundColor: activeTab === tab.id ? 'var(--rose-clair)' : 'transparent'
                    }}
                  >
                    <span className="mr-1">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </nav>

        {/* Contenu principal */}
        <main className="w-full py-6 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
          {renderContent()}
        </main>
      </div>
    </QueryClientProvider>
  )
}

export default App
