# Archivo PWA — Codebase Refactor Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all runtime bugs, unify AI service patterns, tighten state management, and remove dead code — without changing any visual design.

**Architecture:** Four independent layers (services → hooks → App → components) are refactored from the bottom up so each change is independently verifiable. No new dependencies added.

**Tech Stack:** Next.js 15 App Router, TypeScript strict mode, IndexedDB via `idb`, `@huggingface/transformers`, `@mlc-ai/web-llm`, `@serwist/next`.

---

## Section 1 — AI Service Layer: Unified State Pattern

**Files:** `rerankService.ts`, `llmService.ts`, `whisperService.ts`, `embeddingService.ts`

**Problem:** Each service uses a different mechanism to report "is loaded":
- `embeddingService`: correct — uses `_isReady` flag
- `rerankService`: wrong — `isRerankerLoaded()` returns `_rerankerPromise !== null`, which is `true` while the promise is still pending
- `llmService`: uses `_loadedModelId !== null` which is set before the engine is usable
- `whisperService`: has `_isReady` but the catch handler doesn't reset it

**Required pattern** (apply to all four):
```ts
let _promise: Promise<Model> | null = null
let _isReady = false

export function isXLoaded(): boolean { return _isReady }

export async function getX(onProgress?): Promise<Model> {
  if (!_promise) {
    _promise = (async () => {
      const m = await loadModel(onProgress)
      _isReady = true
      return m
    })()
    _promise.catch(() => { _promise = null; _isReady = false })
  }
  return _promise
}
```

**Specific changes:**
- `rerankService.ts`: add `_isReady` flag; `isRerankerLoaded()` returns `_isReady`; catch handler resets both `_rerankerPromise = null` and `_isReady = false`
- `llmService.ts`: align `isLlmLoaded(modelId)` to check both `_isReady && _loadedModelId === modelId`; add `_isReady` flag; catch handler resets both
- `whisperService.ts`: verify catch handler sets `_isReady = false` (currently only resets `_pipelinePromise`)
- `embeddingService.ts`: verify catch handler sets both — already mostly correct, just confirm

---

## Section 2 — Critical Bug Fixes

### 2a. `useBatchOcr.ts` — `removeItem()` inverted logic
**Bug:** `items.filter(item => item.id !== id || item.status !== 'pending')` — the OR means: keep item if it has a different id OR if it's not pending. This never removes the target item when it IS pending (which is always the case since we only remove before processing).

**Fix:** `items.filter(item => item.id !== id)` — simply filter by id. The status check was semantically wrong.

### 2b. `useBatchOcr.ts` — FileReader never rejects
**Bug:** `reader.onerror` is not handled. If the FileReader fails, the returned Promise never settles → UI hangs with a spinner forever.

**Fix:** Add `reader.onerror = () => reject(new Error('No se pudo leer el archivo'))` inside the Promise constructor.

### 2c. `usePinLock.ts` — Wrong API call
**Bug:** `localStorage.deleteDatabase('local-ocr-v1')` — `localStorage` has no `deleteDatabase` method. This silently fails (no error thrown because the property is `undefined`), so the wipe-data feature doesn't actually clear the database.

**Fix:** Replace with `await indexedDB.deleteDatabase('local-ocr-v1')`.

### 2d. `embeddingService.ts` — stale `_isReady` on error retry
**Bug:** If `getExtractor()` rejects, the catch handler sets `_extractorPromise = null` but does not guarantee `_isReady` is `false`. If `_isReady` was ever set `true` by a previous successful load and then somehow the reference was reset, it could be stale.

**Fix:** Catch handler explicitly sets `_isReady = false` (defensive — it should already be false, but make it explicit).

### 2e. `extractionService.ts` — fragile JSON regex
**Bug:** `fullResponse.match(/\{[\s\S]*\}/)` greedily matches from first `{` to last `}`. If the LLM wraps JSON in a markdown code fence (e.g. ` ```json\n{...}\n``` `), the regex captures backticks and fails to parse. Also breaks if the response has multiple JSON objects.

