import React, { useState, useEffect } from 'react'
import delaiService from '../../services/delaiService'

const DateLimiteTab = () => {
  const [joursDelai, setJoursDelai] = useState('21')
  const [dateLimite, setDateLimite] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isCalculating, setIsCalculating] = useState(true)
  const [joursOuvrables, setJoursOuvrables] = useState({
    lundi: true,
    mardi: true,
    mercredi: true,
    jeudi: true,
    vendredi: true,
    samedi: false,
    dimanche: false
  })
  // État pour les jours fériés
  const [joursFeries, setJoursFeries] = useState({})
  const [isLoadingJoursFeries, setIsLoadingJoursFeries] = useState(false)

  // Charger le délai actuel au montage du composant
  useEffect(() => {
    loadDelai()
    loadJoursFeries()
  }, [])

  // Calculer la date limite quand le délai, les jours ouvrables OU les jours fériés changent
  useEffect(() => {
    if (joursDelai && !isNaN(joursDelai) && joursDelai > 0 && !isLoadingJoursFeries && Object.keys(joursFeries).length > 0) {
      const dateLimite = calculerDateLimiteOuvrable(parseInt(joursDelai))
      setDateLimite(dateLimite.toISOString().split('T')[0])
    } else if (!isLoadingJoursFeries && Object.keys(joursFeries).length === 0) {
      // Si pas de jours fériés disponibles, on peut quand même calculer
      if (joursDelai && !isNaN(joursDelai) && joursDelai > 0) {
        const dateLimite = calculerDateLimiteOuvrable(parseInt(joursDelai))
        setDateLimite(dateLimite.toISOString().split('T')[0])
      }
    }
  }, [joursDelai, joursOuvrables, joursFeries, isLoadingJoursFeries])

  // Fonction pour calculer la date limite en arrière depuis aujourd'hui
  const calculerDateLimiteOuvrable = (joursOuvrablesCount) => {
    const aujourdhui = new Date()
    let dateLimite = new Date(aujourdhui)
    let joursRetires = 0

    // On remonte dans le temps pour trouver la date limite
    while (joursRetires < joursOuvrablesCount) {
      dateLimite.setDate(dateLimite.getDate() - 1)
      
      // Vérifier si c'est un jour ouvrable selon la configuration personnalisée
      const jourSemaine = dateLimite.getDay()
      const nomJour = getNomJour(jourSemaine)
      
      // Vérifier si c'est un jour ouvrable ET pas un jour férié
      if (joursOuvrables[nomJour] && !estJourFerie(dateLimite)) {
        joursRetires++
      }
    }

    return dateLimite
  }

  // Fonction pour obtenir le nom du jour en français
  const getNomJour = (jourSemaine) => {
    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
    return jours[jourSemaine]
  }

  // Fonction pour vérifier si une date est un jour ouvrable
  const estJourOuvrable = (date) => {
    const jourSemaine = date.getDay()
    const nomJour = getNomJour(jourSemaine)
    return joursOuvrables[nomJour]
  }

  // Fonction pour vérifier si une date est un jour férié
  const estJourFerie = (date) => {
    if (!joursFeries || Object.keys(joursFeries).length === 0) return false
    
    const dateStr = date.toISOString().split('T')[0]
    return joursFeries[dateStr] !== undefined
  }

  // Fonction pour formater une date en français
  const formaterDate = (date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Fonction pour gérer le changement des jours ouvrables
  const handleJourOuvrableChange = (jour, checked) => {
    setJoursOuvrables(prev => ({
      ...prev,
      [jour]: checked
    }))
  }

  // Fonction pour obtenir le nombre de jours ouvrables configurés
  const getNombreJoursOuvrables = () => {
    return Object.values(joursOuvrables).filter(Boolean).length
  }

  // Fonction pour grouper les jours fériés par mois
  const grouperJoursFeriesParMois = () => {
    const groupes = {}
    
    Object.entries(joursFeries).forEach(([date, nom]) => {
      const dateObj = new Date(date)
      const mois = dateObj.getMonth()
      const annee = dateObj.getFullYear()
      const cle = `${annee}-${mois}`
      
      if (!groupes[cle]) {
        groupes[cle] = {
          mois: dateObj.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
          jours: []
        }
      }
      
      groupes[cle].jours.push({
        date: dateObj,
        nom: nom,
        jourSemaine: dateObj.toLocaleDateString('fr-FR', { weekday: 'long' })
      })
    })
    
    // Trier les mois par ordre chronologique
    return Object.entries(groupes).sort(([a], [b]) => a.localeCompare(b))
  }

  // Fonction pour obtenir les jours fériés dans la période de calcul
  const getJoursFeriesDansPeriode = () => {
    if (!dateLimite || !joursFeries) return []
    
    const dateLimiteObj = new Date(dateLimite)
    const aujourdhui = new Date()
    const joursFeriesDansPeriode = []
    
    // Parcourir toutes les dates entre la date limite et aujourd'hui
    let dateCourante = new Date(dateLimiteObj)
    
    while (dateCourante <= aujourdhui) {
      const dateStr = dateCourante.toISOString().split('T')[0]
      
      // Vérifier si cette date est un jour férié
      if (joursFeries[dateStr]) {
        const dateFerie = new Date(dateStr)
        joursFeriesDansPeriode.push({
          date: dateFerie,
          nom: joursFeries[dateStr],
          jourSemaine: dateFerie.toLocaleDateString('fr-FR', { weekday: 'long' })
        })
      }
      
      // Passer au jour suivant
      dateCourante.setDate(dateCourante.getDate() + 1)
    }
    
    // Trier par date
    return joursFeriesDansPeriode.sort((a, b) => a.date - b.date)
  }

  const loadDelai = async () => {
    try {
      const response = await delaiService.getDelai()
      if (response.success && response.data) {
        setJoursDelai(response.data.joursDelai?.toString() || '21')
        setJoursOuvrables(response.data.joursOuvrables || {
          lundi: true,
          mardi: true,
          mercredi: true,
          jeudi: true,
          vendredi: true,
          samedi: false,
          dimanche: false
        })
      }
    } catch (error) {
      console.error('Erreur lors du chargement du délai:', error)
      // En cas d'erreur, on garde les valeurs par défaut
    } finally {
      setIsCalculating(false)
    }
  }

  // Fonction pour charger les jours fériés
  const loadJoursFeries = async () => {
    setIsLoadingJoursFeries(true)
    try {
      const response = await delaiService.getJoursFeries()
      if (response.success) {
        setJoursFeries(response.joursFeries)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des jours fériés:', error)
    } finally {
      setIsLoadingJoursFeries(false)
    }
  }



  const handleSave = async () => {
    if (!joursDelai || joursDelai <= 0) {
      setMessage('Veuillez saisir un nombre de jours valide')
      return
    }

    if (getNombreJoursOuvrables() === 0) {
      setMessage('Veuillez sélectionner au moins un jour ouvrable')
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      // Préparer les données à sauvegarder
      const configuration = {
        joursDelai: parseInt(joursDelai),
        joursOuvrables: joursOuvrables,
        dateLimite: dateLimite,
        dateCreation: new Date().toISOString(),
        derniereModification: new Date().toISOString()
      }

      // Sauvegarder en base de données
      const response = await delaiService.saveDelai(configuration)
      
      if (response.success) {
        setMessage(`Configuration sauvegardée avec succès ! Délai de ${joursDelai} jours ouvrables.`)
        
        // Effacer le message après 3 secondes
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      setMessage('Erreur lors de la sauvegarde en base de données')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setJoursDelai('21')
    setDateLimite('')
    setMessage('')
    setJoursOuvrables({
      lundi: true,
      mardi: true,
      mercredi: true,
      jeudi: true,
      vendredi: true,
      samedi: false,
      dimanche: false
    })
  }

  const handleJoursChange = (e) => {
    const valeur = e.target.value
    // Permettre seulement les nombres positifs
    if (valeur === '' || (parseInt(valeur) > 0 && parseInt(valeur) <= 365)) {
      setJoursDelai(valeur)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Gestion des délais d'expédition
        </h2>
        <p className="text-gray-600">
          Configurez le nombre de jours ouvrables maximum pour identifier quelles commandes 
          doivent être terminées depuis aujourd'hui et choisissez quels jours sont considérés comme ouvrables.
        </p>
      </div>

      {/* Affichage de la date limite calculée - EN AVANT */}
      {!isCalculating && !isLoadingJoursFeries && dateLimite && getNombreJoursOuvrables() > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white shadow-md">
          <div className="text-center">
            <div className="mb-2">
              <svg className="w-8 h-8 mx-auto text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2">
              Date limite de commande
            </h3>
            <div className="text-xl font-bold mb-2 text-blue-100">
              {formaterDate(new Date(dateLimite))}
            </div>
            <div className="text-sm text-blue-100 space-y-1">
              <p><strong>Délai :</strong> {joursDelai} jours ouvrables en arrière</p>
              <p><strong>Jours :</strong> {Object.entries(joursOuvrables)
                .filter(([_, estOuvrable]) => estOuvrable)
                .map(([jour, _]) => jour.charAt(0).toUpperCase() + jour.slice(1))
                .join(', ')}</p>
              <p className="text-xs opacity-90">⚠️ Jours fériés automatiquement exclus</p>
            </div>
            
            {/* Affichage des jours fériés dans la période */}
            {getJoursFeriesDansPeriode().length > 0 && (
              <div className="mt-4 pt-4 border-t border-blue-400">
                <p className="text-sm font-medium text-blue-100 mb-2">
                  Jours fériés dans cette période :
                </p>
                <div className="space-y-1">
                  {getJoursFeriesDansPeriode().map((jourFerie, index) => (
                    <div key={index} className="flex items-center justify-center space-x-2 text-xs">
                      <div className="w-4 h-4 bg-red-400 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {jourFerie.date.getDate()}
                        </span>
                      </div>
                      <span className="text-blue-100">
                        {jourFerie.nom} ({jourFerie.jourSemaine})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Affichage du chargement */}
      {(isCalculating || isLoadingJoursFeries) && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white shadow-md">
          <div className="text-center">
            <div className="mb-2">
              <svg className="w-8 h-8 mx-auto text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2">
              {isLoadingJoursFeries ? 'Chargement des jours fériés...' : 'Calcul de la date limite...'}
            </h3>
            <div className="flex justify-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Sélecteur de délai en jours ouvrables */}
        <div>
          <label htmlFor="joursDelai" className="block text-sm font-medium text-gray-700 mb-2">
            Délai d'expédition (en jours ouvrables en arrière)
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="number"
              id="joursDelai"
              value={joursDelai}
              onChange={handleJoursChange}
              min="1"
              max="365"
              placeholder="Ex: 21"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--rose-clair)] focus:border-[var(--rose-clair)]"
            />
            <span className="text-gray-500 font-medium">jours ouvrables en arrière</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Saisissez le nombre de jours ouvrables maximum pour identifier les commandes à terminer
          </p>
        </div>

        {/* Sélection des jours ouvrables */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Jours considérés comme ouvrables
          </label>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(joursOuvrables).map(([jour, estOuvrable]) => (
              <label key={jour} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={estOuvrable}
                  onChange={(e) => handleJourOuvrableChange(jour, e.target.checked)}
                  className="w-4 h-4 text-[var(--rose-clair)] border-gray-300 rounded focus:ring-[var(--rose-clair)]"
                />
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {jour === 'lundi' ? 'Lundi' : 
                   jour === 'mardi' ? 'Mardi' : 
                   jour === 'mercredi' ? 'Mercredi' : 
                   jour === 'jeudi' ? 'Jeudi' : 
                   jour === 'vendredi' ? 'Vendredi' : 
                   jour === 'samedi' ? 'Samedi' : 'Dimanche'}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            <strong>{getNombreJoursOuvrables()}</strong> jour(s) ouvrable(s) configuré(s)
          </p>
        </div>

        {/* Affichage des jours fériés par mois */}
        <div>
       
          {isLoadingJoursFeries ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-sm text-gray-500">Chargement des jours fériés...</p>
            </div>
          ) : Object.keys(joursFeries).length > 0 ? (
            <details className="border border-gray-200 rounded-lg bg-gray-50">
              <summary className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors font-medium text-gray-800">
                <div className="flex items-center justify-between">
                  <span>Voir tous les jours fériés ({Object.keys(joursFeries).length} jour(s))</span>
                  <svg className="w-5 h-5 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </summary>
              <div className="px-4 pb-4 space-y-4">
                {grouperJoursFeriesParMois().map(([cle, groupe]) => (
                  <div key={cle} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <h4 className="font-semibold text-gray-800 mb-3 text-center">
                      {groupe.mois}
                    </h4>
                    <div className="grid gap-2">
                      {groupe.jours.map((jour, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                              <span className="text-red-600 text-sm font-bold">
                                {jour.date.getDate()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{jour.nom}</p>
                              <p className="text-xs text-gray-500 capitalize">{jour.jourSemaine}</p>
                            </div>
                          </div>
                          <div className="text-xs text-red-500 font-medium">
                            FÉRIÉ
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ) : (
            <details className="border border-gray-200 rounded-lg bg-gray-50">
              <summary className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors font-medium text-gray-800">
                <div className="flex items-center justify-between">
                  <span>Jours fériés français (exclus automatiquement du calcul)</span>
                  <svg className="w-5 h-5 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </summary>
              <div className="px-4 pb-4 space-y-4">
                {/* Affichage des jours fériés par défaut (année actuelle) */}
                {(() => {
                  const anneeActuelle = new Date().getFullYear()
                  const joursFeriesDefaut = {
                    '1er janvier': `${anneeActuelle}-01-01`,
                    'Lundi de Pâques': `${anneeActuelle}-04-${anneeActuelle === 2025 ? '21' : anneeActuelle === 2024 ? '01' : '22'}`,
                    '1er mai': `${anneeActuelle}-05-01`,
                    '8 mai': `${anneeActuelle}-05-08`,
                    'Ascension': `${anneeActuelle}-05-${anneeActuelle === 2025 ? '29' : anneeActuelle === 2024 ? '09' : '30'}`,
                    'Lundi de Pentecôte': `${anneeActuelle}-06-${anneeActuelle === 2025 ? '09' : anneeActuelle === 2024 ? '17' : '10'}`,
                    '14 juillet': `${anneeActuelle}-07-14`,
                    '15 août': `${anneeActuelle}-08-15`,
                    '1er novembre': `${anneeActuelle}-11-01`,
                    '11 novembre': `${anneeActuelle}-11-11`,
                    '25 décembre': `${anneeActuelle}-12-25`
                  }
                  
                  // Grouper par mois
                  const groupesParMois = {}
                  Object.entries(joursFeriesDefaut).forEach(([nom, date]) => {
                    const [annee, mois, jour] = date.split('-')
                    const cle = `${annee}-${mois}`
                    if (!groupesParMois[cle]) {
                      groupesParMois[cle] = {
                        mois: new Date(annee, mois - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                        jours: []
                      }
                    }
                    groupesParMois[cle].jours.push({
                      date: new Date(date),
                      nom: nom,
                      jourSemaine: new Date(date).toLocaleDateString('fr-FR', { weekday: 'long' })
                    })
                  })
                  
                  return Object.entries(groupesParMois).sort(([a], [b]) => a.localeCompare(b)).map(([cle, groupe]) => (
                    <div key={cle} className="border border-gray-200 rounded-lg p-4 bg-white">
                      <h4 className="font-semibold text-gray-800 mb-3 text-center">
                        {groupe.mois}
                      </h4>
                      <div className="grid gap-2">
                        {groupe.jours.map((jour, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                <span className="text-red-600 text-sm font-bold">
                                  {jour.date.getDate()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-800">{jour.nom}</p>
                                <p className="text-xs text-gray-500 capitalize">{jour.jourSemaine}</p>
                              </div>
                            </div>
                            <div className="text-xs text-red-500 font-medium">
                              FÉRIÉ
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                })()}
                
                {/* Message informatif */}
                <div className="text-center py-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>ℹ️ Information :</strong> Ces jours fériés sont automatiquement exclus du calcul des délais.
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Cliquez sur "🧪 Test API Jours Fériés" dans l'onglet Statut pour vérifier la connexion à l'API gouvernementale.
                  </p>
                </div>
              </div>
            </details>
          )}
        </div>

        {/* Affichage de la date limite calculée */}
        {/* This block is now moved outside the space-y-6 div */}

  

        {/* Message de feedback */}
        {message && (
          <div className={`p-4 rounded-md ${
            message.includes('succès') 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex space-x-3">
          <button
            onClick={handleSave}
            disabled={isLoading || !joursDelai || joursDelai <= 0 || getNombreJoursOuvrables() === 0}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              isLoading || !joursDelai || joursDelai <= 0 || getNombreJoursOuvrables() === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[var(--rose-clair)] text-[var(--rose-clair-text)] hover:bg-[var(--rose-clair-hover)]'
            }`}
          >
            {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
          
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Réinitialiser
          </button>
          

        </div>
      </div>
    </div>
  )
}

export default DateLimiteTab
