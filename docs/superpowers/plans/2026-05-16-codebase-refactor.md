# Archivo PWA — Codebase Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all runtime bugs, unify AI service state patterns, tighten state management, and remove dead code — without changing any visual design.

**Architecture:** Bottom-up: services first, then hooks, then App.tsx, then components. Each task is independently type-checkable with `npx tsc --noEmit`.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, `@huggingface/transformers`, `@mlc-ai/web-llm`, IndexedDB via `idb`, JSZip.

---

## File Map

| File | What changes |
|------|-------------|
| `src/services/rerankService.ts` | Add `_isReady` flag, fix `isRerankerLoaded()`, remove duplicate `text_pair`, fix catch |
| `src/services/llmService.ts` | Add `_isReady` flag, proper error cleanup in `loadLlmModel` |
| `src/services/extractionService.ts` | Replace fragile regex JSON parsing with `parseJsonFromLlm()` |
| `src/services/backupService.ts` | Replace `new Function()` with direct `import()` |
| `src/services/chatHistoryStorage.ts` | `updateChatHistory` throws when record not found |
| `src/services/collectionStorage.ts` | `updateCollection` throws when record not found |
| `src/services/chunkService.ts` | Bounded parallel embedding (batch of 4) |
| `src/hooks/useBatchOcr.ts` | Fix inverted `removeItem` filter; add FileReader `onerror` |
| `src/hooks/useRag.ts` | Add `isRunningRef` mutex to `chat()` |
| `src/hooks/useDocuments.ts` | `remove()` also deletes chunks from DB + state |
| `src/hooks/usePinLock.ts` | Add `initialized` flag to prevent flash of unprotected UI |
| `src/components/App.tsx` | Remove dead `typeof refresh` guard; simplify `handleRemoveDoc`; guard on `pinLock.initialized` |
| `src/components/rag/RagView.tsx` | Await `rag.chat()`; fix `embeddedCount` to use chunks |

---

## Task 1: Fix `rerankService.ts` — unified `_isReady` pattern

**Files:**
- Modify: `src/services/rerankService.ts`

The current `isRerankerLoaded()` returns `_rerankerPromise !== null`, which is `true` while the model is still downloading. The catch handler also doesn't reset `_isReady`. There is also a duplicate `text_pair` property in the object literal.

- [ ] **Step 1: Replace the entire file**

```typescript
// Cross-encoder reranker: Xenova/ms-marco-MiniLM-L-6-v2
// Takes (query, passage) pairs and scores them for relevance.
// Much more accurate than cosine similarity for passage ranking.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _rerankerPromise: Promise<any> | null = null
let _isReady = false

export function isRerankerLoaded(): boolean {
  return _isReady
}

export async function getReranker(onProgress?: (pct: number) => void) {
  if (!_rerankerPromise) {
    _rerankerPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers')
      const reranker = await pipeline('text-classification', 'Xenova/ms-marco-MiniLM-L-6-v2', {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress_callback: (info: any) => {
          if (typeof info?.progress === 'number') onProgress?.(Math.round(info.progress))
        },
      })
      _isReady = true
      return reranker
    })()
    _rerankerPromise.catch(() => { _rerankerPromise = null; _isReady = false })
  }
  return _rerankerPromise
}

// Score each passage against the query. Returns scores in the same order as passages.
// Higher score = more relevant.
export async function rerankPassages(query: string, passages: string[]): Promise<number[]> {
  const reranker = await getReranker()
  return Promise.all(
    passages.map(async (passage) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (reranker as any)(query, {
          text_pair: passage,
          truncation: true,
        })
        const items: Array<{ score: number }> = Array.isArray(result) ? result : [result]
        return items[0]?.score ?? 0
      } catch {
        return 0
      }
    }),
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/rerankService.ts
git commit -m "fix: rerankService — add _isReady flag, fix isRerankerLoaded, remove duplicate key"
```

---

## Task 2: Fix `llmService.ts` — add `_isReady` flag and proper error cleanup

**Files:**
- Modify: `src/services/llmService.ts`

