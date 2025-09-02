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
    <div className="absolute inset-x-0 bottom-0 top-0 px-3 pb-20 z-5">
      <div ref={notePopoverRef} className="h-full flex items-end">
        <NoteEditor
          initialValue={initialValue}
          saving={saving}
          onClose={onClose}
          onSave={onSave}
        />
        {isTranslated && (
          <div className="mt-3 pt-2 border-t border-amber-200 text-xs text-amber-600 text-center w-full">
            ✨ Traduit en français
          </div>
        )}
      </div>
    </div>
  )
}

export default NotePopover


