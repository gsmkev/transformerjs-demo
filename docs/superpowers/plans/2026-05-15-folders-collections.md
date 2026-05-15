# Folders / Collections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users can create named collections (folders), assign any document to a collection, and filter the library by collection. Collections are stored in a new `collections` IndexedDB store (DB v5 migration). The library sidebar shows a collection list; clicking one filters documents to that collection.

**Architecture:** New `Collection` type in `src/types/document.ts`. `ScannedDocument` gains an optional `collectionId?: string | null`. DB migrates to version 5 adding a `collections` store. `src/services/collectionStorage.ts` provides CRUD. `useCollections` hook manages state. `DocumentList` gains a left sidebar (desktop) / filter chip (mobile) listing collections. Documents can be assigned a collection from `DocumentEditor`. `DocumentCard` shows a small collection pill when set.

**Tech Stack:** TypeScript, React, `idb`, Tailwind CSS v3

---

## File Map

| File | Action |
|------|--------|
| `src/types/document.ts` | Modify — add `Collection` interface + `collectionId` to `ScannedDocument` |
| `src/services/db.ts` | Modify — DB_VERSION 5, add `collections` store |
| `src/services/collectionStorage.ts` | **Create** — CRUD for collections |
| `src/hooks/useCollections.ts` | **Create** — collections state management |
| `src/components/documents/CollectionSidebar.tsx` | **Create** — sidebar with collection list |
| `src/components/documents/DocumentList.tsx` | Modify — integrate collection sidebar + filter |
| `src/components/documents/DocumentCard.tsx` | Modify — show collection pill |
| `src/components/documents/DocumentEditor.tsx` | Modify — collection selector |
| `src/components/App.tsx` | Modify — pass collections to DocumentList + DocumentEditor |

---

### Task 1: Types + DB migration

**Files:**
- Modify: `src/types/document.ts`
- Modify: `src/services/db.ts`

- [ ] **Step 1: Add Collection type and collectionId to ScannedDocument**

In `src/types/document.ts`, after the `ChatHistory` interface, add:

```typescript
export interface Collection {
  id: string
  name: string
  color: string    // hex color for the pill, e.g. "#6366f1"
  createdAt: number
}
```

In `ScannedDocument`, add after `summary`:

```typescript
  collectionId?: string | null    // references Collection.id
```

- [ ] **Step 2: Migrate DB to version 5**

In `src/services/db.ts`:

1. Add `Collection` to the import line:
```typescript
import type { ScannedDocument, DocumentChunk, ChatHistory, Collection } from '@/types/document'
```

2. Change `DB_VERSION = 4` to `DB_VERSION = 5`.

3. Add `collections` to the `DocStore` type:
```typescript
export type DocStore = {
  documents: {
    key: string
    value: ScannedDocument
    indexes: { createdAt: number; category: string }
  }
  chunks: {
    key: string
    value: DocumentChunk
    indexes: { docId: string }
  }
  chat_histories: {
    key: string
    value: ChatHistory
    indexes: { createdAt: number }
  }
  collections: {
    key: string
    value: Collection
    indexes: { createdAt: number }
  }
}
```

4. In the `upgrade` callback, add the new migration block:
```typescript
if (oldVersion < 5) {
  const store = db.createObjectStore('collections', { keyPath: 'id' })
  store.createIndex('createdAt', 'createdAt')
}
```

5. Set `_db = null` singleton reset is not needed — opening a higher version triggers the upgrade automatically.

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/document.ts src/services/db.ts
git commit -m "feat: Collection type + DB v5 migration — collections store"
```

---

### Task 2: collectionStorage service

**Files:**
- Create: `src/services/collectionStorage.ts`

- [ ] **Step 1: Create the CRUD service**

```typescript
// src/services/collectionStorage.ts
import { getDb } from './db'
import type { Collection } from '@/types/document'

export async function saveCollection(col: Collection): Promise<void> {
  const db = await getDb()
  await db.put('collections', col)
}

export async function getAllCollections(): Promise<Collection[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('collections', 'createdAt')
  return all // already sorted by createdAt ascending
}

export async function updateCollection(id: string, patch: Partial<Collection>): Promise<void> {
  const db = await getDb()
  const existing = await db.get('collections', id)
  if (!existing) return
  await db.put('collections', { ...existing, ...patch })
}

