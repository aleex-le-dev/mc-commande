import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OrderList from './components/OrderList'
import OrderForm from './components/OrderForm'
import ParametresPanel from './components/ParametresPanel'
import CardStyles from './components/cartes/CardStyles'
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

  const tabs = [
    { id: 'couture', label: 'Couture', icon: '🧵' },
    { id: 'maille', label: 'Maille', icon: '🪡' },
    { id: 'parametres', label: 'Admin', icon: '👑' }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'couture':
        return <OrderList onNavigateToType={setActiveTab} selectedType="couture" />
      case 'maille':
        return <OrderList onNavigateToType={setActiveTab} selectedType="maille" />
      case 'parametres':
        return <ParametresPanel />
      default:
        return <OrderList onNavigateToType={setActiveTab} selectedType="couture" />
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <CardStyles />
      <div className="min-h-screen bg-gray-50">
        {/* Navigation principale */}
        <nav className="bg-white shadow-lg border-b border-gray-200">
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
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <span className="mr-1">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paramètres à droite */}
              <div className="flex items-center">
                {tabs.filter(tab => tab.id === 'parametres').map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-[var(--rose-clair)] text-[var(--rose-clair-text)] border border-[var(--rose-clair-border)]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
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
        <main className="w-full py-6 px-4 sm:px-6 lg:px-8">
          {renderContent()}
        </main>
      </div>
    </QueryClientProvider>
  )
}

export default App
