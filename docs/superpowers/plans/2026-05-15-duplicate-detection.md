# Duplicate Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the user saves a new OCR result to the library, the app compares the new document's text embedding against existing document chunks. If cosine similarity ≥ 0.92 is found, a non-blocking warning toast appears listing the similar documents, letting the user decide whether to save anyway or discard.

**Architecture:** `findNearDuplicates(rawText, allChunks, allDocuments)` in a new `duplicateDetectionService.ts` calls `embed()` on the new text and computes cosine similarity against all chunk embeddings; groups results by document. Called from `handleSave` in `App.tsx` after `create()`. If duplicates found, shows a `DuplicateWarning` toast component with links to the similar docs. The embedder must be loaded — if not, detection is silently skipped. Operates on chunk-level embeddings because they are already indexed; no extra embedding needed at save time.

**Tech Stack:** TypeScript, React, Tailwind CSS v3, existing `embeddingService.ts` (`embed`, `cosineSimilarity`, `isEmbedderLoaded`)

---

## File Map

| File | Action |
|------|--------|
| `src/services/duplicateDetectionService.ts` | **Create** — `findNearDuplicates()` |
| `src/components/ui/DuplicateWarning.tsx` | **Create** — dismissible warning panel |
| `src/components/App.tsx` | Modify — call detection after save, pass handler to DocumentList |

---

### Task 1: duplicateDetectionService

**Files:**
- Create: `src/services/duplicateDetectionService.ts`

- [ ] **Step 1: Create the service**

```typescript
// src/services/duplicateDetectionService.ts
import type { ScannedDocument, DocumentChunk } from '@/types/document'
import { embed, cosineSimilarity, isEmbedderLoaded } from './embeddingService'

const SIMILARITY_THRESHOLD = 0.92

export interface DuplicateResult {
  doc: ScannedDocument
  maxSimilarity: number
}

/**
 * Embed rawText and find existing documents with chunk similarity >= SIMILARITY_THRESHOLD.
 * Returns at most 3 matches, sorted by descending similarity.
 * Returns [] if the embedder is not loaded or if no chunks exist yet.
 */
export async function findNearDuplicates(
  rawText: string,
  chunks: DocumentChunk[],
  documents: ScannedDocument[],
  excludeDocId?: string,
): Promise<DuplicateResult[]> {
  if (!isEmbedderLoaded() || chunks.length === 0) return []

  const queryVec = await embed(rawText.slice(0, 1000))

  // Find max similarity per document
  const bestByDoc = new Map<string, number>()
  for (const chunk of chunks) {
    if (chunk.docId === excludeDocId) continue
    const sim = cosineSimilarity(queryVec, chunk.embedding)
    if (sim >= SIMILARITY_THRESHOLD) {
      const prev = bestByDoc.get(chunk.docId) ?? 0
      if (sim > prev) bestByDoc.set(chunk.docId, sim)
    }
  }

  if (bestByDoc.size === 0) return []

  return [...bestByDoc.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([docId, maxSimilarity]) => {
      const doc = documents.find((d) => d.id === docId)
      return doc ? { doc, maxSimilarity } : null
    })
    .filter((r): r is DuplicateResult => r !== null)
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit service**

```bash
git add src/services/duplicateDetectionService.ts
git commit -m "feat: duplicateDetectionService — cosine similarity check against chunk embeddings"
```

---

### Task 2: DuplicateWarning component

**Files:**
- Create: `src/components/ui/DuplicateWarning.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/ui/DuplicateWarning.tsx
'use client'

import type { DuplicateResult } from '@/services/duplicateDetectionService'

interface Props {
  duplicates: DuplicateResult[]
  onOpenDoc: (id: string) => void
  onDismiss: () => void
}

