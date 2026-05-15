# Custom Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to add free-form tags to documents, filter the document list by category and/or tags via a dropdown, and search across title, category, and tags in a unified search bar.

**Architecture:** `tags: string[]` added to `ScannedDocument` (no DB migration needed — IndexedDB is schema-less). A new `TagEditor` component handles chip input. A `FilterDropdown` replaces the current category pill bar. The search bar in `DocumentList` becomes a controlled input filtering across all fields. Existing category pill filter logic is removed and merged into the dropdown.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v3, IndexedDB (idb)

---

### Task 1: Add `tags` to `ScannedDocument` type

**Files:**
- Modify: `src/types/document.ts`

**Context:** `ScannedDocument` in `src/types/document.ts` currently has no `tags` field. We add it as optional (`string[] | undefined`) for backwards compatibility with existing stored docs, but treat it as `[]` in all code.

- [ ] **Step 1: Add `tags` field**

In `src/types/document.ts`, add to `ScannedDocument`:

```typescript
export interface ScannedDocument {
  id: string
  title: string
  imageDataUrl: string
  rawText: string
  richText: string
  engineId: string
  confidence: number | null
  createdAt: number
  updatedAt: number
  embedding: number[] | null
  category?: string | null
  tags?: string[]          // ← new: user-defined labels, default undefined = []
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors (`tags` is optional so existing code is unaffected).

- [ ] **Step 3: Commit**

```bash
git add src/types/document.ts
git commit -m "feat: add tags field to ScannedDocument type"
```

---

### Task 2: `TagEditor` component

**Files:**
- Create: `src/components/documents/TagEditor.tsx`

**Context:** Displays existing tags as chips with a remove button. An inline input at the end lets the user type a tag; pressing Enter or comma confirms it. Tags are normalized: trimmed, lowercased, no duplicates, max 20 per document. `allTags` provides autocomplete suggestions.

- [ ] **Step 1: Create `TagEditor.tsx`**

```tsx
// src/components/documents/TagEditor.tsx
'use client'

import { useState, useRef, KeyboardEvent } from 'react'

interface Props {
  tags: string[]
  allTags: string[]
  onChange: (tags: string[]) => void
}

export default function TagEditor({ tags, allTags, onChange }: Props) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/,/g, '')
    if (!tag || tags.includes(tag) || tags.length >= 20) return
    onChange([...tags, tag])
    setInput('')
  }

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag))

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const suggestions = input.length > 0
    ? allTags.filter((t) => t.includes(input.toLowerCase()) && !tags.includes(t)).slice(0, 5)
    : []

  return (
    <div className="space-y-1.5">
      <p className="section-label">Etiquetas</p>
      <div
        className="flex flex-wrap gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-xl border border-white/10 bg-surface/60 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs">
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
              aria-label={`Eliminar etiqueta ${tag}`}
              className="text-accent/60 hover:text-accent leading-none"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => { if (input) addTag(input) }}
          placeholder={tags.length === 0 ? 'Añadir etiqueta…' : ''}
          className="flex-1 min-w-[80px] bg-transparent text-xs text-ink placeholder:text-dim/50 focus:outline-none"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { onChange([...tags, s]); setInput('') }}
              className="px-2 py-0.5 rounded-full text-xs border border-white/10 text-dim hover:text-ink hover:bg-white/5 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/documents/TagEditor.tsx
git commit -m "feat: TagEditor component — chip input with autocomplete"
```

---

### Task 3: Integrate `TagEditor` into `DocumentEditor`

**Files:**
- Modify: `src/components/documents/DocumentEditor.tsx`
- Modify: `src/components/App.tsx`

**Context:** `DocumentEditor` needs to show `TagEditor` after the title bar, pass `allTags` (derived from all documents), and save tag changes via `onUpdate`. `App.tsx` must derive `allTags` from `documents` and pass it to `DocumentEditor`.

- [ ] **Step 1: Update `DocumentEditor` interface and component**

1. Add `allTags` prop to the interface:
```tsx
interface Props {
  doc: ScannedDocument
  ragModelReady: boolean
  allTags: string[]                                    // ← new
  onUpdate: (id: string, patch: Partial<ScannedDocument>) => Promise<void>
  onEmbed: (doc: ScannedDocument) => Promise<void>
  onBack: () => void
  onDelete: (id: string) => Promise<void>
}
```

2. Add import:
```tsx
import TagEditor from './TagEditor'
```

3. Add `tags` state inside the component (after `const [showOriginal, setShowOriginal] = useState(false)`):
```tsx
const [tags, setTags] = useState<string[]>(doc.tags ?? [])
```

4. Add handler:
```tsx
const handleTagsChange = async (newTags: string[]) => {
  setTags(newTags)
  await onUpdate(doc.id, { tags: newTags })
}
```

5. Add `TagEditor` in the content area, in the `showOriginal ? ... : ...` section, specifically in the non-original view, between the `<Toolbar>` and `<EditorContent>`:

Actually, place it in a persistent section that shows regardless of mode — add it just before the `{showOriginal ? ... : ...}` block:

```tsx
{/* Tags section — always visible */}
<div className="px-4 sm:px-6 py-3 border-b border-white/5 bg-surface/20">
  <TagEditor tags={tags} allTags={allTags} onChange={handleTagsChange} />
</div>
```

- [ ] **Step 2: Update `App.tsx` to derive and pass `allTags`**

In `App.tsx`, derive `allTags` from `documents`:

```tsx
const allTags = Array.from(new Set(documents.flatMap((d) => d.tags ?? []))).sort()
```

Pass to `DocumentEditor`:
```tsx
<DocumentEditor
  doc={selectedDoc}
  ragModelReady={rag.embedStatus === 'ready'}
  allTags={allTags}
  onUpdate={update}
  onEmbed={handleEmbedDoc}
  onBack={() => setSelectedDocId(null)}
  onDelete={async (id) => { await handleRemoveDoc(id); setSelectedDocId(null) }}