Currently `_engine` and `_loadedModelId` are set sequentially with no error cleanup. If `CreateMLCEngine` throws partway through, `_isReady` has no defined state. Add explicit `_isReady` flag and wrap in try/catch.

- [ ] **Step 1: Replace the entire file**

```typescript
// WebLLM — runs LLMs locally in the browser using WebGPU.
// Model weights are downloaded from the MLC CDN and cached in the browser.
// Requires Chrome 113+ / Edge 113+ with WebGPU enabled.

export interface LlmChatMsg {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _engine: any | null = null
let _loadedModelId: string | null = null
let _isReady = false

export async function checkWebGpu(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !('gpu' in navigator)) return false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapter = await (navigator as any).gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
}

export function isLlmLoaded(modelId: string): boolean {
  return _isReady && _loadedModelId === modelId
}

export async function loadLlmModel(
  modelId: string,
  onProgress: (text: string, pct: number) => void,
): Promise<void> {
  if (isLlmLoaded(modelId)) return

  _engine = null
  _loadedModelId = null
  _isReady = false

  try {
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm')
    _engine = await CreateMLCEngine(modelId, {
      initProgressCallback: ({ text, progress }: { text: string; progress: number }) => {
        onProgress(text, Math.round(progress * 100))
      },
    })
    _loadedModelId = modelId
    _isReady = true
  } catch (e) {
    _engine = null
    _loadedModelId = null
    _isReady = false
    throw e
  }
}

export async function* streamGenerate(
  systemPrompt: string,
  history: LlmChatMsg[],
  maxTokens = 512,
): AsyncGenerator<string> {
  if (!_engine) throw new Error('LLM not loaded — load a language model first.')

  const stream = await _engine.chat.completions.create({
    messages: [{ role: 'system', content: systemPrompt }, ...history],
    stream: true,
    temperature: 0,
    repetition_penalty: 1.1,
    max_tokens: maxTokens,
  })

  for await (const chunk of stream) {
    const delta: string = chunk.choices[0]?.delta?.content ?? ''
    if (delta) yield delta
  }
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/llmService.ts
git commit -m "fix: llmService — add _isReady flag and atomic error cleanup"
```

---

## Task 3: Fix `useBatchOcr.ts` — inverted removeItem + FileReader onerror

**Files:**
- Modify: `src/hooks/useBatchOcr.ts`

Two bugs:
1. `removeItem` filter: `item.id !== id || item.status !== 'pending'` — the OR means items with the correct id are kept if they're pending (always the case before processing). Should be `item.id !== id`.
2. FileReader `onerror` is unhandled — the Promise never rejects, hanging the UI forever if a file can't be read.

- [ ] **Step 1: Fix `addFiles` — add `onerror` + fix `removeItem`**

In `src/hooks/useBatchOcr.ts`, replace the `addFiles` callback:

```typescript
  const addFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    Promise.all(imageFiles.map((f) => new Promise<BatchItem>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        resolve({
          id: nanoid(),
          file: f,
          dataUrl: e.target?.result as string,
          status: 'pending',
        })
      }
      reader.onerror = () => reject(new Error(`No se pudo leer el archivo: ${f.name}`))
      reader.readAsDataURL(f)
    }))).then((items) => {
      setQueue((prev) => [...prev, ...items])
    }).catch(() => { /* file read errors are non-fatal — skip unreadable files */ })
  }, [])
```

And replace the `removeItem` callback:

```typescript
  const removeItem = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id))
  }, [])
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useBatchOcr.ts
git commit -m "fix: useBatchOcr — invert removeItem filter and handle FileReader onerror"
```

---

## Task 4: Fix `extractionService.ts` — robust JSON parsing

**Files:**
- Modify: `src/services/extractionService.ts`

Current code: `fullResponse.match(/\{[\s\S]*\}/)` — greedy match captures from first `{` to last `}`. If the LLM wraps the JSON in markdown code fences (````json\n{...}\n````), the regex captures the backticks and `JSON.parse` fails. Replace with a helper that strips code fences first.

- [ ] **Step 1: Replace the entire file**

