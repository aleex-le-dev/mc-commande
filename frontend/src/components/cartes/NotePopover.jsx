import React from 'react'
import NoteEditor from './NoteEditor'

// Popover de note: pleine largeur, indicateur traduction
const NotePopover = ({
  isOpen,
  notePopoverRef,
  initialValue,
  saving,
  onClose,
  onSave,
  isTranslated
}) => {
  if (!isOpen) return null
  return (
    <div className="absolute left-0 right-0 bottom-20 px-3 z-5">
      <div ref={notePopoverRef}>
        <NoteEditor
          initialValue={initialValue}
          saving={saving}
          onClose={onClose}
          onSave={onSave}
        />
        {isTranslated && (
          <div className="mt-3 pt-2 border-t border-amber-200 text-xs text-amber-600 text-center">
            ✨ Traduit en français
          </div>
        )}
      </div>
    </div>
  )
}

export default NotePopover


