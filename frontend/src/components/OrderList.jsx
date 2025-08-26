import React from 'react'
import LoadingSpinner from './LoadingSpinner'
import { 
  SyncProgress, 
  OrderHeader, 
  SimpleFlexGrid,
  useOrderData,
  useSyncProgress,
  useOrderFilters
} from './cartes'

const OrderList = ({ onNavigateToType, selectedType: propSelectedType }) => {
  // Utiliser les hooks personnalisés
  const {
    productionStatuses,
    statusesLoading,
    dbOrders,
    dbOrdersLoading,
    dbOrdersError,
    prepareArticles,
    getArticleSize,
    getArticleColor,
    getArticleOptions,
    performSync
  } = useOrderData(propSelectedType, propSelectedType)

  const { syncProgress, syncLogs } = useSyncProgress(performSync)

  const {
    selectedType,
    searchTerm,
    setSearchTerm,
    filteredArticles,
          openOverlayCardId,
    handleOverlayOpen
  } = useOrderFilters(propSelectedType, prepareArticles)

  if (dbOrdersLoading || statusesLoading) {
    return <LoadingSpinner />
  }

  if (dbOrdersError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="text-red-800">
            <p className="font-medium">Erreur lors du chargement des commandes</p>
            <p className="text-sm">{dbOrdersError.message}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Popup de progression de synchronisation */}
      <SyncProgress syncProgress={syncProgress} syncLogs={syncLogs} />

      {/* En-tête avec titre et recherche */}
      <OrderHeader 
        selectedType={selectedType}
        filteredArticlesCount={filteredArticles.length}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Affichage des articles en cartes avec flexbox et flex-wrap */}
      <SimpleFlexGrid 
        filteredArticles={filteredArticles}
        getArticleSize={getArticleSize}
        getArticleColor={getArticleColor}
        getArticleOptions={getArticleOptions}
        handleOverlayOpen={handleOverlayOpen}
        openOverlayCardId={openOverlayCardId}
        searchTerm={searchTerm}
      />
    </div>
  )
}

export default OrderList
