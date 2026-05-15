# Models Tab Reorganization — Design Spec

**Date:** 2026-05-15
**Status:** Approved

## Problem

RAG model cards (bi-encoder, reranker, LLM) live in the RAG tab sidebar, cluttering the chat experience. The OCR engine dropdown shows all engines regardless of load status, confusing users who haven't loaded any engine yet.

## Goal

- Consolidate ALL model loading (OCR + AI) into the Models tab
- Make the RAG tab purely a chat interface
- Show only ready engines in the OCR dropdown

---

## Design

### 1. Models Tab — Two-section layout

New component: `src/components/models/ModelsView.tsx`

Replaces `<EngineGrid>` as the content of the `engines` tab panel in `App.tsx`.

**Section A — "Motores OCR"**
The existing `EngineGrid` component, unchanged.

**Section B — "Modelos de IA"**
The three `ModelRow` cards currently in the RAG tab sidebar:
- Bi-encoder (all-MiniLM-L6-v2, ~23 MB)
- Cross-encoder reranker (ms-marco-MiniLM-L-6-v2, ~22 MB)
- Language Model (Qwen / Llama / Phi, selectable)

Plus the `ResponseLengthPicker` (logically a model setting, lives here).

Props passed from `App.tsx` via `useRag()`: `embedStatus`, `embedProgress`, `embedError`, `loadEmbedModel`, `rerankerStatus`, `rerankerProgress`, `rerankerError`, `loadReranker`, `llmStatus`, `llmProgress`, `llmProgressText`, `llmError`, `loadLlm`, `selectedLlmId`, `setSelectedLlmId`, `webGpuAvailable`, `responseLength`, `setResponseLength`.

Engine grid props unchanged: `engineStates`, `selectedId`, `onLoad`, `onRetry`, `onSelect`.

---

### 2. RAG Tab — Chat only

`src/components/rag/RagView.tsx` — remove the `<aside>` sidebar entirely. Single-column layout.

**New prop:** `onNavigateToModels: () => void`

**Layout (top to bottom):**

1. **Model status banner** (conditional):
   - LLM not ready → info banner: "Para generar respuestas, carga un modelo en la sección Modelos." + ghost button "Ir a Modelos →" (calls `onNavigateToModels`)
   - LLM ready → small status chip: `● [model label] · Listo` (teal dot, dim text)

2. **Document index row** — compact flex row: "X / Y docs · Z fragmentos" + "Index all" button

3. **Chat card** — full width, taller `max-h` now that sidebar is gone (e.g. `max-h-[560px]`)

**In `App.tsx`:**
```tsx
<RagView
  documents={documents}
  chunks={chunks}
  rag={rag}
  onEmbedDoc={handleEmbedDoc}
  onEmbedAll={handleEmbedAll}
  onNavigateToModels={() => setTab('engines')}
/>
```

---

### 3. OCR EngineSelector — Ready engines only

`src/components/ocr/EngineSelector.tsx`

Filter `ENGINES` to only those where `engineStates[e.id]?.status === 'ready'`.

If none are ready: hide the `<select>` and show a dim message:
```
Carga un motor en la sección Modelos primero.
```

If the currently `selectedId` is not in the ready list, the selector has no pre-selected value — no crash, just an empty/uncontrolled state until the user loads an engine.

---

## Files Changed

| File | Action |
|------|--------|
| `src/components/models/ModelsView.tsx` | New — combines EngineGrid + AI model cards |
| `src/components/rag/RagView.tsx` | Remove sidebar, add banner + model chip |
| `src/components/ocr/EngineSelector.tsx` | Filter to ready engines only |
| `src/components/App.tsx` | Use ModelsView, pass onNavigateToModels |

## Non-goals

- No changes to how models are loaded or state is managed
- No changes to the RAG retrieval pipeline
- No changes to tab count or tab labels
