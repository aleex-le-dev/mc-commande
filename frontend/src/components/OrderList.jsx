import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { 
  getProductionStatuses, 
  updateArticleStatus, 
  dispatchToProduction,
  syncOrders,
  getOrdersFromDatabase,
  getOrdersByProductionType,
  getSyncLogs
} from '../services/mongodbService'
import LoadingSpinner from './LoadingSpinner'

// Styles CSS personnalisés pour les cartes modernes
const cardStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`

// Composant pour afficher l'image du produit
const ProductImage = ({ productId, productName, permalink }) => {
  const [imageUrl, setImageUrl] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorDetails, setErrorDetails] = useState('')

  useEffect(() => {
    if (productId) {
      // Reset l'état quand l'ID change
      setImageUrl(null)
      setHasError(false)
      setErrorDetails('')
      fetchProductImage(productId)
    }
  }, [productId])



  const fetchProductImage = async (id) => {
    if (!id) {
      console.warn('ProductImage: Pas d\'ID de produit fourni')
      setHasError(true)
      setErrorDetails('Pas d\'ID')
      return
    }

    setIsLoading(true)
    setHasError(false)
    setErrorDetails('')
    
    try {
      // Récupérer la configuration WordPress depuis les variables d'environnement
      const wordpressUrl = import.meta.env.VITE_WORDPRESS_URL
      const consumerKey = import.meta.env.VITE_WORDPRESS_CONSUMER_KEY
      const consumerSecret = import.meta.env.VITE_WORDPRESS_CONSUMER_SECRET

      if (!wordpressUrl || !consumerKey || !consumerSecret) {
        console.warn('ProductImage: Configuration WordPress manquante')
        setHasError(true)
        setErrorDetails('Config manquante')
        return
      }

      const authParams = `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`
      const url = `${wordpressUrl}/wp-json/wc/v3/products/${id}?${authParams}&_fields=id,images`
      
      console.log(`ProductImage: Tentative de récupération de l'image pour le produit ${id}`)
      console.log(`ProductImage: URL appelée: ${url}`)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // Augmenter le timeout
      })

      console.log(`ProductImage: Réponse HTTP ${response.status} pour le produit ${id}`)

      if (response.ok) {
        const product = await response.json()
        console.log(`ProductImage: Données reçues pour le produit ${id}:`, {
          hasImages: !!product?.images,
          imagesCount: product?.images?.length || 0,
          firstImage: product?.images?.[0]
        })
        
        if (product?.images && product.images.length > 0 && product.images[0]?.src) {
          console.log(`ProductImage: Image trouvée pour le produit ${id}: ${product.images[0].src}`)
          setImageUrl(product.images[0].src)
        } else {
          console.warn(`ProductImage: Pas d'image pour le produit ${id}`)
          setHasError(true)
          setErrorDetails('Pas d\'image')
        }
      } else {
        console.warn(`ProductImage: Erreur HTTP ${response.status} pour le produit ${id}`)
        setHasError(true)
        setErrorDetails(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.warn(`ProductImage: Erreur lors de la récupération de l'image pour le produit ${id}:`, error.message)
      setHasError(true)
      setErrorDetails(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
      </div>
    )
  }

  if (hasError || !imageUrl) {
    return (
      <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center group relative">
        <span className="text-xs text-gray-500">🖼️</span>
        {errorDetails && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            {errorDetails}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
          </div>
        )}
      </div>
    )
  }

  return (
    <a
      href={permalink || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block"
      title="Voir l'image du produit"
    >
      <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden hover:bg-gray-200 transition-colors">
        <img 
          src={imageUrl} 
          alt={productName}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      </div>
    </a>
  )
}