export default function DuplicateWarning({ duplicates, onOpenDoc, onDismiss }: Props) {
  return (
    <div className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(420px,calc(100vw-2rem))] animate-fade-in">
      <div className="card border border-yellow-400/25 bg-yellow-400/5 shadow-lg">
        <div className="flex items-start gap-3 p-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400 flex-shrink-0 mt-0.5" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-ink">Posible duplicado</p>
            <p className="text-xs text-dim mt-0.5">Este documento es muy similar a:</p>
            <ul className="mt-2 space-y-1">
              {duplicates.map(({ doc, maxSimilarity }) => (
                <li key={doc.id} className="flex items-center gap-2">
                  <button
                    onClick={() => { onDismiss(); onOpenDoc(doc.id) }}
                    className="text-xs text-accent hover:underline truncate flex-1 text-left"
                  >
                    {doc.title}
                  </button>
                  <span className="text-xs font-mono text-dim/60 flex-shrink-0">
                    {Math.round(maxSimilarity * 100)}% similar
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={onDismiss}
            className="text-dim/40 hover:text-dim transition-colors flex-shrink-0"
            aria-label="Cerrar advertencia"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit component**

```bash
git add src/components/ui/DuplicateWarning.tsx
git commit -m "feat: DuplicateWarning — dismissible panel listing similar existing documents"
```

---

### Task 3: Wire detection into App.tsx

**Files:**
- Modify: `src/components/App.tsx`

- [ ] **Step 1: Add imports and state**

In `src/components/App.tsx`, add imports:

```typescript
import { findNearDuplicates } from '@/services/duplicateDetectionService'
import type { DuplicateResult } from '@/services/duplicateDetectionService'
import DuplicateWarning from '@/components/ui/DuplicateWarning'
```

Add state near the top of the `App` component (after `const [saving, setSaving]`):

```typescript
const [duplicateWarning, setDuplicateWarning] = useState<DuplicateResult[]>([])
```

- [ ] **Step 2: Check for duplicates after save**

Update `handleSave` in `App.tsx`. After the `create(...)` call, add duplicate detection:

```typescript
const handleSave = useCallback(async () => {
  if (!imageLoader.dataUrl || !ocr.result) return
  setSaving(true)
  try {
    const firstLine = ocr.result.text.split('\n').find((l) => l.trim()) ?? 'Sin título'
    const category = classifyDocument(ocr.result.text)
    const doc = await create({
      title: firstLine.slice(0, 80),
      imageDataUrl: imageLoader.adjustedDataUrl ?? imageLoader.dataUrl,
      rawText: ocr.result.text,
      richText: '',
      engineId: selectedId,
      confidence: ocr.result.confidence,
      category,
    })

    // Check for near-duplicates against existing indexed chunks (excluding the just-saved doc)
    const dupes = await findNearDuplicates(ocr.result.text, chunks, documents, doc.id)
    if (dupes.length > 0) setDuplicateWarning(dupes)

    setSelectedDocId(doc.id)
    handleTabChange('documents')
  } finally {
    setSaving(false)
  }
}, [imageLoader.adjustedDataUrl, imageLoader.dataUrl, ocr.result, create, selectedId, handleTabChange, chunks, documents])
```

Note: if `adjustedDataUrl` doesn't exist yet (image-preprocessing plan not implemented), use `imageLoader.dataUrl` directly.

- [ ] **Step 3: Render the warning**

In the JSX of `App.tsx`, just before the closing `</div>` of the main return, add:

```tsx
{duplicateWarning.length > 0 && (
  <DuplicateWarning
    duplicates={duplicateWarning}
    onOpenDoc={(id) => { setSelectedDocId(id); handleTabChange('documents') }}
    onDismiss={() => setDuplicateWarning([])}
  />
)}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual test**

1. Index at least one document (click "Index for RAG") so chunks exist
2. Scan/upload the exact same image again and run OCR
3. Click "Guardar en biblioteca"
4. The DuplicateWarning panel should appear at the bottom
5. Click the document title link — navigates to the existing document
6. Dismiss the warning — it disappears

- [ ] **Step 6: Commit and push**

```bash
git add src/components/App.tsx
git commit -m "feat: duplicate detection on save — warns when similar indexed doc found"
git push -u origin claude/local-ocr-webapp-NowwS
```
