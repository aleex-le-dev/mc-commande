import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
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
  const [activeTab, setActiveTab] = useState('orders')

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <h1 className="text-3xl font-bold text-gray-900">Maisoncléo - Gestion des Commandes</h1>
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`px-4 py-2 rounded-md font-medium ${
                    activeTab === 'orders'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Commandes
                </button>
                <button
                  onClick={() => setActiveTab('form')}
                  className={`px-4 py-2 rounded-md font-medium ${
                    activeTab === 'form'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Configuration
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {activeTab === 'orders' ? <OrderList /> : <OrderForm />}
        </main>
      </div>
    </QueryClientProvider>
  )
}

export default App