/>
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/documents/DocumentEditor.tsx src/components/App.tsx
git commit -m "feat: integrate TagEditor into DocumentEditor"
```

---

### Task 4: `FilterDropdown` component

**Files:**
- Create: `src/components/documents/FilterDropdown.tsx`

**Context:** A button that opens a dropdown with two sections: Categoría (radio) and Etiquetas (checkboxes). Shows a badge with the count of active filters. Closes on outside click or Escape.

- [ ] **Step 1: Create `FilterDropdown.tsx`**

```tsx
// src/components/documents/FilterDropdown.tsx
'use client'

import { useState, useRef, useEffect } from 'react'

const CATEGORY_LABELS: Record<string, string> = {
  factura: '🧾 Factura',
  contrato: '📝 Contrato',
  médico: '🏥 Médico',
  identidad: '🪪 Identidad',
  seguro: '🛡️ Seguro',
  bancario: '🏦 Bancario',
  hogar: '🏠 Hogar',
  otro: '📄 Otro',
}

export interface FilterState {
  category: string | null
  tags: string[]
}

interface Props {
  categories: string[]
  availableTags: string[]
  filter: FilterState
  onChange: (f: FilterState) => void
}

export default function FilterDropdown({ categories, availableTags, filter, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  const activeCount = (filter.category ? 1 : 0) + filter.tags.length

  const toggleTag = (tag: string) => {
    const next = filter.tags.includes(tag)
      ? filter.tags.filter((t) => t !== tag)
      : [...filter.tags, tag]
    onChange({ ...filter, tags: next })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-dim hover:text-ink hover:bg-white/5 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>
        Filtrar
        {activeCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-medium leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-20 w-56 bg-surface border border-white/10 rounded-2xl shadow-xl p-3 space-y-3">
          {/* Category section */}
          {categories.length > 0 && (
            <div>
              <p className="section-label mb-1.5">Categoría</p>
              <div className="space-y-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="cat-filter"
                    checked={filter.category === null}
                    onChange={() => onChange({ ...filter, category: null })}
                    className="accent-accent"
                  />
                  <span className="text-xs text-dim">Todas</span>
                </label>
                {categories.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cat-filter"
                      checked={filter.category === cat}
                      onChange={() => onChange({ ...filter, category: cat })}
                      className="accent-accent"
                    />
                    <span className="text-xs text-dim">{CATEGORY_LABELS[cat] ?? cat}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Tags section */}
          {availableTags.length > 0 && (
            <div>
              <p className="section-label mb-1.5">Etiquetas</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {availableTags.map((tag) => (
                  <label key={tag} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filter.tags.includes(tag)}
                      onChange={() => toggleTag(tag)}
                      className="accent-accent"
                    />
                    <span className="text-xs text-dim">{tag}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => onChange({ category: null, tags: [] })}
              className="text-xs text-err/70 hover:text-err transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/documents/FilterDropdown.tsx
git commit -m "feat: FilterDropdown — category radio + tags checkboxes"
```

---

### Task 5: Update `DocumentList` — unified search + filter

**Files:**
- Modify: `src/components/documents/DocumentList.tsx`

**Context:** Currently `DocumentList` has a local `filter` state (category string) and renders category pill buttons. Replace with: search input + `FilterDropdown`. Filter logic now combines text search (title + category + tags) AND dropdown filters (category AND/OR tags). The existing category pills are removed.

- [ ] **Step 1: Rewrite filter logic in `DocumentList.tsx`**

Replace the current filter state and UI with:

```tsx
'use client'

import { useState } from 'react'
import type { ScannedDocument } from '@/types/document'
import DocumentCard from './DocumentCard'
import FilterDropdown, { type FilterState } from './FilterDropdown'
import Button from '@/components/ui/Button'

interface Props {
  documents: ScannedDocument[]
  loading: boolean
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onScanClick?: () => void
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

export default function DocumentList({ documents, loading, onOpen, onDelete, onScanClick }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterState>({ category: null, tags: [] })

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
    // Text search: title, category, tags
    if (q) {
      const inTitle = doc.title.toLowerCase().includes(q)
      const inCat = (doc.category ?? '').toLowerCase().includes(q)
      const inTags = (doc.tags ?? []).some((t) => t.includes(q))
      if (!inTitle && !inCat && !inTags) return false
    }
    // Category filter
    if (filter.category && doc.category !== filter.category) return false
    // Tags filter (OR: doc must have at least one of the selected tags)
    if (filter.tags.length > 0) {
      const docTags = doc.tags ?? []
      if (!filter.tags.some((t) => docTags.includes(t))) return false
    }
    return true
  })

  const activeFilterCount = (filter.category ? 1 : 0) + filter.tags.length

  return (
    <div className="p-4 sm:p-6 space-y-4 animate-fade-in">
      {/* Search + filter bar */}
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
      </div>

      {/* Active filter chips */}
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

      <div className="flex items-center justify-between gap-2">
        <p className="section-label">{filtered.length} documento{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="space-y-3">
        {filtered.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} onOpen={() => onOpen(doc.id)} onDelete={() => onDelete(doc.id)} />
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-dim text-center py-6">No hay documentos que coincidan con tu búsqueda.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 4: Commit**

```bash
git add src/components/documents/DocumentList.tsx
git commit -m "feat: unified search + FilterDropdown in DocumentList replacing category pills"
```