// Composant pour afficher et dérouler les notes
const NoteExpander = ({ note }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const toggleNote = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setIsExpanded(!isExpanded)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const closeNote = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setIsExpanded(false)
    setTimeout(() => setIsAnimating(false), 300)
  }

  return (
    <div className="mb-4">
      {/* Bouton pour voir la note */}
      <button
        onClick={toggleNote}
        className="w-full flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all duration-300 group"
      >
        <div className="flex items-center">
          <span className="text-amber-600 mr-2">📝</span>
          <span className="text-sm font-medium text-amber-800">Voir la note</span>
        </div>
        <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Note déroulée */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
      }`}>
        <div className="relative bg-amber-50 border border-amber-200 rounded-lg p-4">
          {/* Bouton de fermeture */}
          <button
            onClick={closeNote}
            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center bg-amber-200 hover:bg-amber-300 rounded-full transition-colors duration-200 group"
          >
            <svg className="w-4 h-4 text-amber-700 group-hover:text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Contenu de la note */}
          <div className="pr-8">
            <div className="text-sm text-amber-800 leading-relaxed">
              <span className="font-medium">Note client:</span>
              <div className="mt-2 italic">"{note}"</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Composant carte d'article moderne
const ArticleCard = ({ article, index, getArticleSize, getArticleColor, getArticleOptions, onOverlayOpen, isOverlayOpen }) => {
  const [imageUrl, setImageUrl] = useState(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('command') // 'command' ou 'client'
  const [copiedText, setCopiedText] = useState('')

  const handleCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(label)
      setTimeout(() => setCopiedText(''), 2000)
    } catch (err) {
      console.error('Erreur lors de la copie:', err)
    }
  }

  useEffect(() => {
    // Utiliser l'image stockée en base de données si disponible
    if (article.image_url) {
      setImageUrl(article.image_url)
    } else if (article.product_id) {
      // Sinon, essayer de récupérer l'image depuis WooCommerce
      fetchCardImage(article.product_id)
    }
  }, [article.image_url, article.product_id])

  const fetchCardImage = async (productId) => {
    setIsImageLoading(true)
    try {
      const wordpressUrl = import.meta.env.VITE_WORDPRESS_URL
      const consumerKey = import.meta.env.VITE_WORDPRESS_CONSUMER_KEY
      const consumerSecret = import.meta.env.VITE_WORDPRESS_CONSUMER_SECRET

      if (!wordpressUrl || !consumerKey || !consumerSecret) return

      const authParams = `consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`
      const url = `${wordpressUrl}/wp-json/wc/v3/products/${productId}?${authParams}&_fields=id,images`

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000) // Timeout plus court
      })

      if (response.ok) {
        const product = await response.json()
        if (product?.images && product.images.length > 0) {
          setImageUrl(product.images[0].src)
        }
      }
    } catch (error) {
      // Ignorer silencieusement les erreurs CORS ou réseau
      console.debug(`Image non disponible pour le produit ${productId}`)
    } finally {
      setIsImageLoading(false)
    }
  }

  return (
    <div 
      className="group relative bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 h-[420px]"
      style={{ 
        animationDelay: `${index * 150}ms`,
        animation: 'fadeInUp 0.6s ease-out forwards'
      }}
    >
      {/* Image de fond avec overlay moderne */}
      <div className="relative h-60 overflow-hidden">
        {/* Image de base */}
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={article.product_name}
            className="w-full h-full object-cover transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center">
            {isImageLoading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-transparent"></div>
            ) : (
              <div className="text-6xl text-slate-500">📦</div>
            )}
          </div>
        )}
        
        {/* Bouton invisible cliquable sur toute l'image si permalink disponible */}
        {article.permalink && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              window.open(article.permalink, '_blank')
            }}
            className="absolute inset-0 w-full h-full cursor-pointer bg-transparent hover:bg-black/5 transition-colors duration-200 z-10"
            title="Cliquer pour voir le produit"
          />
        )}
        
        {/* Overlay gradient moderne */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none"></div>
        
               {/* Numéro de commande - bien visible en haut à gauche */}
       <div className="absolute top-4 left-4 px-4 py-2 rounded-lg bg-black/80 backdrop-blur-sm text-white text-lg font-bold z-20">
         #{article.orderNumber}
       </div>
        
        {/* Icônes d'information sur le bord gauche */}
        <div className="absolute left-4 top-20 space-y-2 z-20">
          {/* Icône pour les infos commande */}
          <button
            onClick={() => setActiveTab('command')}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
              activeTab === 'command' ? 'bg-blue-500/90 text-white' : 'bg-black/60 text-white hover:bg-black/80'
            }`}
            title="Informations commande"
          >
            📦
          </button>
          
                   {/* Icône pour les infos client */}
         <button
           onClick={(e) => {
             e.stopPropagation()
             onOverlayOpen && onOverlayOpen()
           }}
           className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
             isOverlayOpen ? 'bg-green-500/90 text-white' : 'bg-black/60 text-white hover:bg-black/80'
           }`}
           title="Informations client"
         >
           👤
         </button>
        </div>
      </div>

      {/* Zone d'informations dynamique en bas */}
      <div className="h-24 bg-white/95 backdrop-blur-md transition-all duration-300">
        <div className="p-4">
          {/* Informations principales pour tricoteuses */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-gray-900 line-clamp-1">
              {article.product_name}
            </h3>
            <div className="grid grid-cols-3 gap-2 text-sm text-gray-700">
              <div className="text-center">
                <div className="font-semibold">{article.quantity}</div>
                <div className="text-xs text-gray-500">Quantité</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{getArticleSize(article.meta_data)}</div>
                <div className="text-xs text-gray-500">Taille</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{getArticleColor(article.meta_data) !== 'Non spécifiée' ? getArticleColor(article.meta_data) : 'N/A'}</div>
                <div className="text-xs text-gray-500">Couleur</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay client qui glisse de la gauche */}
      <div 
        className={`absolute inset-0 bg-white/80 backdrop-blur-sm z-30 rounded-3xl ${
          isOverlayOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full p-8 flex flex-col">
          <div className="flex justify-end mb-6">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onOverlayOpen && onOverlayOpen()
              }}
              className="text-gray-400 hover:text-gray-600 text-2xl font-light hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200"
            >
              ×
            </button>
          </div>
          
          {/* Feedback de copie */}
          {copiedText && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm font-medium text-center">
              {copiedText}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <span className="text-xl">👤</span>
              <div 
                className="text-base font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                onClick={() => handleCopy(article.customer, 'Client copié !')}
                title="Cliquer pour copier"
              >
                {article.customer}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-xl">📅</span>
              <div 
                className="text-base font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                onClick={() => handleCopy(format(new Date(article.orderDate), 'dd/MM/yyyy', { locale: fr }), 'Date copiée !')}
                title="Cliquer pour copier"
              >
                {format(new Date(article.orderDate), 'dd/MM/yyyy', { locale: fr })}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-xl">📧</span>
              <div 
                className="text-base font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                onClick={() => handleCopy(article.customerEmail || 'Non renseigné', 'Email copié !')}
                title="Cliquer pour copier"
              >
                {article.customerEmail || 'Non renseigné'}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-xl">📱</span>
              <div 
                className="text-base font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                onClick={() => handleCopy(article.customerPhone || 'Non renseigné', 'Téléphone copié !')}
                title="Cliquer pour copier"
              >
                {article.customerPhone || 'Non renseigné'}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-xl">🏠</span>
              <div 
                className="text-base font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                onClick={() => handleCopy(article.customerAddress || 'Non renseignée', 'Adresse copiée !')}
                title="Cliquer pour copier"
              >
                {article.customerAddress || 'Non renseignée'}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-xl">🚚</span>
              <div 
                className="text-base font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                onClick={() => handleCopy(article.shippingMethod || 'Non renseigné', 'Transporteur copié !')}
                title="Cliquer pour copier"
              >
                {article.shippingMethod || 'Non renseigné'}
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Effet de brillance au survol */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform -skew-x-12 -translate-x-full group-hover:translate-x-full pointer-events-none"></div>
    </div>
  )
}

