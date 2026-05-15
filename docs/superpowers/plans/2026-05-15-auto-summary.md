# Auto-Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the user clicks "Index for RAG" on a document, the app also generates a 2-3 sentence LLM summary and stores it in `doc.summary`. The summary appears in the library card instead of the raw OCR text snippet.

**Architecture:** `summarizeDocument(rawText, modelId)` in a new `summaryService.ts` streams from the existing WebLLM `streamGenerate`. `handleEmbedDoc` in `App.tsx` calls it after `indexDocument`. `DocumentCard` renders `doc.summary` (when present) instead of `rawText.slice(0, 120)`. The `summary` field is already added to `ScannedDocument` type in the expiry-dates plan (if running independently, add it here). LLM must be loaded — if not, summarization is silently skipped.

**Tech Stack:** TypeScript, React, WebLLM (`streamGenerate`), Tailwind CSS v3

---

## File Map

| File | Action |
|------|--------|
| `src/types/document.ts` | Modify — add `summary?: string \| null` (if not already added) |
| `src/services/summaryService.ts` | **Create** — `summarizeDocument()` |
| `src/components/App.tsx` | Modify — call `summarizeDocument` inside `handleEmbedDoc` |
| `src/components/documents/DocumentCard.tsx` | Modify — show `doc.summary` when present |

---

### Task 1: Add `summary` field to type

**Files:**
- Modify: `src/types/document.ts`

- [ ] **Step 1: Check if summary already exists**

```bash
grep -n "summary" /home/user/transformerjs-demo/src/types/document.ts
```

If it already exists, skip to Task 2.

- [ ] **Step 2: Add field**

In `src/types/document.ts`, add inside `ScannedDocument` after `extractedData`:

```typescript
  summary?: string | null            // LLM-generated 2-3 sentence summary
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/document.ts
git commit -m "feat: add summary field to ScannedDocument type"
```

---

### Task 2: summaryService.ts

**Files:**
- Create: `src/services/summaryService.ts`

- [ ] **Step 1: Create the service**

```typescript
// src/services/summaryService.ts
import { streamGenerate, isLlmLoaded } from './llmService'

const SYSTEM_PROMPT = `You are a document summarizer. Given the OCR text of a scanned document, write a concise summary of 2-3 sentences in the SAME LANGUAGE as the document. Cover: what kind of document it is, who are the main parties or subjects, and the most important fact or figure. Be factual — do not add information not present in the text.`

export async function summarizeDocument(
  rawText: string,
  modelId: string,
): Promise<string> {
  if (!isLlmLoaded(modelId)) return ''

  // Limit input to 2000 chars to stay within context and be fast
  const input = rawText.slice(0, 2000)

  let result = ''
  for await (const chunk of streamGenerate(
    SYSTEM_PROMPT,
    [{ role: 'user', content: input }],
    120,
  )) {
    result += chunk
  }
  return result.trim()
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit service**

```bash
git add src/services/summaryService.ts
git commit -m "feat: summaryService — stream 2-3 sentence LLM summary for a document"
```

---

### Task 3: Call summarization in App.tsx after indexing

**Files:**
- Modify: `src/components/App.tsx`

- [ ] **Step 1: Import summarizeDocument**

At the top of `src/components/App.tsx`, add the import:

```typescript
import { summarizeDocument } from '@/services/summaryService'
```

- [ ] **Step 2: Update handleEmbedDoc**

Find `handleEmbedDoc` in `App.tsx`. It currently looks like:

```typescript
const handleEmbedDoc = useCallback(
  async (doc: (typeof documents)[number]) => {
    await indexDocument(doc.id, doc.rawText)
    await update(doc.id, { embedding: [1] })
    await refreshChunks()
  },
  [update, refreshChunks],
)
```

Replace it with:

```typescript
const handleEmbedDoc = useCallback(
  async (doc: (typeof documents)[number]) => {
    await indexDocument(doc.id, doc.rawText)
    const summary = await summarizeDocument(doc.rawText, rag.selectedLlmId)
    await update(doc.id, { embedding: [1], ...(summary ? { summary } : {}) })
    await refreshChunks()
  },
  [update, refreshChunks, rag.selectedLlmId],
)
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit App.tsx**

```bash
git add src/components/App.tsx
git commit -m "feat: generate LLM summary when indexing a document"
```

---

### Task 4: Display summary in DocumentCard

**Files:**
- Modify: `src/components/documents/DocumentCard.tsx`

- [ ] **Step 1: Replace rawText snippet with summary when available**

In `DocumentCard.tsx`, find this line:

```tsx
<p className="text-xs text-dim mt-1.5 line-clamp-2 leading-relaxed">{doc.rawText.slice(0, 120)}</p>
```

Replace it with:

```tsx
<p className="text-xs text-dim mt-1.5 line-clamp-2 leading-relaxed">
  {doc.summary ?? doc.rawText.slice(0, 120)}
</p>
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual test**

1. Start dev server: `npm run dev`
2. Open Models tab, load the LLM model (Llama 3.2 1B or Qwen)
3. Open a document in the Library, click "Index for RAG"
4. After indexing completes, navigate back to the Library
5. The card for that document should show the summary text instead of raw OCR snippets

- [ ] **Step 4: Commit and push**

```bash
git add src/components/documents/DocumentCard.tsx
git commit -m "feat: show LLM summary in DocumentCard when available"
git push -u origin claude/local-ocr-webapp-NowwS
```