export async function deleteCollection(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('collections', id)
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/collectionStorage.ts
git commit -m "feat: collectionStorage — CRUD for collections in IndexedDB"
```

---

### Task 3: useCollections hook

**Files:**
- Create: `src/hooks/useCollections.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/hooks/useCollections.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Collection } from '@/types/document'
import {
  saveCollection,
  getAllCollections,
  updateCollection,
  deleteCollection,
} from '@/services/collectionStorage'

const COLLECTION_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
]

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([])

  useEffect(() => {
    getAllCollections().then(setCollections)
  }, [])

  const create = useCallback(async (name: string): Promise<Collection> => {
    const colorIdx = collections.length % COLLECTION_COLORS.length
    const col: Collection = {
      id: crypto.randomUUID(),
      name: name.trim(),
      color: COLLECTION_COLORS[colorIdx],
      createdAt: Date.now(),
    }
    await saveCollection(col)
    setCollections((prev) => [...prev, col])
    return col
  }, [collections.length])

  const rename = useCallback(async (id: string, name: string): Promise<void> => {
    await updateCollection(id, { name: name.trim() })
    setCollections((prev) => prev.map((c) => c.id === id ? { ...c, name: name.trim() } : c))
  }, [])

  const remove = useCallback(async (id: string): Promise<void> => {
    await deleteCollection(id)
    setCollections((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return { collections, create, rename, remove } as const
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCollections.ts
git commit -m "feat: useCollections hook — create, rename, remove collections"
```

---

### Task 4: CollectionSidebar component

**Files:**
- Create: `src/components/documents/CollectionSidebar.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/documents/CollectionSidebar.tsx
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

      {/* All documents */}
      <button
        onClick={() => onSelect(null)}
        className={`text-left px-3 py-2 rounded-xl text-xs transition-colors ${
          selectedId === null ? 'bg-accent/15 text-accent' : 'text-dim hover:text-ink hover:bg-white/5'
        }`}
      >
        Todos los documentos
      </button>

      {/* Collection list */}
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
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: col.color }}
                aria-hidden="true"
              />
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

      {/* New collection */}
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/documents/CollectionSidebar.tsx
git commit -m "feat: CollectionSidebar — list, create, rename, delete collections"
```

---

### Task 5: Integrate collections into DocumentList and DocumentCard

**Files:**
- Modify: `src/components/documents/DocumentList.tsx`
- Modify: `src/components/documents/DocumentCard.tsx`

- [ ] **Step 1: Add collection filter and sidebar to DocumentList**

In `src/components/documents/DocumentList.tsx`, add new props:

```typescript
import CollectionSidebar from './CollectionSidebar'
import type { Collection } from '@/types/document'
import type { useCollections } from '@/hooks/useCollections'

// Add to Props interface:
collections: Collection[]
onCreateCollection: (name: string) => Promise<void>
onRenameCollection: (id: string, name: string) => Promise<void>
onDeleteCollection: (id: string) => Promise<void>
```

Add state for selected collection:

```typescript
const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)
```

Update the `filtered` computation to include collection filter:

```typescript
// After existing tag/category filters:
if (selectedCollectionId !== null && doc.collectionId !== selectedCollectionId) return false
```

Wrap the existing list in a two-column layout with the sidebar on the left (desktop only):

```tsx
<div className="flex min-h-0">
  {/* Collection sidebar — desktop only */}
  <div className="hidden sm:block w-44 flex-shrink-0 sticky top-[110px] self-start max-h-[calc(100vh-120px)] overflow-y-auto">
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
  <div className="flex-1 min-w-0 p-4 sm:p-6 space-y-4 animate-fade-in">
    {/* Mobile collection chip filter */}
    {collections.length > 0 && (
      <div className="sm:hidden flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCollectionId(null)}
          className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${
            selectedCollectionId === null ? 'bg-accent/15 border-accent/30 text-accent' : 'border-white/10 text-dim'
          }`}
        >
          Todos
        </button>
        {collections.map((col) => (
          <button
            key={col.id}
            onClick={() => setSelectedCollectionId(selectedCollectionId === col.id ? null : col.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
              selectedCollectionId === col.id ? 'bg-accent/15 border-accent/30 text-accent' : 'border-white/10 text-dim'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} aria-hidden="true" />
            {col.name}
          </button>
        ))}
      </div>
    )}

    {/* ...existing search, filter, card list... */}
  </div>
</div>
```

- [ ] **Step 2: Show collection pill in DocumentCard**

In `src/components/documents/DocumentCard.tsx`, add a prop:

```typescript
// Add to Props interface:
collection?: Collection | null

// Add the import:
import type { Collection } from '@/types/document'
```

In the badge row, after the category badge, add:

```tsx
{collection && (
  <span
    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
    style={{
      backgroundColor: `${collection.color}18`,
      borderColor: `${collection.color}40`,
      color: collection.color,
    }}
  >
    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: collection.color }} aria-hidden="true" />
    {collection.name}
  </span>
)}
```

Pass `collection` from `DocumentList`:

```typescript
// In DocumentList, find the collection for each doc:
const collectionMap = new Map(collections.map((c) => [c.id, c]))

// In DocumentCard render:
<DocumentCard
  ...
  collection={doc.collectionId ? collectionMap.get(doc.collectionId) ?? null : null}
/>
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/documents/DocumentList.tsx src/components/documents/DocumentCard.tsx
git commit -m "feat: collection sidebar + filter in DocumentList; collection pill in DocumentCard"
```

---

### Task 6: Collection selector in DocumentEditor + App.tsx wiring

**Files:**
- Modify: `src/components/documents/DocumentEditor.tsx`
- Modify: `src/components/App.tsx`

- [ ] **Step 1: Add collection selector to DocumentEditor**

In `src/components/documents/DocumentEditor.tsx`, add import and prop:

```typescript
import type { Collection } from '@/types/document'

// Add to Props interface:
collections: Collection[]
onAssignCollection: (collectionId: string | null) => Promise<void>
```

Add a simple `<select>` in the Tags section area (just below the TagEditor):

```tsx
{/* Collection */}
<div className="flex items-center gap-2 mt-2">
  <label className="text-xs text-dim/70 flex-shrink-0">Colección:</label>
  <select
    value={doc.collectionId ?? ''}
    onChange={(e) => onAssignCollection(e.target.value || null)}
    className="text-xs px-2 py-1 rounded-lg border border-white/10 bg-surface text-ink focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 flex-1 max-w-[200px]"
    aria-label="Asignar colección"
  >
    <option value="">Sin colección</option>
    {collections.map((col) => (
      <option key={col.id} value={col.id}>{col.name}</option>
    ))}
  </select>
</div>
```

- [ ] **Step 2: Wire collections in App.tsx**

In `src/components/App.tsx`:

Add import:

```typescript
import { useCollections } from '@/hooks/useCollections'
```

Add hook:

```typescript
const { collections, create: createCollection, rename: renameCollection, remove: removeCollection } = useCollections()
```

Pass to `DocumentList`:

```tsx
<DocumentList
  ...existing props...
  collections={collections}
  onCreateCollection={createCollection}
  onRenameCollection={renameCollection}
  onDeleteCollection={removeCollection}
/>
```

Pass to `DocumentEditor`:

```tsx
<DocumentEditor
  ...existing props...
  collections={collections}
  onAssignCollection={(collectionId) => update(selectedDoc.id, { collectionId })}
/>
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual test**

1. `npm run dev`
2. Open Library tab — left sidebar shows "Colecciones" with "Todos los documentos" selected
3. Click "+ Nueva colección", type "Facturas", press Enter — collection appears with a color dot
4. Open a document, set collection to "Facturas" via the select in the Tags area
5. Back in Library — the card shows a colored "Facturas" pill
6. Click "Facturas" in the sidebar — only that document is shown
7. Double-click collection name — rename in place
8. Click ✕ on the collection — it is deleted (documents retain `collectionId` but filter no longer applies)

- [ ] **Step 5: Commit and push**

```bash
git add src/components/documents/DocumentEditor.tsx src/components/App.tsx src/hooks/useCollections.ts src/services/collectionStorage.ts src/components/documents/CollectionSidebar.tsx
git commit -m "feat: folders/collections — create, filter, assign documents to named collections"
git push -u origin claude/local-ocr-webapp-NowwS
```
