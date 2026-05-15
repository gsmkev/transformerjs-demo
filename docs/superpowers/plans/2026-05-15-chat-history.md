# Chat History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-save RAG chat conversations to IndexedDB. Users can browse, rename, delete, and resume past conversations via a sidebar (desktop) or modal (mobile) within RagView.

**Architecture:** DB migrates to v4, adding `chat_histories` store. `chatHistoryStorage.ts` handles CRUD. `useChatHistory` hook manages state. `useRag` calls `saveHistory` after each complete response. `ChatHistorySidebar` renders the list UI. `RagView` gains a two-column `lg:grid` layout.

**Tech Stack:** Next.js 15, TypeScript, IndexedDB (idb), `nanoid`

---

### Task 1: Add `ChatHistory` type and update `db.ts`

**Files:**
- Modify: `src/types/document.ts`
- Modify: `src/services/db.ts`

**Context:** DB is currently at v3. We bump to v4, adding `chat_histories` store. `ChatMessage` is already defined in `useRag.ts` — we import it from there (or redefine in types). Check current location:

```bash
grep -rn "ChatMessage" src/ --include="*.ts" --include="*.tsx" | head -10
```

- [ ] **Step 1: Add `ChatHistory` to `document.ts`**

In `src/types/document.ts`, add at the end:

```typescript
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: import('./document').ScannedDocument[]
}

export interface ChatHistory {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}
```

**Note:** If `ChatMessage` is already defined in `useRag.ts`, we need to decide whether to move it to `document.ts` or keep it there and import from `useRag`. Simplest: define it in `document.ts` and update `useRag.ts` to import from there. Check if `ChatMessage` is exported from `useRag.ts`:

```bash
grep -n "export.*ChatMessage\|ChatMessage" src/hooks/useRag.ts | head -5
```

If it's defined there without export, add `export` to it and update the import in `useChatHistory` to come from `useRag.ts`. If cleaner, redefine in `document.ts` and update `useRag.ts` to import it.

- [ ] **Step 2: Update `db.ts` to v4**

In `src/services/db.ts`:

1. Update `DB_VERSION` from `3` to `4`:
```typescript
const DB_VERSION = 4
```

