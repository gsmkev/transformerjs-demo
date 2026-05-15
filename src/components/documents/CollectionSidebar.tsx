'use client'

import { useState } from 'react'
import type { Collection } from '@/types/document'

interface Props {
  collections: Collection[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onCreate: (name: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function CollectionSidebar({
  collections, selectedId, onSelect, onCreate, onRename, onDelete,
}: Props) {
  const [newName, setNewName] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')

  const submitNew = async () => {
    if (!newName.trim()) return
    await onCreate(newName.trim())
    setNewName('')
    setCreatingNew(false)
  }

  return (
    <div className="flex flex-col gap-1 p-3 border-r border-white/7 min-w-[160px]">
      <p className="section-label px-1 mb-1">Colecciones</p>

      <button
        onClick={() => onSelect(null)}
        className={`text-left px-3 py-2 rounded-xl text-xs transition-colors ${
          selectedId === null ? 'bg-accent/15 text-accent' : 'text-dim hover:text-ink hover:bg-white/5'
        }`}
      >
        Todos los documentos
      </button>

      {collections.map((col) => (
        <div key={col.id} className="group flex items-center gap-1">
          {renamingId === col.id ? (
            <input
              autoFocus
              value={renameVal}
              onChange={(e) => setRenameVal(e.target.value)}
              onBlur={async () => {
                if (renameVal.trim()) await onRename(col.id, renameVal)
                setRenamingId(null)
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') { if (renameVal.trim()) await onRename(col.id, renameVal); setRenamingId(null) }
                if (e.key === 'Escape') setRenamingId(null)
              }}
              className="flex-1 px-2 py-1 text-xs bg-transparent border border-accent/40 rounded-lg focus:outline-none text-ink"
            />
          ) : (
            <button
              onClick={() => onSelect(col.id)}
              onDoubleClick={() => { setRenamingId(col.id); setRenameVal(col.name) }}
              className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                selectedId === col.id ? 'bg-accent/15 text-accent' : 'text-dim hover:text-ink hover:bg-white/5'
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} aria-hidden="true" />
              <span className="truncate">{col.name}</span>
            </button>
          )}
          <button
            onClick={() => onDelete(col.id)}
            className="opacity-0 group-hover:opacity-100 text-dim/30 hover:text-err transition-all text-xs px-1"
            aria-label={`Eliminar colección ${col.name}`}
          >
            ✕
          </button>
        </div>
      ))}

      {creatingNew ? (
        <div className="flex gap-1 mt-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitNew(); if (e.key === 'Escape') setCreatingNew(false) }}
            placeholder="Nombre…"
            className="flex-1 px-2 py-1 text-xs bg-transparent border border-white/10 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 text-ink placeholder:text-dim/50"
          />
          <button onClick={submitNew} className="text-xs text-accent">OK</button>
        </div>
      ) : (
        <button
          onClick={() => setCreatingNew(true)}
          className="text-xs text-dim/50 hover:text-accent transition-colors text-left px-3 py-1.5 mt-1"
        >
          + Nueva colección
        </button>
      )}
    </div>
  )
}
