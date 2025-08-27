import React, { useState } from 'react'
import ModificationTab from './cartes/ModificationTab'
import TricoteusesTab from './cartes/TricoteusesTab'
import StatusTab from './cartes/StatusTab'

const ParametresPanel = () => {
  const [activeTab, setActiveTab] = useState('modification')

  const tabs = [
    { id: 'modification', label: 'Modification', icon: '✏️' },
    { id: 'tricoteuses', label: 'Tricoteuses', icon: '🧶' },
    { id: 'status', label: 'Statut', icon: '📊' }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'modification':
        return <ModificationTab />
      case 'tricoteuses':
        return <TricoteusesTab />
      case 'status':
        return <StatusTab />
      default:
        return <ModificationTab />
    }
  }

  return (
    <div className="w-full">
      {/* Onglets Admin */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-[var(--rose-clair)] text-[var(--rose-clair-text)]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Contenu de l'onglet actif */}
      <div>
        {renderTabContent()}
      </div>
    </div>
  )
}

export default ParametresPanel