2. Update `DocStore` type to include `chat_histories`:
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
}
```

3. Import `ChatHistory` at the top:
```typescript
import type { ScannedDocument, DocumentChunk, ChatHistory } from '@/types/document'
```

4. Add migration step in `upgrade()`:
```typescript
if (oldVersion < 4) {
  const store = db.createObjectStore('chat_histories', { keyPath: 'id' })
  store.createIndex('createdAt', 'createdAt')
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/document.ts src/services/db.ts
git commit -m "feat: add ChatHistory type and DB v4 migration for chat_histories store"
```

---

### Task 2: `chatHistoryStorage.ts`

**Files:**
- Create: `src/services/chatHistoryStorage.ts`

**Context:** CRUD operations on the `chat_histories` IndexedDB store. `pruneChatHistories` deletes the oldest histories if the total count exceeds `limit`. `Infinity` as limit means no pruning.

- [ ] **Step 1: Create `chatHistoryStorage.ts`**

```typescript
// src/services/chatHistoryStorage.ts
import { getDb } from './db'
import type { ChatHistory } from '@/types/document'

export async function saveChatHistory(history: ChatHistory): Promise<void> {
  const db = await getDb()
  await db.put('chat_histories', history)
}

export async function getAllChatHistories(): Promise<ChatHistory[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('chat_histories', 'createdAt')
  return all.reverse() // newest first
}

export async function updateChatHistory(id: string, patch: Partial<ChatHistory>): Promise<void> {
  const db = await getDb()
  const existing = await db.get('chat_histories', id)
  if (!existing) return
  await db.put('chat_histories', { ...existing, ...patch, updatedAt: Date.now() })
}

export async function deleteChatHistory(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('chat_histories', id)
}

export async function pruneChatHistories(limit: number): Promise<void> {
  if (!isFinite(limit)) return
  const db = await getDb()
  const all = await db.getAllFromIndex('chat_histories', 'createdAt') // oldest first
  if (all.length <= limit) return
  const toDelete = all.slice(0, all.length - limit)
  const tx = db.transaction('chat_histories', 'readwrite')
  await Promise.all(toDelete.map((h) => tx.store.delete(h.id)))
  await tx.done
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/chatHistoryStorage.ts
git commit -m "feat: chatHistoryStorage — CRUD + prune for chat histories in IndexedDB"
```

---

### Task 3: `useChatHistory` hook

**Files:**
- Create: `src/hooks/useChatHistory.ts`

**Context:** Loads histories on mount. Exposes `saveHistory(messages)` which creates or updates the active conversation (uses `nanoid` for new IDs). Title generation: uses LLM if available (caller passes a `generateTitle` function), otherwise truncates the first user message to 60 chars. `loadHistory` returns messages so the caller can restore chat state.

- [ ] **Step 1: Create `useChatHistory.ts`**

```typescript
// src/hooks/useChatHistory.ts
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { nanoid } from 'nanoid'
import type { ChatHistory, ChatMessage } from '@/types/document'
import {
  saveChatHistory, getAllChatHistories, updateChatHistory,
  deleteChatHistory, pruneChatHistories,
} from '@/services/chatHistoryStorage'

interface UseChatHistoryOptions {
  limit: number
  generateTitle?: (firstUserMessage: string) => Promise<string>
}

export function useChatHistory({ limit, generateTitle }: UseChatHistoryOptions) {
  const [histories, setHistories] = useState<ChatHistory[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeIdRef = useRef<string | null>(null)

  useEffect(() => {
    getAllChatHistories().then(setHistories)
  }, [])

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  const refresh = useCallback(async () => {
    setHistories(await getAllChatHistories())
  }, [])

  const saveHistory = useCallback(async (messages: ChatMessage[]): Promise<void> => {
    if (messages.length === 0) return

    const firstUserMsg = messages.find((m) => m.role === 'user')?.content ?? ''
    const now = Date.now()

    if (!activeIdRef.current) {
      // New conversation
      const id = nanoid()
      let title = firstUserMsg.slice(0, 60)
      if (generateTitle) {
        try { title = await generateTitle(firstUserMsg) } catch { /* keep truncated title */ }
      }
      const history: ChatHistory = { id, title, messages, createdAt: now, updatedAt: now }
      await saveChatHistory(history)
      setActiveId(id)
      activeIdRef.current = id
    } else {
      await updateChatHistory(activeIdRef.current, { messages, updatedAt: now })
    }

    await pruneChatHistories(limit)
    await refresh()
  }, [generateTitle, limit, refresh])

  const loadHistory = useCallback((id: string): ChatMessage[] | null => {
    const history = histories.find((h) => h.id === id)
    if (!history) return null
    setActiveId(id)
    return history.messages
  }, [histories])

  const deleteHistory = useCallback(async (id: string): Promise<void> => {
    await deleteChatHistory(id)
    if (activeIdRef.current === id) {
      setActiveId(null)
      activeIdRef.current = null
    }
    await refresh()
  }, [refresh])

  const renameHistory = useCallback(async (id: string, title: string): Promise<void> => {
    await updateChatHistory(id, { title })
    await refresh()
  }, [refresh])

  const startNew = useCallback(() => {
    setActiveId(null)
    activeIdRef.current = null
  }, [])

  return { histories, activeId, saveHistory, loadHistory, deleteHistory, renameHistory, startNew }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useChatHistory.ts
git commit -m "feat: useChatHistory hook — load/save/delete/rename conversations"
```

---

### Task 4: `ChatHistorySidebar` component

**Files:**
- Create: `src/components/rag/ChatHistorySidebar.tsx`

**Context:** Renders as a sidebar on desktop (`lg:flex hidden flex-col`) and as a modal on mobile (triggered by a "Historial" button). Each item shows the title with hover edit/delete buttons. Active item is highlighted.

- [ ] **Step 1: Create `ChatHistorySidebar.tsx`**

```tsx
// src/components/rag/ChatHistorySidebar.tsx
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
          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') { setTitle(history.title); setEditing(false) } }}
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
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-0.5 text-dim/60 hover:text-err transition-colors"
            aria-label="Eliminar"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

function HistoryList({ histories, activeId, onSelect, onNew, onDelete, onRename }: Props) {
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
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col border-r border-white/7 p-3 min-h-0 overflow-hidden">
        <p className="section-label mb-2 px-1">Conversaciones</p>
        <HistoryList {...props} />
      </div>

      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 text-xs text-dim hover:text-ink hover:bg-white/5 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
        Historial
      </button>

      {/* Mobile modal */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={(e) => { if (e.target === e.currentTarget) setMobileOpen(false) }}
        >
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-surface border-l border-white/10 flex flex-col p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-ink">Conversaciones</p>
              <button onClick={() => setMobileOpen(false)} className="text-dim hover:text-ink transition-colors" aria-label="Cerrar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <HistoryList
                {...props}
                onSelect={(id) => { props.onSelect(id); setMobileOpen(false) }}
                onNew={() => { props.onNew(); setMobileOpen(false) }}
              />
            </div>
          </div>
        </div>
      )}
    </>
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
git add src/components/rag/ChatHistorySidebar.tsx
git commit -m "feat: ChatHistorySidebar — desktop sidebar + mobile modal for chat history"
```

---

### Task 5: Integrate `useChatHistory` into `useRag.ts`

**Files:**
- Modify: `src/hooks/useRag.ts`

**Context:** `useRag` currently exports `clearChat`. We need to wire `saveHistory` after each completed response and expose the chat history API. The `chat()` function needs access to `saveHistory`. We pass `saveHistory` and `chatLimit` as parameters to avoid circular deps.

Since hooks can't call other hooks from a callback, the cleanest approach: accept `onSaveHistory: ((msgs: ChatMessage[]) => Promise<void>) | null` as a parameter in `chat()`, or expose `chat` as a function that `RagView` calls with the history saver injected.

Simpler: add `onAfterChat?: (messages: ChatMessage[]) => void` to the `useRag` return shape, and call it at the end of `chat()`.

- [ ] **Step 1: Read the `chat()` function in `useRag.ts`**

```bash
sed -n '275,360p' src/hooks/useRag.ts
```

Note where the streaming ends and the assistant message is finalized.

- [ ] **Step 2: Add `onAfterChat` callback parameter to `useRag`**

In `useRag.ts`, update the `chat` useCallback to accept and call an optional external callback:

Find the end of the `chat` function where streaming is complete and `messagesRef.current` has the full conversation. Add:

```typescript
// At the end of the chat function, after streaming is done:
// (The final messages are in messagesRef.current)
onAfterChat?.(messagesRef.current)
```

Update the `useRag` return to export a setter for `onAfterChat`, or better: accept it as a configuration parameter to the hook.

Add to the `useRag` function signature:
```typescript
export function useRag(config?: { onAfterChat?: (messages: ChatMessage[]) => void }) {
```

And call `config?.onAfterChat?.(messagesRef.current)` at the end of `chat()` after streaming completes.

- [ ] **Step 3: Update `App.tsx` to wire `useChatHistory` into `useRag`**

In `App.tsx`:

1. Import:
```tsx
import { useChatHistory } from '@/hooks/useChatHistory'
```

2. Read chat limit from localStorage:
```tsx
const chatLimit = (() => {
  if (typeof window === 'undefined') return 25
  const stored = localStorage.getItem('papeleo_chat_limit')
  if (stored === 'Infinity') return Infinity
  const n = Number(stored)
  return isNaN(n) ? 25 : n
})()
```

3. Instantiate `useChatHistory` (before `useRag`):
```tsx
const chatHistory = useChatHistory({ limit: chatLimit })
```

4. Pass `onAfterChat` to `useRag`:
```tsx
const rag = useRag({ onAfterChat: chatHistory.saveHistory })
```

5. Pass `chatHistory` to `RagView`:
```tsx
<RagView
  documents={documents}
  chunks={chunks}
  rag={rag}
  chatHistory={chatHistory}
  onEmbedDoc={handleEmbedDoc}
  onEmbedAll={handleEmbedAll}
  onNavigateToModels={() => handleTabChange('engines')}
/>
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRag.ts src/components/App.tsx
git commit -m "feat: useRag saves chat history after each complete response"
```

---

### Task 6: Update `RagView` with sidebar and history restoration

**Files:**
- Modify: `src/components/rag/RagView.tsx`

**Context:** Add `chatHistory` prop. Render `ChatHistorySidebar` (desktop sidebar + mobile trigger). Switch to `lg:grid lg:grid-cols-[220px_1fr]` layout. When user selects a history, load the messages back into `rag` state via `rag.setMessages` (if exposed) or a `clearChat` + re-populate approach.

- [ ] **Step 1: Check what `rag.clearChat` and `rag.messages` expose**

```bash
grep -n "clearChat\|setMessages\|return {" src/hooks/useRag.ts | tail -20
```

Note whether `setMessages` is exported. If not, we need to expose it or add a `loadMessages` function to `useRag`.

- [ ] **Step 2: Add `loadMessages` to `useRag.ts`**

In `useRag.ts`, add to the return object:
```typescript
loadMessages: (msgs: ChatMessage[]) => {
  setMessages(msgs)
  messagesRef.current = msgs
},
```

- [ ] **Step 3: Update `RagView.tsx` props and layout**

Add `chatHistory` to `RagView` props:

```tsx
import type { useChatHistory } from '@/hooks/useChatHistory'
import ChatHistorySidebar from './ChatHistorySidebar'

interface Props {
  documents: ScannedDocument[]
  chunks: DocumentChunk[]
  rag: ReturnType<typeof useRag>
  chatHistory: ReturnType<typeof useChatHistory>
  onEmbedDoc: (doc: ScannedDocument) => Promise<void>
  onEmbedAll: () => Promise<void>
  onNavigateToModels: () => void
}
```

Wrap the top-level return div with a grid layout on desktop:

```tsx
return (
  <div className="lg:grid lg:grid-cols-[220px_1fr] lg:min-h-[calc(100vh-57px-48px)] animate-fade-in">
    <ChatHistorySidebar
      histories={chatHistory.histories}
      activeId={chatHistory.activeId}
      onSelect={(id) => {
        const msgs = chatHistory.loadHistory(id)
        if (msgs) rag.loadMessages(msgs)
      }}
      onNew={() => {
        chatHistory.startNew()
        rag.clearChat()
      }}
      onDelete={chatHistory.deleteHistory}
      onRename={chatHistory.renameHistory}
    />

    {/* Existing chat UI wrapped in a div */}
    <div className="p-4 sm:p-6 space-y-4">
      {/* ... all existing content ... */}
    </div>
  </div>
)
```

Also add the mobile "Historial" button inside the chat area header (the component renders it itself via `ChatHistorySidebar`'s mobile trigger — but `ChatHistorySidebar` needs to be rendered inside the grid for the trigger to appear in the right place). The mobile trigger button is already part of `ChatHistorySidebar` and renders as `lg:hidden`, so it will appear in the normal flow when the sidebar column collapses.

Add it to the chat header area in `RagView`:
```tsx
<div className="flex items-center gap-2 flex-wrap">
  {/* The ChatHistorySidebar mobile trigger renders here */}
  <ChatHistorySidebar ... /> {/* This renders the lg:hidden button inline */}
  {/* rest of header */}
</div>
```

Wait — `ChatHistorySidebar` renders both desktop sidebar AND mobile trigger from the same component. To put the mobile trigger in the chat header, we need to split them. The simplest approach: the sidebar renders `hidden lg:flex` for desktop, and separately, `RagView` renders a standalone "Historial" `lg:hidden` button that triggers the modal.

Refactor: Pass `mobileOpen` and `setMobileOpen` as state in `RagView`, or let `ChatHistorySidebar` handle both with the trigger rendered inline (the `lg:hidden` button gets rendered wherever `ChatHistorySidebar` appears in JSX — if it's in the grid column, it won't appear in the chat header on mobile).

Simplest fix: move the mobile trigger button out of `ChatHistorySidebar` into `RagView`, and pass a `onOpenMobile` prop to `ChatHistorySidebar`:

Update `ChatHistorySidebar` to accept `mobileOpen` and `onMobileOpenChange`:
```tsx
// In ChatHistorySidebar, remove the internal mobileOpen state
// Accept these as props:
interface Props {
  ...
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}
```

In `RagView`, manage the mobile open state and render the trigger button in the chat header.

- [ ] **Step 4: Type-check and build**

```bash
npx tsc --noEmit && npm run build
```

Expected: 0 errors, clean build.

- [ ] **Step 5: Commit**

```bash
git add src/components/rag/RagView.tsx src/components/rag/ChatHistorySidebar.tsx src/hooks/useRag.ts
git commit -m "feat: RagView integrates chat history sidebar with desktop grid + mobile modal"
```
