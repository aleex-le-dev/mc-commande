import React, { useState, useEffect } from 'react'
import delaiService from '../../services/delaiService'

const DateLimiteTab = () => {
  const [joursDelai, setJoursDelai] = useState('21')
  const [dateLimite, setDateLimite] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [joursOuvrables, setJoursOuvrables] = useState({
    lundi: true,
    mardi: true,
    mercredi: true,
    jeudi: true,
    vendredi: true,
    samedi: false,
    dimanche: false
  })

  // Charger le délai actuel au montage du composant
  useEffect(() => {
    loadDelai()
  }, [])

  // Calculer la date limite quand le délai ou les jours ouvrables changent
  useEffect(() => {
    if (joursDelai && !isNaN(joursDelai) && joursDelai > 0) {
      const dateLimite = calculerDateLimiteOuvrable(parseInt(joursDelai))
      setDateLimite(dateLimite.toISOString().split('T')[0])
    } else {
      setDateLimite('')
    }
  }, [joursDelai, joursOuvrables])

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
      
      if (joursOuvrables[nomJour]) {
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
      {dateLimite && getNombreJoursOuvrables() > 0 && (
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

        {/* Affichage de la date limite calculée */}
        {/* This block is now moved outside the space-y-6 div */}

        {/* Informations sur le calcul */}
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">
                Calcul en arrière depuis aujourd'hui
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>• <strong>Logique inversée :</strong> On calcule la date limite en remontant dans le temps depuis aujourd'hui</p>
                <p>• <strong>Exemple :</strong> Si aujourd'hui c'est le 15 et que vous mettez 21 jours ouvrables, la date limite sera le 24 du mois précédent</p>
                <p>• <strong>Objectif :</strong> Identifier quelles commandes doivent être terminées dans X jours ouvrables</p>
              </div>
            </div>
          </div>
        </div>

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