```typescript
import { streamGenerate, isLlmLoaded } from './llmService'
import type { ExtractionField } from '@/types/document'

function parseJsonFromLlm(response: string): Record<string, unknown> {
  const stripped = response.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim()
  try { return JSON.parse(stripped) as Record<string, unknown> } catch { /* fall through */ }
  const match = stripped.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) as Record<string, unknown> } catch { /* fall through */ }
  }
  throw new Error('El modelo no devolvió un JSON válido. Inténtalo de nuevo.')
}

export async function extractStructuredData(
  rawText: string,
  schema: ExtractionField[],
  modelId: string,
): Promise<Record<string, string>> {
  if (!isLlmLoaded(modelId)) {
    throw new Error('El LLM no está cargado — cárgalo en la pestaña Modelos primero.')
  }

  const schemaJson = JSON.stringify(
    Object.fromEntries(schema.map((f) => [f.key, { type: f.type, description: f.description }])),
    null, 2,
  )

  const exampleJson = JSON.stringify(
    Object.fromEntries(schema.map((f) => [f.key, f.type === 'number' ? '0' : ''])),
    null, 2,
  )

  const systemPrompt = `Extract specific fields from the document. Respond with ONLY a valid JSON object — no explanation, no markdown, no code blocks.

Schema (field_key: {type, description}):
${schemaJson}

Respond ONLY with this exact format:
${exampleJson}`

  const userMessage = `Document text:\n${rawText.slice(0, 8000)}`

  let fullResponse = ''
  for await (const chunk of streamGenerate(
    systemPrompt,
    [{ role: 'user', content: userMessage }],
    512,
  )) {
    fullResponse += chunk
  }

  const parsed = parseJsonFromLlm(fullResponse)

  const result: Record<string, string> = {}
  for (const field of schema) {
    result[field.key] = String(parsed[field.key] ?? '')
  }
  return result
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/extractionService.ts
git commit -m "fix: extractionService — replace greedy JSON regex with fence-stripping parser"
```

---

## Task 5: Fix `backupService.ts` — replace `new Function()` with direct import

**Files:**
- Modify: `src/services/backupService.ts`

`new Function('specifier', 'return import(specifier)')` bypasses the module bundler, breaks under strict CSP, and is flagged by static analyzers. Since `chatHistoryStorage` is a first-party module, use a direct `await import()`.

- [ ] **Step 1: Replace the chat history import block inside `importBackup`**

Find this block in `src/services/backupService.ts`:

```typescript
      // Dynamic import with fallback — chatHistoryStorage may not exist yet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dynamicImport = new Function('specifier', 'return import(specifier)') as (s: string) => Promise<any>
      const { saveChatHistory } = await dynamicImport('./chatHistoryStorage').catch(() => ({ saveChatHistory: null }))
      if (saveChatHistory) {
        await saveChatHistory(history)
        result.chatsImported++
      } else {
        result.errors.push(`${path}: chatHistoryStorage not available`)
      }
```

Replace it with:

```typescript
      const { saveChatHistory } = await import('./chatHistoryStorage')
      await saveChatHistory(history)
      result.chatsImported++
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/backupService.ts
git commit -m "fix: backupService — replace new Function() dynamic import with direct import()"
```

---

## Task 6: Fix storage services — throw on not-found

**Files:**
- Modify: `src/services/chatHistoryStorage.ts`
- Modify: `src/services/collectionStorage.ts`
- Modify: `src/hooks/useChatHistory.ts` (update caller)
- Modify: `src/hooks/useCollections.ts` (update caller)

`updateChatHistory` and `updateCollection` silently return void when the record doesn't exist. Callers cannot distinguish success from not-found. Both should throw. Then we verify the callers handle the throw correctly (most calls already go through try/catch in the hooks).

- [ ] **Step 1: Fix `chatHistoryStorage.ts`**

In `src/services/chatHistoryStorage.ts`, replace:

```typescript
export async function updateChatHistory(id: string, patch: Partial<ChatHistory>): Promise<void> {
  const db = await getDb()
  const existing = await db.get('chat_histories', id)
  if (!existing) return
  await db.put('chat_histories', { ...existing, ...patch, updatedAt: Date.now() })
}
```