**Fix:**
```ts
function parseJsonFromLlm(response: string): unknown {
  // Strip markdown code fences
  const stripped = response.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim()
  // Try direct parse first
  try { return JSON.parse(stripped) } catch { /* fall through */ }
  // Try extracting first {...} block
  const match = stripped.match(/\{[\s\S]*\}/)
  if (match) return JSON.parse(match[0])
  throw new Error('No JSON found in LLM response')
}
```

### 2f. `backupService.ts` — `new Function()` for dynamic import
**Bug:** `const dynamicImport = new Function('specifier', 'return import(specifier)')` bypasses the module bundler, breaks in strict CSP environments, and is flagged as a security risk by static analyzers.

**Fix:** Replace with a direct top-level `import()` call or a conditional static import. Since this is for xlsx/docx export which are already imported elsewhere in the codebase, use a direct `await import('xlsx')` etc.

---

## Section 3 — State Management, Races, Dead Code

### 3a. `useRag.ts` — chat() race condition
**Bug:** `chat()` is an async function with no mutex. If called twice concurrently (e.g., user submits quickly twice), both calls race to append messages and call the LLM, producing duplicate or interleaved messages.

**Fix:** Add an `isRunning` ref at the top of `useRag`:
```ts
const isRunning = useRef(false)

const chat = useCallback(async (...) => {
  if (isRunning.current) return
  isRunning.current = true
  try {
    // ... existing logic
  } finally {
    isRunning.current = false
  }
}, [...])
```

### 3b. `useDocuments.ts` — orphan chunks on document delete
**Bug:** `remove(docId)` deletes the document from IndexedDB and from `documents` state, but never calls `deleteChunksByDocId(docId)` and never filters the `chunks` state. Orphan chunk vectors pollute future RAG searches.

**Fix:** In `remove()`:
```ts
const remove = useCallback(async (id: string) => {
  await deleteDocument(id)
  await deleteChunksByDocId(id)           // NEW
  setDocuments(prev => prev.filter(d => d.id !== id))
  setChunks(prev => prev.filter(c => c.docId !== id))  // NEW
}, [])
```

### 3c. `App.tsx` — dead `typeof refresh` guard
**Bug:** `if (typeof refresh === 'function') refresh()` — `refresh` is always a function (guaranteed by `useDocuments` return type). The else branch is unreachable dead code.

**Fix:** Replace with `refresh()` directly.

### 3d. `useRag.ts` — `embedDoc` defined but never returned
**Bug:** `embedDoc` is defined inside the hook but missing from the `return` object. Callers that need to trigger reindex from RAG view can't access it.

**Fix:** Add `embedDoc` to the return object. If it's genuinely unused by any consumer, delete it instead (verify first via grep).

### 3e. `chunkService.ts` — serial embedding loop
**Bug:** `for (let i = 0; i < texts.length; i++) { const embedding = await embed(texts[i]) }` — fully serial. For a 50-chunk document with 50ms per embed, this takes 2.5 seconds minimum.

**Fix:** Bounded parallel batches of 4:
```ts
const BATCH = 4
const chunks: DocumentChunk[] = []
for (let i = 0; i < texts.length; i += BATCH) {
  const slice = texts.slice(i, i + BATCH)
  const embeddings = await Promise.all(slice.map(t => embed(t)))
  embeddings.forEach((embedding, j) => {
    chunks.push({ id: `${docId}_c${i + j}`, docId, chunkIndex: i + j, text: slice[j], embedding })
    onProgress?.(i + j + 1, texts.length)
  })
}
await saveChunks(chunks)
```

---

## Section 4 — Error Handling & Component Bugs

### 4a. Storage services — silent not-found
**Bug:** `chatHistoryStorage.updateChatHistory()` and `collectionStorage.updateCollection()` silently return `void` when the record doesn't exist. Callers cannot distinguish success from not-found.