const OrderList = ({ onNavigateToType, selectedType: propSelectedType }) => {
  const [selectedType, setSelectedType] = useState(propSelectedType || 'all')
  const [openOverlayCardId, setOpenOverlayCardId] = useState(null)

  const [syncProgress, setSyncProgress] = useState({ isRunning: false, progress: 0, message: '' })
  const [syncLogs, setSyncLogs] = useState([])
  const queryClient = useQueryClient()

  // Mettre à jour le selectedType local quand la prop change
  useEffect(() => {
    if (propSelectedType) {
      setSelectedType(propSelectedType)
    }
  }, [propSelectedType])

  // Gérer l'ouverture des overlays (un seul à la fois)
  const handleOverlayOpen = (cardId) => {
    if (openOverlayCardId === cardId) {
      // Si on clique sur la même carte, fermer l'overlay
      setOpenOverlayCardId(null)
    } else {
      // Sinon, ouvrir l'overlay de cette carte
      setOpenOverlayCardId(cardId)
    }
  }

  // Fermer l'overlay au clic ailleurs
  const handleClickOutside = () => {
    setOpenOverlayCardId(null)
  }

  // Synchronisation automatique au chargement de la page
  useEffect(() => {
    const performAutoSync = async () => {
      try {
        // Afficher le popup de progression
        setSyncProgress({ 
          isRunning: true, 
          progress: 0, 
          message: 'Connexion au backend...' 
        })
        
        // Étape 1: Connexion au backend
        setSyncProgress(prev => ({ ...prev, progress: 10, message: 'Connexion au backend...' }))
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Étape 2: Récupération des commandes WooCommerce
        setSyncProgress(prev => ({ ...prev, progress: 25, message: 'Récupération des commandes WooCommerce...' }))
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Étape 3: Récupération des permalinks
        setSyncProgress(prev => ({ ...prev, progress: 40, message: 'Récupération des permalinks...' }))
        await new Promise(resolve => setTimeout(resolve, 400))
        
        // Étape 4: Synchronisation avec la base de données
        setSyncProgress(prev => ({ ...prev, progress: 60, message: 'Synchronisation avec la base de données...' }))
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Étape 5: Appel de synchronisation
        setSyncProgress(prev => ({ ...prev, progress: 80, message: 'Synchronisation des données...' }))
        
        // Récupérer le dernier log en temps réel pendant la synchronisation
        const logsInterval = setInterval(async () => {
          try {
            const logs = await getSyncLogs()
            // Prendre seulement le dernier log au lieu de tous
            if (logs && logs.log) {
              setSyncLogs([logs.log])
            }
          } catch (error) {
            console.warn('Erreur lors de la récupération des logs:', error)
          }
        }, 200) // Plus rapide pour voir les logs en temps réel
        
        const syncResult = await syncOrders([])
        
        // Arrêter la récupération des logs
        clearInterval(logsInterval)
        
        // Récupérer le dernier log final
        const finalLogs = await getSyncLogs()
        if (finalLogs && finalLogs.log) {
          setSyncLogs([finalLogs.log])
        }
        
        // Étape 6: Afficher le résultat dans le popup de progression
        if (syncResult.results) {
          const { ordersCreated, itemsCreated } = syncResult.results
          const totalNew = ordersCreated + itemsCreated
          
          if (totalNew > 0) {
            setSyncProgress(prev => ({ 
              ...prev, 
              progress: 100, 
              message: `${ordersCreated} commande${ordersCreated > 1 ? 's' : ''} et ${itemsCreated} article${itemsCreated > 1 ? 's' : ''} récupéré${itemsCreated > 1 ? 's' : ''}`
            }))
          } else {
            setSyncProgress(prev => ({ 
              ...prev, 
              progress: 100, 
              message: 'Aucune nouvelle commande à traiter'
            }))
          }
        }
        
        // Rafraîchir les données
        queryClient.invalidateQueries(['db-orders'])
        queryClient.invalidateQueries(['production-statuses'])
        
        // Masquer le popup de progression après 3 secondes
        setTimeout(() => setSyncProgress({ isRunning: false, progress: 0, message: '' }), 3000)
        
      } catch (error) {
        console.error('Erreur lors de la synchronisation automatique:', error)
        
        // Afficher l'erreur dans le popup de progression
        setSyncProgress(prev => ({ 
          ...prev, 
          progress: 100, 
          message: 'Erreur lors de la synchronisation'
        }))
        
        // Masquer le popup après 3 secondes
        setTimeout(() => setSyncProgress({ isRunning: false, progress: 0, message: '' }), 3000)
      }
    }
    
    // Effectuer la synchronisation automatique
    performAutoSync()
  }, [queryClient])

  // Récupérer les commandes depuis la base de données
  const { data: dbOrders, isLoading: dbOrdersLoading, error: dbOrdersError } = useQuery({
    queryKey: ['db-orders', selectedType],
    queryFn: () => {
      if (propSelectedType && propSelectedType !== 'all') {
        return getOrdersByProductionType(propSelectedType)
      }
      return getOrdersFromDatabase()
    },
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
    staleTime: 10000,
  })

  // Récupérer les statuts de production
  const { data: productionStatuses, isLoading: statusesLoading } = useQuery({
    queryKey: ['production-statuses'],
    queryFn: getProductionStatuses,
    refetchInterval: 10000,
    staleTime: 5000
  })

  // Fonction pour déterminer le type de production
  const getProductionType = (productName) => {
    const name = productName.toLowerCase()
    
    const mailleKeywords = ['tricotée', 'tricoté', 'knitted', 'pull', 'gilet', 'cardigan', 'sweat', 'hoodie', 'bonnet', 'écharpe', 'gants', 'chaussettes']
    
    if (mailleKeywords.some(keyword => name.includes(keyword))) {
      return { type: 'maille', color: 'bg-purple-100 text-purple-800' }
    } else {
      return { type: 'couture', color: 'bg-blue-100 text-blue-800' }
    }
  }

  // Fonction pour obtenir la couleur du statut
  const getStatusColor = (status) => {
    const colors = {
      'a_faire': 'bg-gray-100 text-gray-800',
      'en_cours': 'bg-yellow-100 text-yellow-800',
      'termine': 'bg-green-100 text-green-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  // Fonction pour récupérer le statut d'un article
  const getArticleStatus = (orderId, lineItemId) => {
    if (!productionStatuses) return 'a_faire'
    
    const status = productionStatuses.find(s => 
      s.order_id === orderId && s.line_item_id === lineItemId
    )
    
    return status ? status.status : 'a_faire'
  }

  // Fonction pour extraire la taille d'un article
  const getArticleSize = (metaData) => {
    if (!metaData || !Array.isArray(metaData)) return 'Non spécifiée'
    
    const sizeMeta = metaData.find(meta => 
      meta.key && (
        meta.key.toLowerCase().includes('taille') ||
        meta.key.toLowerCase().includes('size') ||
        meta.key.toLowerCase().includes('dimension')
      )
    )
    
    return sizeMeta ? sizeMeta.value : 'Non spécifiée'
  }

  // Fonction pour extraire les options d'un article
  const getArticleOptions = (metaData) => {
    if (!metaData || !Array.isArray(metaData)) return 'Aucune'
    
    const options = metaData
      .filter(meta => 
        meta.key && 
        !meta.key.toLowerCase().includes('taille') && 
        !meta.key.toLowerCase().includes('size') &&
        !meta.key.toLowerCase().includes('couleur') &&
        !meta.key.toLowerCase().includes('color') &&
        meta.key !== '_qty' &&
        meta.key !== '_tax_class' &&
        meta.key !== '_product_id' &&
        meta.key !== '_variation_id' &&
        meta.key !== '_line_subtotal' &&
        meta.key !== '_line_subtotal_tax' &&
        meta.key !== '_line_total' &&
        meta.key !== '_line_tax' &&
        meta.key !== '_line_tax_data' &&
        meta.key !== '_reduced_stock'
      )
      .map(meta => `${meta.key}: ${meta.value}`)
      .join(', ')
    
    return options || 'Aucune'
  }

  // Fonction pour extraire la couleur d'un article
  const getArticleColor = (metaData) => {
    if (!metaData || !Array.isArray(metaData)) return 'Non spécifiée'
    
    const colorMeta = metaData.find(meta => 
      meta.key && (
        meta.key.toLowerCase().includes('couleur') ||
        meta.key.toLowerCase().includes('color') ||
        meta.key.toLowerCase().includes('colour')
      )
    )
    
    return colorMeta ? colorMeta.value : 'Non spécifiée'
  }

  // Préparer les données des articles avec statuts
  const prepareArticles = () => {
    if (!dbOrders) return []
    
        const articles = []
    dbOrders.forEach((order, orderIndex) => {
      order.items?.forEach((item, itemIndex) => {
        // Utiliser le type de production depuis la base de données si disponible
        let productionType = 'couture' // par défaut
        
        if (item.production_status && item.production_status.production_type) {
          productionType = item.production_status.production_type
        } else {
          // Fallback sur la détection automatique si pas de statut
          const detectedType = getProductionType(item.product_name)
          productionType = detectedType.type
        }
        
        const currentStatus = getArticleStatus(order.order_id, item.line_item_id)
        
        articles.push({
          ...item,
          orderId: order.order_id,
          orderNumber: order.order_number,
          orderDate: order.order_date,
          customer: order.customer_name,
          customerEmail: order.customer_email,
          customerPhone: order.customer_phone,
          customerAddress: order.customer_address,
          customerNote: order.customer_note,
          shippingMethod: order.shipping_method || order.shipping_title || order.shipping_method_title || 'Livraison gratuite',
          permalink: item.permalink, // Utiliser le permalink stocké en BDD
          productionType: productionType,
          status: currentStatus,
          isDispatched: item.production_status && item.production_status.status !== 'a_faire'
        })
      })
    })
    
    return articles
  }

  // Filtrer les articles
  const allArticles = prepareArticles()
  const filteredArticles = allArticles.filter(article => {
    const typeMatch = selectedType === 'all' || article.productionType === selectedType
    return typeMatch
  })
  


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
      {/* Injection des styles CSS pour les cartes */}
      <style dangerouslySetInnerHTML={{ __html: cardStyles }} />
      
      {/* Popup de progression de synchronisation */}
      {syncProgress.isRunning && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-blue-100 text-blue-800 border border-blue-200 rounded-lg shadow-lg max-w-md">
          <div className="mb-3">
            <p className="font-medium">
              <svg 
                className={`w-5 h-5 inline-block mr-2 ${syncProgress.isRunning ? 'animate-spin' : ''}`}
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Synchronisation
            </p>
          </div>
          
          {/* Log en temps réel */}
          <div className="bg-blue-50 rounded p-2">
            {syncLogs.length > 0 && syncLogs[0] ? (
              <div className="text-xs">
                    <span className="text-blue-600 font-mono">
                  {new Date(syncLogs[0].timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`ml-2 ${
                  syncLogs[0].type === 'success' ? 'text-green-600' :
                  syncLogs[0].type === 'error' ? 'text-red-600' :
                  syncLogs[0].type === 'warning' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                  {syncLogs[0].message}
                    </span>
              </div>
            ) : (
              <p className="text-xs text-blue-500 italic">En attente des logs...</p>
            )}
          </div>
        </div>
      )}



      {/* En-tête avec filtres */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {propSelectedType === 'couture' ? '🧵 Production Couture' : 
           propSelectedType === 'maille' ? '🪡 Production Maille' : 
           'Gestion de Production'} ({filteredArticles.length} articles)
        </h2>
      </div>

      {/* Affichage des articles en cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" onClick={handleClickOutside}>
        {filteredArticles.map((article, index) => {
          const cardId = `${article.orderId}-${article.line_item_id}`
          return (
            <ArticleCard 
              key={cardId}
              article={article}
              index={index}
              getArticleSize={getArticleSize}
              getArticleColor={getArticleColor}
              getArticleOptions={getArticleOptions}
              onOverlayOpen={() => handleOverlayOpen(cardId)}
              isOverlayOpen={openOverlayCardId === cardId}
            />
          )
        })}
          </div>
      
      {filteredArticles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Aucun article trouvé avec les filtres sélectionnés</p>
          <p className="text-sm text-gray-400 mt-2">
            Total d'articles en base: {allArticles.length} | Type sélectionné: {selectedType}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Actualisez la page pour synchroniser les nouvelles commandes
          </p>
        </div>
      )}
    </div>
  )
}

export default OrderList