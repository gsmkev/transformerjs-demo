'use client'

import { useState } from 'react'
import type { ChatHistory } from '@/types/document'

interface Props {
  histories: ChatHistory[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}

function HistoryItem({ history, isActive, onSelect, onDelete, onRename }: {
  history: ChatHistory
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (title: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(history.title)

  const handleRenameSubmit = () => {
    const trimmed = title.trim() || history.title
    setTitle(trimmed)
    setEditing(false)
    if (trimmed !== history.title) onRename(trimmed)
  }

  return (
    <div
      className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
        isActive ? 'bg-accent/10 text-accent' : 'text-dim hover:bg-white/5 hover:text-ink'
      }`}
      onClick={!editing ? onSelect : undefined}
    >
      {editing ? (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit()
            if (e.key === 'Escape') { setTitle(history.title); setEditing(false) }
          }}
          autoFocus
          className="flex-1 bg-transparent text-xs text-ink focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 text-xs truncate">{history.title}</span>
      )}
      {!editing && (
        <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEditing(true) }}
            className="p-0.5 text-dim/60 hover:text-ink transition-colors"
            aria-label="Renombrar"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-0.5 text-dim/60 hover:text-err transition-colors"
            aria-label="Eliminar"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

function HistoryList({ histories, activeId, onSelect, onNew, onDelete, onRename }: Omit<Props, 'mobileOpen' | 'onMobileOpenChange'>) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <button
        type="button"
        onClick={onNew}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-dim hover:bg-white/5 hover:text-ink transition-colors mb-1 flex-shrink-0"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Nueva conversación
      </button>
      <div className="flex-1 overflow-y-auto space-y-0.5 [&::-webkit-scrollbar]:hidden">
        {histories.map((h) => (
          <HistoryItem
            key={h.id}
            history={h}
            isActive={h.id === activeId}
            onSelect={() => onSelect(h.id)}
            onDelete={() => onDelete(h.id)}
            onRename={(title) => onRename(h.id, title)}
          />
        ))}
        {histories.length === 0 && (
          <p className="text-[10px] text-dim/40 px-2 py-2">Sin conversaciones guardadas</p>
        )}
      </div>
    </div>
  )
}

export default function ChatHistorySidebar(props: Props) {
  const { mobileOpen = false, onMobileOpenChange } = props

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col border-r border-white/7 p-3 min-h-0 overflow-hidden">
        <p className="section-label mb-2 px-1">Conversaciones</p>
        <HistoryList {...props} />
      </div>

      {/* Mobile modal */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={(e) => { if (e.target === e.currentTarget) onMobileOpenChange?.(false) }}
        >
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-surface border-l border-white/10 flex flex-col p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-ink">Conversaciones</p>
              <button
                onClick={() => onMobileOpenChange?.(false)}
                className="text-dim hover:text-ink transition-colors"
                aria-label="Cerrar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <HistoryList
                {...props}
                onSelect={(id) => { props.onSelect(id); onMobileOpenChange?.(false) }}
                onNew={() => { props.onNew(); onMobileOpenChange?.(false) }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