With:

```typescript
export async function updateChatHistory(id: string, patch: Partial<ChatHistory>): Promise<void> {
  const db = await getDb()
  const existing = await db.get('chat_histories', id)
  if (!existing) throw new Error(`Chat history not found: ${id}`)
  await db.put('chat_histories', { ...existing, ...patch, updatedAt: Date.now() })
}
```

- [ ] **Step 2: Fix `collectionStorage.ts`**

In `src/services/collectionStorage.ts`, replace:

```typescript
export async function updateCollection(id: string, patch: Partial<Collection>): Promise<void> {
  const db = await getDb()
  const existing = await db.get('collections', id)
  if (!existing) return
  await db.put('collections', { ...existing, ...patch })
}
```

With:

```typescript
export async function updateCollection(id: string, patch: Partial<Collection>): Promise<void> {
  const db = await getDb()
  const existing = await db.get('collections', id)
  if (!existing) throw new Error(`Collection not found: ${id}`)
  await db.put('collections', { ...existing, ...patch })
}
```

- [ ] **Step 3: Read and audit callers**

Read `src/hooks/useChatHistory.ts` and `src/hooks/useCollections.ts`. For every call site of `updateChatHistory` and `updateCollection`, confirm the call is wrapped in a try/catch. If not, add one.

Typical pattern to add where missing:

```typescript
// In useChatHistory.ts — renameHistory
const renameHistory = useCallback(async (id: string, title: string) => {
  try {
    await updateChatHistory(id, { title })
    setHistories((prev) => prev.map((h) => h.id === id ? { ...h, title } : h))
  } catch {
    // history may have been deleted concurrently — ignore
  }
}, [])
```

```typescript
// In useCollections.ts — rename
const rename = useCallback(async (id: string, name: string) => {
  try {
    await updateCollection(id, { name })
    setCollections((prev) => prev.map((c) => c.id === id ? { ...c, name } : c))
  } catch {
    // collection may have been deleted concurrently — ignore
  }
}, [])
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/services/chatHistoryStorage.ts src/services/collectionStorage.ts src/hooks/useChatHistory.ts src/hooks/useCollections.ts
git commit -m "fix: storage services — throw on not-found in update functions; guard callers"
```

---

## Task 7: Fix `chunkService.ts` — bounded parallel embedding

**Files:**
- Modify: `src/services/chunkService.ts`

The current `indexDocument` embeds chunks in a serial `for` loop. For a 50-chunk document at ~50 ms/embed, this takes ≥2.5 seconds. Replace with batches of 4 parallel embeds to reduce wall-clock time by ~4×.

- [ ] **Step 1: Replace `indexDocument` in `src/services/chunkService.ts`**

Replace the current `indexDocument` function:

```typescript
export async function indexDocument(
  docId: string,
  rawText: string,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  await deleteChunksByDocId(docId)

  const texts = chunkText(rawText)
  const chunks: DocumentChunk[] = []
  const BATCH = 4

  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH)
    const embeddings = await Promise.all(slice.map((t) => embed(t)))
    embeddings.forEach((embedding, j) => {
      const idx = i + j
      chunks.push({ id: `${docId}_c${idx}`, docId, chunkIndex: idx, text: slice[j], embedding })
      onProgress?.(idx + 1, texts.length)
    })
  }

  await saveChunks(chunks)
  return chunks.length
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/chunkService.ts
git commit -m "perf: chunkService — embed in parallel batches of 4 instead of serial loop"
```

---

## Task 8: Fix `useRag.ts` — add `isRunningRef` mutex to `chat()`

**Files:**
- Modify: `src/hooks/useRag.ts`

The current guard `if (streaming) return` uses React state, which is async. Two calls to `chat()` fired before React re-renders (e.g., double-submit) both see `streaming === false` and both proceed, corrupting message history. A `useRef`-based mutex prevents this.

- [ ] **Step 1: Add `isRunningRef` and use it in `chat()`**