**Fix:** Both should `throw new Error(\`[entity] not found: \${id}\`)` when the record is missing. Update callers that need to handle this gracefully with try/catch.

### 4b. `RagView.tsx` — unawaited `rag.chat()`
**Bug:** `rag.chat(...)` is called without `await`. Errors thrown inside `chat()` are silently swallowed until `queryError` state is updated on the next render.

**Fix:** `await rag.chat(...)` wrapped in a local try/catch to ensure errors surface immediately.

### 4c. `RagView.tsx` — null check for `loadHistory`
**Bug:** `rag.loadMessages(chatHistory.loadHistory(activeId))` — if `loadHistory` returns `null` or `undefined` (history not found), `loadMessages` receives a bad value and can corrupt message state.

**Fix:** `rag.loadMessages(chatHistory.loadHistory(activeId) ?? [])`.

### 4d. `RagView.tsx` — stale `embeddedCount`
**Bug:** `embeddedCount` is computed as `documents.filter(d => d.embedding !== null).length` but this checks the document-level dummy flag, not actual chunk presence. A document might have a non-null embedding flag but zero chunks (e.g., indexing failed partway).

**Fix:** Derive from `chunks` state: `new Set(chunks.map(c => c.docId)).size`. This accurately counts documents that have at least one indexed chunk.

### 4e. `usePinLock.ts` — flash of unprotected UI
**Bug:** `isLocked` is initialized to `false` (SSR-safe), then set to `true` in `useEffect` after mount. This causes one render frame where protected content is visible.

**Fix:** Add an `initialized` boolean state (false on mount, true after effect runs). `LockScreen` only renders the locked/unlocked content after `initialized` is true — shows nothing (or a loading spinner) on the first frame.

---

## Files Modified

| File | Change |
|------|--------|
| `src/services/rerankService.ts` | Add `_isReady` flag, fix `isRerankerLoaded()` |
| `src/services/llmService.ts` | Add `_isReady` flag, fix `isLlmLoaded()` |
| `src/services/whisperService.ts` | Verify/fix catch handler resets `_isReady` |
| `src/services/embeddingService.ts` | Make catch handler explicit about `_isReady = false` |
| `src/services/extractionService.ts` | Replace fragile regex JSON parse with robust `parseJsonFromLlm()` |
| `src/services/backupService.ts` | Replace `new Function()` with direct `import()` |
| `src/services/chatHistoryStorage.ts` | Throw on not-found in `updateChatHistory()` |
| `src/services/collectionStorage.ts` | Throw on not-found in `updateCollection()` |
| `src/hooks/useBatchOcr.ts` | Fix `removeItem` logic; add FileReader error handling; guard `result.text` |
| `src/hooks/usePinLock.ts` | Fix `indexedDB.deleteDatabase`; add `initialized` flag |
| `src/hooks/useRag.ts` | Add `isRunning` mutex; return `embedDoc` or delete it |
| `src/hooks/useDocuments.ts` | `remove()` also deletes chunks from DB and state |
| `src/components/App.tsx` | Remove `typeof refresh` guard |
| `src/components/rag/RagView.tsx` | Await chat(); null-guard loadHistory; fix embeddedCount |
| `src/services/chunkService.ts` | Bounded parallel embedding (batch of 4) |

---

## Verification

After each task:
```bash
npx tsc --noEmit   # must produce 0 errors
```

After all tasks:
```bash
npm run build      # clean build
git push -u origin claude/local-ocr-webapp-NowwS
```

Manual tests:
1. Delete a document → confirm chunks also disappear from RAG search
2. Submit the same chat message twice quickly → confirm single response (mutex works)
3. Wipe data in settings → confirm IndexedDB is actually deleted (check DevTools)
4. Index a 10-page PDF → confirm progress bar moves in chunks (parallel embedding)
5. All 4 model indicators show "Listo ✓" only after actual readiness, not during loading
