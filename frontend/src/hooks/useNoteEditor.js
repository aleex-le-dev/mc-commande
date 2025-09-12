/**
 * Hook spécialisé pour la gestion des notes
 * Responsabilité unique: édition et sauvegarde des notes
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { ApiService } from '../services/apiService'

export const useNoteEditor = (article) => {
  const [isNoteOpen, setIsNoteOpen] = useState(false)
  const [editingNote, setEditingNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)

  const noteBtnRef = useRef(null)
  const notePopoverRef = useRef(null)

  // Gestion des événements globaux
  useEffect(() => {
    const handleGlobalClose = () => setIsNoteOpen(false)
    window.addEventListener('mc-close-notes', handleGlobalClose)
    return () => window.removeEventListener('mc-close-notes', handleGlobalClose)
  }, [])

  // Gestion du clic en dehors
  useEffect(() => {
    if (!isNoteOpen) return
    
    const handleClickOutside = (event) => {
      const btn = noteBtnRef.current
      const pop = notePopoverRef.current
      if (pop && pop.contains(event.target)) return
      if (btn && btn.contains(event.target)) return
      setIsNoteOpen(false)
    }
    
    document.addEventListener('mousedown', handleClickOutside, true)
    return () => document.removeEventListener('mousedown', handleClickOutside, true)
  }, [isNoteOpen])

  // Ouvrir l'éditeur de note
  const openNoteEditor = useCallback(() => {
    try {
      if (article?.orderId === 389860) {
        console.log('🔍 [NOTE] openNoteEditor - Article:', article?.orderId, article?.lineItemId)
        console.log('🔍 [NOTE] openNoteEditor - production_status.notes:', article?.production_status?.notes)
        console.log('🔍 [NOTE] openNoteEditor - customerNote:', article?.customerNote)
      }
      
      window.dispatchEvent(new Event('mc-close-notes'))
      const noteToEdit = article?.production_status?.notes || article?.customerNote || ''
      if (article?.orderId === 389860) {
        console.log('🔍 [NOTE] openNoteEditor - Note à éditer:', noteToEdit)
      }
      setEditingNote(noteToEdit)
      setIsNoteOpen(true)
    } catch (error) {
      console.error('Erreur dans openNoteEditor:', error)
    }
  }, [article?.customerNote, article?.production_status?.notes])

  // Fermer l'éditeur de note
  const closeNoteEditor = useCallback(() => {
    setIsNoteOpen(false)
    setEditingNote(article?.production_status?.notes || article?.customerNote || '')
  }, [article?.customerNote, article?.production_status?.notes])

  // Sauvegarder la note
  const saveNote = useCallback(async (content) => {
    try {
      if (article?.orderId === 389860) {
        console.log('🔍 [NOTE] saveNote - Début sauvegarde')
        console.log('🔍 [NOTE] saveNote - Article:', article?.orderId, article?.lineItemId)
        console.log('🔍 [NOTE] saveNote - Contenu à sauvegarder:', content)
        console.log('🔍 [NOTE] saveNote - Longueur contenu:', content?.length)
      }
      
      setIsSavingNote(true)
      
      // Sauvegarder au niveau de l'article spécifique (chaque article a sa propre note)
      if (article?.orderId === 389860) {
        console.log('🔍 [NOTE] saveNote - Appel API updateArticleNote...')
      }
      const success = await ApiService.orders.updateArticleNote(article.orderId, article.lineItemId, content)
      
      if (article?.orderId === 389860) {
        console.log('🔍 [NOTE] saveNote - Résultat API:', success)
      }
      
      if (success) {
        if (article?.orderId === 389860) {
          console.log('🔍 [NOTE] saveNote - Sauvegarde réussie, fermeture éditeur')
        }
        setIsNoteOpen(false)
        
        // Déclencher le rechargement des données pour que les notes persistent après actualisation
        // Ne pas modifier l'objet local, laisser le rechargement depuis le serveur
        if (article?.orderId === 389860) {
          console.log('🔍 [NOTE] saveNote - Déclenchement rechargement données')
        }
        window.dispatchEvent(new Event('mc-refresh-data'))
        
        return true
      } else {
        if (article?.orderId === 389860) {
          console.log('🔍 [NOTE] saveNote - Échec sauvegarde (success = false)')
        }
        return false
      }
    } catch (error) {
      console.error('🔍 [NOTE] saveNote - Erreur sauvegarde note:', error)
      return false
    } finally {
      setIsSavingNote(false)
    }
  }, [article?.orderId, article?.lineItemId])

  // Toggle de l'éditeur
  const toggleNoteEditor = useCallback(() => {
    if (isNoteOpen) {
      closeNoteEditor()
    } else {
      openNoteEditor()
    }
  }, [isNoteOpen, openNoteEditor, closeNoteEditor])

  return {
    isNoteOpen,
    setIsNoteOpen,
    editingNote,
    setEditingNote,
    isSavingNote,
    noteBtnRef,
    notePopoverRef,
    openNoteEditor,
    closeNoteEditor,
    saveNote,
    toggleNoteEditor
  }
}

export default useNoteEditor