At the top of the `useRag` hook body (near the other refs at lines 72–73), add:

```typescript
  const isRunningRef = useRef(false)
```

In the `chat` callback, replace the first line:

```typescript
  // Before:
  if (streaming) return

  // After:
  if (streaming || isRunningRef.current) return
  isRunningRef.current = true
```

And in the `finally` block at the end of the streaming try/catch (currently just `setStreaming(false)`), change to:

```typescript
    } finally {
      setStreaming(false)
      isRunningRef.current = false
    }
```

The complete `chat` callback signature and first few lines become:

```typescript
  const chat = useCallback(async (
    query: string,
    documents: ScannedDocument[],
    chunks: DocumentChunk[],
  ) => {
    if (streaming || isRunningRef.current) return
    isRunningRef.current = true
    setQueryError(null)
    // ... rest of function unchanged ...
    // In the streaming finally block:
    //   setStreaming(false)
    //   isRunningRef.current = false
```

Note: the `isRunningRef.current = false` reset must be in a `finally` that wraps the ENTIRE function body, not just the streaming section. Restructure if needed:

```typescript
  const chat = useCallback(async (
    query: string,
    documents: ScannedDocument[],
    chunks: DocumentChunk[],
  ) => {
    if (streaming || isRunningRef.current) return
    isRunningRef.current = true
    try {
      setQueryError(null)

      const selectedModel = LLM_MODELS.find((m) => m.id === selectedLlmId) ?? LLM_MODELS[1]
      const preset = getPreset(responseLength, selectedModel.contextWindow)

      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: query }
      updateMessages((prev) => [...prev, userMsg])

      let sources: ScannedDocument[] = []
      let excerpts = new Map<string, string>()
      let reranked = false
      try {
        const result = await retrieve(query, documents, chunks, preset.topK)
        sources  = result.sources
        excerpts = result.excerpts
        reranked = result.reranked
        setLastSources(sources)
      } catch (e) {
        setQueryError(e instanceof Error ? e.message : String(e))
        updateMessages((prev) => prev.slice(0, -1))
        return
      }

      const assistantId = crypto.randomUUID()

      if (llmStatus !== 'ready') {
        const content = sources.length > 0
          ? sources
              .map((d, i) => {
                const excerpt = excerpts.get(d.id) ?? d.rawText.slice(0, 300)
                return `**[${i + 1}] ${d.title}**\n> ${excerpt.slice(0, 300)}`
              })
              .join('\n\n')
          : 'No se encontraron documentos relevantes para tu consulta.'
        const noLlmMsg: ChatMessage = { id: assistantId, role: 'assistant', content, sources }
        const finalMsgsNoLlm = [...messagesRef.current, noLlmMsg]
        setMessages(finalMsgsNoLlm)
        messagesRef.current = finalMsgsNoLlm
        config?.onAfterChat?.(finalMsgsNoLlm)
        return
      }

      const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', sources }
      updateMessages((prev) => [...prev, assistantMsg])
      setStreaming(true)
      abortRef.current = false

      let accumulated = ''
      try {
        const systemPrompt = buildSystemPrompt(sources, excerpts, reranked, preset)
        const history = messagesRef.current
          .filter((m) => m.id !== assistantId)
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

        for await (const chunk of streamGenerate(systemPrompt, history, preset.maxTokens)) {
          if (abortRef.current) break
          accumulated += chunk
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m),
          )
        }
        messagesRef.current = messagesRef.current.map((m) =>
          m.id === assistantId ? { ...m, content: accumulated } : m,
        )
        config?.onAfterChat?.(messagesRef.current)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        updateMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: `⚠️ ${msg}` } : m),
        )
        setQueryError(msg)
      } finally {
        setStreaming(false)
      }
    } finally {
      isRunningRef.current = false
    }
  }, [streaming, retrieve, llmStatus, updateMessages, responseLength, selectedLlmId])
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useRag.ts
git commit -m "fix: useRag — add isRunningRef mutex to prevent concurrent chat() calls"
```

---

## Task 9: Fix `useDocuments.ts` — `remove()` cleans up chunks

