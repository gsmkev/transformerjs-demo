# Search Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fullscreen search overlay accessible from a 🔍 icon in the header and `Cmd/Ctrl+K`. Searches document titles and raw text using BM25, shows results with contextual snippets, and navigates to the DocumentEditor on click.

**Architecture:** A `searchIndex.ts` wrapper builds a `BM25Index` (already exists in `src/services/bm25.ts`) per query. A `SearchOverlay` component manages input, debounce, and results rendering. `App.tsx` owns the `searchOpen` boolean, registers the keyboard shortcut, and wires `onNavigate`. The header gets a search icon button.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v3, `BM25Index` from `src/services/bm25.ts`

---

### Task 1: `searchIndex.ts` — BM25 search over documents

**Files:**
- Create: `src/lib/searchIndex.ts`

**Context:** The existing `BM25Index` in `src/services/bm25.ts` takes an array of strings and returns scored indices. We wrap it to search `ScannedDocument[]` and generate a contextual snippet around the match. The index is rebuilt per query (cheap for < 200 documents).

- [ ] **Step 1: Create `searchIndex.ts`**

```typescript
// src/lib/searchIndex.ts
import { BM25Index } from '@/services/bm25'
import type { ScannedDocument } from '@/types/document'

export interface SearchResult {
  doc: ScannedDocument
  snippet: string
  score: number
}

function extractSnippet(text: string, query: string): string {
  const lower = text.toLowerCase()
  const qLower = query.toLowerCase().trim()
  const firstTerm = qLower.split(/\s+/)[0]
  const idx = lower.indexOf(firstTerm)
  if (idx === -1) return text.slice(0, 120).trim() + '…'
  const start = Math.max(0, idx - 50)
  const end = Math.min(text.length, idx + firstTerm.length + 70)
  const before = start > 0 ? '…' : ''
  const after = end < text.length ? '…' : ''
  return before + text.slice(start, end).trim() + after
}

export function searchDocuments(query: string, documents: ScannedDocument[]): SearchResult[] {
  if (!query.trim() || documents.length === 0) return []
  const corpus = documents.map((d) => `${d.title} ${d.rawText}`)
  const index = new BM25Index(corpus)
  const hits = index.search(query, 10)
  return hits.map(({ idx, score }) => ({
    doc: documents[idx],
    snippet: extractSnippet(documents[idx].rawText, query),
    score,
  }))
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/searchIndex.ts
git commit -m "feat: searchIndex — BM25 search over documents with contextual snippets"
```

---

### Task 2: `SearchOverlay` component

**Files:**
- Create: `src/components/search/SearchOverlay.tsx`

**Context:** Fullscreen overlay with a search input, debounced 200ms, results list. Each result shows title, category+date, and snippet with match highlighted. Clicking a result calls `onNavigate(docId)`. Closes on Escape or backdrop click.

- [ ] **Step 1: Create `SearchOverlay.tsx`**

```tsx
// src/components/search/SearchOverlay.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ScannedDocument } from '@/types/document'
import { searchDocuments, type SearchResult } from '@/lib/searchIndex'

const CATEGORY_LABELS: Record<string, string> = {
  factura: '🧾 Factura', contrato: '📝 Contrato', médico: '🏥 Médico',
  identidad: '🪪 Identidad', seguro: '🛡️ Seguro', bancario: '🏦 Bancario',
  hogar: '🏠 Hogar', otro: '📄 Otro',
}

interface Props {
  documents: ScannedDocument[]
  onNavigate: (docId: string) => void
  onClose: () => void
}

function highlightMatch(text: string, query: string): React.ReactNode {
  const term = query.trim().split(/\s+/)[0]
  if (!term) return text
  const idx = text.toLowerCase().indexOf(term.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent/20 text-accent rounded px-0.5 not-italic">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  )
}

export default function SearchOverlay({ documents, onNavigate, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleChange = useCallback((q: string) => {
    setQuery(q)
    clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(() => {
      setResults(searchDocuments(q, documents))
    }, 200)
  }, [documents])

  const handleSelect = (docId: string) => {
    onClose()
    onNavigate(docId)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="max-w-xl mx-auto mt-16 sm:mt-24 rounded-2xl bg-surface border border-white/10 shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/7">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dim flex-shrink-0" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Buscar en tus documentos…"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-dim/50 focus:outline-none"
            aria-label="Buscar documentos"
          />
          <button
            type="button"
            onClick={onClose}
            className="text-dim hover:text-ink text-xs px-1.5 py-0.5 rounded border border-white/10 transition-colors"
          >
            Esc
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim().length < 2 ? (
            <p className="text-xs text-dim/60 text-center py-8">Escribe para buscar en tus documentos</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-dim/60 text-center py-8">
              No se encontraron documentos para «{query}»
            </p>
          ) : (
            <ul role="listbox">
              {results.map(({ doc, snippet }) => {
                const date = new Date(doc.createdAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
                return (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(doc.id)}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    >
                      <p className="text-sm font-medium text-ink truncate">{doc.title}</p>
                      <p className="text-xs text-dim/70 mt-0.5">
                        {doc.category ? `${CATEGORY_LABELS[doc.category] ?? doc.category} · ` : ''}{date}
                      </p>
                      <p className="text-xs text-dim/70 mt-1 italic line-clamp-2">
                        {highlightMatch(snippet, query)}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
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

- [ ] **Step 3: Commit**

```bash
git add src/components/search/SearchOverlay.tsx
git commit -m "feat: SearchOverlay component — BM25 results with snippet highlight"
```

---

### Task 3: Wire `SearchOverlay` into `App.tsx`

**Files:**
- Modify: `src/components/App.tsx`

**Context:** `App.tsx` manages the `searchOpen` boolean, the global `Cmd/Ctrl+K` shortcut, a 🔍 button in the header, and `onNavigate` which opens DocumentEditor for the selected doc.

- [ ] **Step 1: Update `App.tsx`**

1. Import `SearchOverlay`:
```tsx
import SearchOverlay from '@/components/search/SearchOverlay'
```

2. Add state (after `const [saving, setSaving] = useState(false)`):
```tsx
const [searchOpen, setSearchOpen] = useState(false)
```

3. Add keyboard shortcut effect (after the existing hooks):
```tsx
useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setSearchOpen(true)
    }
  }
  window.addEventListener('keydown', handleKey)
  return () => window.removeEventListener('keydown', handleKey)
}, [])
```

4. Add `handleSearchNavigate` callback (after `handleTabChange`):
```tsx
const handleSearchNavigate = useCallback((docId: string) => {
  setSelectedDocId(docId)
  handleTabChange('documents')
}, [handleTabChange])
```

5. In the header, add the search button between the logo div and the theme toggle (or InstallButton if no theme toggle yet):
```tsx
<button
  onClick={() => setSearchOpen(true)}
  aria-label="Buscar documentos (Cmd+K)"
  className="p-2 rounded-lg hover:bg-white/5 transition-colors text-dim hover:text-ink flex-shrink-0"
>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
</button>
```

6. Render `SearchOverlay` just before the closing `</div>` of the root element:
```tsx
{searchOpen && (
  <SearchOverlay
    documents={documents}
    onNavigate={handleSearchNavigate}
    onClose={() => setSearchOpen(false)}
  />
)}
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
git add src/components/App.tsx
git commit -m "feat: search overlay wired in App — Cmd+K shortcut + header icon"
```
