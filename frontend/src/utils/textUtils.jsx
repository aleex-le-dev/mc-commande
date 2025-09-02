import React from 'react'

// Utilitaires de texte: surlignage et formatage d'adresse

// Surligne les occurrences de searchTerm dans text en conservant la casse d'origine
export const highlightText = (text, searchTerm) => {
  if (!searchTerm || !text) return text
  const term = searchTerm.toLowerCase().trim()
  const source = String(text).toLowerCase()
  if (!source.includes(term)) return text
  const parts = String(text).split(new RegExp(`(${term})`, 'gi'))
  return parts.map((part, idx) => (
    part.toLowerCase() === term 
      ? <mark key={idx} className="bg-yellow-200 px-1 rounded">{part}</mark>
      : part
  ))
}

// Formatte l'adresse en mettant le code postal + ville sur une nouvelle ligne, avec surlignage
export const renderFormattedAddress = (address, searchTerm) => {
  if (!address || typeof address !== 'string') return 'Non renseignée'
  const parts = address.split(',').map(p => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const streetPart = parts.slice(0, -1).join(', ')
    const zipCityPart = parts[parts.length - 1]
    return (
      <span>
        <span>{highlightText(streetPart, searchTerm)}</span>
        <br />
        <span>{highlightText(zipCityPart, searchTerm)}</span>
      </span>
    )
  }
  return <span>{highlightText(address, searchTerm)}</span>
}