**Files:**
- Modify: `src/hooks/useDocuments.ts`

`remove(docId)` deletes the document from IndexedDB and filters `documents` state, but never removes the associated chunks. Orphan chunk vectors pollute future RAG searches. Also need to add `deleteChunksByDocId` to the imports.

- [ ] **Step 1: Add import for `deleteChunksByDocId`**

In `src/hooks/useDocuments.ts`, extend the import from `documentStorage`:

```typescript
import {
  saveDocument,
  getAllDocuments,
  updateDocument,
  deleteDocument,
  getAllChunks,
  deleteChunksByDocId,
} from '@/services/documentStorage'
```

- [ ] **Step 2: Fix the `remove` callback**

Replace:

```typescript
  const remove = useCallback(async (id: string): Promise<void> => {
    await deleteDocument(id)
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }, [])
```

With:

```typescript
  const remove = useCallback(async (id: string): Promise<void> => {
    await deleteDocument(id)
    await deleteChunksByDocId(id)
    setDocuments((prev) => prev.filter((d) => d.id !== id))
    setChunks((prev) => prev.filter((c) => c.docId !== id))
  }, [])
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useDocuments.ts
git commit -m "fix: useDocuments — remove() now deletes chunks from IndexedDB and state"
```

---

## Task 10: Fix `usePinLock.ts` — add `initialized` flag

**Files:**
- Modify: `src/hooks/usePinLock.ts`

`isLocked` starts `false` (SSR-safe), then flips to `true` in `useEffect` after mount. This exposes one render frame of unprotected content. Add `initialized: false` that becomes `true` once the effect runs — consumers can gate rendering on it.

- [ ] **Step 1: Add `initialized` state to the hook**

In `src/hooks/usePinLock.ts`, add `initialized` to the state declarations:

```typescript
  const [isLocked, setIsLocked] = useState(false)
  const [hasPinSet, setHasPinSet] = useState(false)
  const [hasWebAuthn, setHasWebAuthn] = useState(false)
  const [initialized, setInitialized] = useState(false)
```

In the `useEffect`, add `setInitialized(true)` in a `finally` block:

```typescript
  useEffect(() => {
    try {
      const pinHash = localStorage.getItem(PIN_HASH_KEY)
      const credId = localStorage.getItem(WEBAUTHN_CRED_KEY)
      setHasPinSet(!!pinHash)
      setHasWebAuthn(!!credId && typeof window !== 'undefined' && !!window.PublicKeyCredential)
      if (pinHash) setIsLocked(true)
    } catch {
      // localStorage unavailable (private browsing)
    } finally {
      setInitialized(true)
    }
  }, [])
```

Add `initialized` to the return object:

```typescript
  return { isLocked, hasPinSet, hasWebAuthn, initialized, unlock, unlockWithBiometric, setPin, removePin, registerBiometric, resetAll }
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePinLock.ts
git commit -m "fix: usePinLock — add initialized flag to prevent flash of unprotected UI"
```

---

## Task 11: Fix `App.tsx` — dead guard, handleRemoveDoc, lock flash

**Files:**
- Modify: `src/components/App.tsx`

Three fixes:
1. `if (typeof refresh === 'function') refresh()` is always true — `refresh` is always a function. Remove the guard.
2. `handleRemoveDoc` manually calls `removeDocumentChunks(id)` and `refreshChunks()`, but `useDocuments.remove()` now handles both. Simplify.
3. Add `!pinLock.initialized` early-return to prevent flashing unprotected content.

- [ ] **Step 1: Fix early-return for lock initialization**

Find the lock guard at the top of the render (before `if (!onboardingDone)`):

```typescript
  if (pinLock.isLocked) {
    return (
      <LockScreen
```

Add an `initialized` guard before it:

```typescript
  if (!pinLock.initialized) return null

  if (pinLock.isLocked) {
    return (
      <LockScreen
```

- [ ] **Step 2: Simplify `handleRemoveDoc`**

Replace:

```typescript
  const handleRemoveDoc = useCallback(async (id: string) => {
    await removeDocumentChunks(id)
    await remove(id)
    await refreshChunks()
  }, [remove, refreshChunks])
```

