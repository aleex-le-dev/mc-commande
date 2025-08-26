import React, { useState } from 'react'
import { StatusTab, ModificationTab, TricoteusesTab } from './cartes'

const ParametresPanel = () => {
  const [activeTab, setActiveTab] = useState('status')

  const tabs = [
    { id: 'status', label: 'Status & Tests', icon: '📊' },
    { id: 'modification', label: 'Modification des commandes', icon: '✏️' },
    { id: 'tricoteuses', label: 'Tricoteuses', icon: '🧶' }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'status':
        return <StatusTab />
      case 'modification':
        return <ModificationTab />
      case 'tricoteuses':
        return <TricoteusesTab />
      default:
        return <StatusTab />
    }
  }

  return (
    <div className="space-y-6">
      {/* Navigation des onglets */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu des onglets */}
      {renderContent()}
    </div>
  )
}

export default ParametresPanel
