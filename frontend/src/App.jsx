import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OrderList from './components/OrderList'
import OrderForm from './components/OrderForm'
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
    { id: 'maille', label: 'Maille', icon: '🪡' }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'couture':
        return <OrderList onNavigateToType={setActiveTab} selectedType="couture" />
      case 'maille':
        return <OrderList onNavigateToType={setActiveTab} selectedType="maille" />
      default:
        return <OrderList onNavigateToType={setActiveTab} selectedType="couture" />
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation principale */}
        <nav className="bg-white shadow-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

              {/* Onglets de navigation */}
              <div className="hidden md:block">
                <div className="flex space-x-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-blue-100 text-blue-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <span className="mr-2 text-lg">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bouton de configuration */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setActiveTab('configuration')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === 'configuration'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  ⚙️ Configuration
                </button>
              </div>
            </div>

            {/* Navigation mobile */}
            <div className="md:hidden">
              <div className="flex space-x-1 pb-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
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
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {activeTab === 'configuration' ? <OrderForm /> : renderContent()}
        </main>
      </div>
    </QueryClientProvider>
  )
}

export default App