With:

```typescript
  const handleRemoveDoc = useCallback(async (id: string) => {
    await remove(id)
  }, [remove])
```

- [ ] **Step 3: Remove unused imports**

Remove `removeDocumentChunks` from the chunkService import (it's no longer called from App.tsx). Change:

```typescript
import { indexDocument, removeDocumentChunks } from '@/services/chunkService'
```

To:

```typescript
import { indexDocument } from '@/services/chunkService'
```

Also remove `refreshChunks` from the `useDocuments` destructuring if it's no longer used elsewhere in the file. Check the file for any other usage of `refreshChunks` first — if `handleEmbedDoc` still calls it, keep it.

Looking at `handleEmbedDoc`:
```typescript
    async (doc: (typeof documents)[number]) => {
      await indexDocument(doc.id, doc.rawText)
      const summary = await summarizeDocument(doc.rawText, rag.selectedLlmId)
      await update(doc.id, { embedding: [1], ...(summary ? { summary } : {}) })
      await refreshChunks()
    },
```

`refreshChunks()` here re-fetches ALL chunks from IndexedDB after indexing. This is still needed because `indexDocument` writes chunks directly to IndexedDB without going through the `useDocuments` state. Keep `refreshChunks` in the destructuring.

- [ ] **Step 4: Fix the dead `typeof refresh` guard**

Find:

```typescript
          onImportComplete={() => {
            if (typeof refresh === 'function') refresh()
            else window.location.reload()
          }}
```

Replace with:

```typescript
          onImportComplete={refresh}
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/App.tsx
git commit -m "fix: App.tsx — remove dead refresh guard, simplify handleRemoveDoc, guard lock flash"
```

---

## Task 12: Fix `RagView.tsx` — await chat, fix embeddedCount

**Files:**
- Modify: `src/components/rag/RagView.tsx`

Two fixes:
1. `rag.chat(q, documents, chunks)` is unawaited — errors thrown before the first `await` inside `chat()` are silently discarded. Make `handleSubmit` async and await it.
2. `embeddedCount` uses `documents.filter(d => d.embedding !== null).length` — checks the dummy flag on the document, not actual chunk presence. Derive from `chunks` instead.

- [ ] **Step 1: Fix `embeddedCount`**

Find:

```typescript
  const embeddedCount = documents.filter((d) => d.embedding !== null).length
```

Replace with:

```typescript
  const embeddedCount = new Set(chunks.map((c) => c.docId)).size
```

- [ ] **Step 2: Await `rag.chat()`**

Find:

```typescript
  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    const q = input.trim()
    if (!q || rag.streaming) return
    setInput('')
    rag.chat(q, documents, chunks)
  }
```

Replace with:

```typescript
  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault()
    const q = input.trim()
    if (!q || rag.streaming) return
    setInput('')
    await rag.chat(q, documents, chunks)
  }
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/rag/RagView.tsx
git commit -m "fix: RagView — await rag.chat(), derive embeddedCount from chunks not documents"
```

---

## Final Verification

- [ ] **Full type check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Production build**

```bash
npm run build
```

Expected: clean build, no warnings about `new Function`, no type errors.

- [ ] **Push**

```bash
git push -u origin claude/local-ocr-webapp-NowwS
```

---

## Manual Tests

1. **Chunks cleaned on delete**: Add a document → index it → open DevTools → Application → IndexedDB → `chunks` store and note the chunk count → delete the document → confirm `chunks` store is empty for that docId.

2. **No double-submit**: Open RAG tab → type a question → press Enter twice quickly → confirm only one user message and one assistant message appear.

3. **Model status accuracy**: During onboarding, confirm each progress bar only shows "Listo ✓" AFTER the download fully completes (not while loading).

4. **Lock screen no flash**: Set a PIN → reload the app → confirm the unlocked content never appears before the lock screen (no single-frame flash).

5. **Indexing speed**: Index a document with >10 chunks → observe the progress bar increments arrive roughly 4 at a time (parallel batches) rather than one by one.
