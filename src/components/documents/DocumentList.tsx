'use client'

import { useState } from 'react'
import type { ScannedDocument, Collection } from '@/types/document'
import DocumentCard from './DocumentCard'
import FilterDropdown, { type FilterState } from './FilterDropdown'
import Button from '@/components/ui/Button'
import ExportMenu from '@/components/ui/ExportMenu'
import CollectionSidebar from './CollectionSidebar'

interface Props {
  documents: ScannedDocument[]
  loading: boolean
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onScanClick?: () => void
  collections: Collection[]
  onCreateCollection: (name: string) => Promise<void>
  onRenameCollection: (id: string, name: string) => Promise<void>
  onDeleteCollection: (id: string) => Promise<void>
}

const shimmerCls = 'bg-gradient-to-r from-white/4 via-white/8 to-white/4 bg-[length:200%_100%] animate-shimmer rounded-lg'

function SkeletonCard() {
  return (
    <div className="card flex gap-4 pointer-events-none">
      <div className={`w-14 h-14 rounded-xl flex-shrink-0 ${shimmerCls}`} />
      <div className="flex-1 space-y-2.5 py-0.5">
        <div className={`h-3.5 w-3/5 ${shimmerCls}`} />
        <div className={`h-2.5 w-4/5 ${shimmerCls}`} />
        <div className={`h-2.5 w-2/5 ${shimmerCls}`} />
      </div>
    </div>
  )
}

export default function DocumentList({ documents, loading, onOpen, onDelete, onScanClick, collections, onCreateCollection, onRenameCollection, onDeleteCollection }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterState>({ category: null, tags: [] })
  const [showExpiringSoon, setShowExpiringSoon] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-3 animate-fade-in">
        {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="p-8 sm:p-12 flex flex-col items-center gap-4 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-dim/50" aria-hidden="true">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Biblioteca vacía</p>
          <p className="text-xs text-dim mt-1.5 max-w-xs leading-relaxed">
            Escanea un documento y guárdalo en la biblioteca para verlo aquí.
          </p>
        </div>
        {onScanClick && (
          <Button onClick={onScanClick} className="px-5">Ir a OCR</Button>
        )}
      </div>
    )
  }

  const categories = Array.from(new Set(documents.map((d) => d.category).filter(Boolean))) as string[]
  const availableTags = Array.from(new Set(documents.flatMap((d) => d.tags ?? []))).sort()

  const q = search.trim().toLowerCase()

  const filtered = documents.filter((doc) => {
    if (q) {
      const inTitle = doc.title.toLowerCase().includes(q)
      const inCat = (doc.category ?? '').toLowerCase().includes(q)
      const inTags = (doc.tags ?? []).some((t) => t.includes(q))
      if (!inTitle && !inCat && !inTags) return false
    }
    if (filter.category && doc.category !== filter.category) return false
    if (filter.tags.length > 0) {
      const docTags = doc.tags ?? []
      if (!filter.tags.some((t) => docTags.includes(t))) return false
    }
    if (showExpiringSoon) {
      if (!doc.expiresAt) return false
      const daysLeft = Math.ceil((doc.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysLeft > 30) return false
    }
    if (selectedCollectionId !== null && doc.collectionId !== selectedCollectionId) return false
    return true
  })

  const activeFilterCount = (filter.category ? 1 : 0) + filter.tags.length

  const collectionMap = new Map(collections.map((c) => [c.id, c]))

  return (
    <div className="flex animate-fade-in">
      {/* Collection sidebar — desktop only */}
      <div className="hidden sm:block flex-shrink-0">
        <CollectionSidebar
          collections={collections}
          selectedId={selectedCollectionId}
          onSelect={setSelectedCollectionId}
          onCreate={onCreateCollection}
          onRename={onRenameCollection}
          onDelete={onDeleteCollection}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 p-4 sm:p-6 space-y-4">
        {/* Mobile collection chips */}
        {collections.length > 0 && (
          <div className="flex gap-1.5 flex-wrap sm:hidden">
            <button
              onClick={() => setSelectedCollectionId(null)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                selectedCollectionId === null
                  ? 'bg-accent/15 border-accent/30 text-accent'
                  : 'border-white/10 text-dim hover:text-ink hover:bg-white/5'
              }`}
            >
              Todos
            </button>
            {collections.map((col) => (
              <button
                key={col.id}
                onClick={() => setSelectedCollectionId(col.id)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selectedCollectionId === col.id
                    ? 'bg-accent/15 border-accent/30 text-accent'
                    : 'border-white/10 text-dim hover:text-ink hover:bg-white/5'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} aria-hidden="true" />
                {col.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-dim/60 pointer-events-none" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar documentos…"
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-white/10 bg-surface/60 text-xs text-ink placeholder:text-dim/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
            />
          </div>
          {(categories.length > 0 || availableTags.length > 0) && (
            <FilterDropdown
              categories={categories}
              availableTags={availableTags}
              filter={filter}
              onChange={setFilter}
            />
          )}
          {documents.some((d) => d.expiresAt) && (
            <button
              onClick={() => setShowExpiringSoon((v) => !v)}
              className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all ${
                showExpiringSoon
                  ? 'bg-yellow-400/15 border-yellow-400/30 text-yellow-400'
                  : 'border-white/10 text-dim hover:text-ink hover:bg-white/5'
              }`}
              aria-pressed={showExpiringSoon}
            >
              ⏰ Próximos a caducar
            </button>
          )}
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            {filter.category && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs">
                {filter.category}
                <button onClick={() => setFilter({ ...filter, category: null })} className="text-accent/60 hover:text-accent">✕</button>
              </span>
            )}
            {filter.tags.map((t) => (
              <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs">
                {t}
                <button onClick={() => setFilter({ ...filter, tags: filter.tags.filter((x) => x !== t) })} className="text-accent/60 hover:text-accent">✕</button>
              </span>
            ))}
            <button onClick={() => setFilter({ category: null, tags: [] })} className="text-xs text-dim/60 hover:text-dim transition-colors">
              Limpiar todo
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <p className="section-label flex-1">{filtered.length} documento{filtered.length !== 1 ? 's' : ''}</p>
          <button
            onClick={() => { setSelectionMode((m) => !m); setSelectedIds(new Set()) }}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
              selectionMode
                ? 'bg-accent/15 border-accent/30 text-accent'
                : 'border-white/10 text-dim hover:text-ink hover:bg-white/5'
            }`}
          >
            {selectionMode ? 'Cancelar' : 'Seleccionar'}
          </button>
        </div>

        <div className="space-y-3">
          {filtered.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onOpen={() => onOpen(doc.id)}
              onDelete={() => onDelete(doc.id)}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(doc.id)}
              onToggleSelect={() => setSelectedIds((prev) => {
                const next = new Set(prev)
                if (next.has(doc.id)) next.delete(doc.id)
                else next.add(doc.id)
                return next
              })}
              collection={doc.collectionId ? collectionMap.get(doc.collectionId) ?? null : null}
            />
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-dim text-center py-6">No hay documentos que coincidan con tu búsqueda.</p>
          )}
        </div>

        {selectionMode && selectedIds.size > 0 && (
          <div className="fixed bottom-20 sm:bottom-0 left-0 right-0 z-40 bg-base/90 backdrop-blur-xl border-t border-white/7 px-4 py-3 flex items-center gap-3">
            <span className="text-xs text-dim flex-1">{selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}</span>
            <ExportMenu docs={filtered.filter((d) => selectedIds.has(d.id))} />
            <Button variant="ghost" onClick={() => { setSelectionMode(false); setSelectedIds(new Set()) }} className="py-1 px-3 text-xs">
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
