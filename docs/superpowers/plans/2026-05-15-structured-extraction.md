# Structured Data Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users define a custom extraction schema (fields with name, type, description) per document, then use the local LLM to extract those values from the document text. Results shown as an editable table in DocumentEditor; aggregated in a Dashboard section.

**Architecture:** `ExtractionField` and two new fields (`extractionSchema`, `extractedData`) are added to `ScannedDocument`. `extractionService.ts` builds the LLM prompt and parses the JSON response. `SchemaEditor` manages field definitions. `ExtractionTable` renders the results. Both are integrated into a new "Datos estructurados" section in `DocumentEditor`. The Dashboard gains a "Datos clave" card.

**Tech Stack:** Next.js 15, TypeScript, `streamGenerate` from `src/services/llmService.ts`

---

### Task 1: Add types to `document.ts`

**Files:**
- Modify: `src/types/document.ts`

- [ ] **Step 1: Add `ExtractionField` interface and fields to `ScannedDocument`**

In `src/types/document.ts`:

```typescript
export interface ExtractionField {
  key: string          // snake_case identifier, auto-generated from label
  label: string        // human-readable name
  type: 'text' | 'number'
  description: string  // instruction for the LLM
}
```

Add to `ScannedDocument`:
```typescript
extractionSchema?: ExtractionField[] | null
extractedData?: Record<string, string> | null
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/document.ts
git commit -m "feat: add ExtractionField type and extractionSchema/extractedData to ScannedDocument"
```

---

### Task 2: `extractionService.ts`

**Files:**
- Create: `src/services/extractionService.ts`

**Context:** Uses `streamGenerate` from `llmService.ts`. Builds a structured prompt asking the LLM to respond with JSON only. Collects the full stream into a string, then parses. Throws if LLM not loaded or if JSON parse fails.

- [ ] **Step 1: Create `extractionService.ts`**

```typescript
// src/services/extractionService.ts
import { streamGenerate, isLlmLoaded } from './llmService'
import type { ExtractionField } from '@/types/document'

export async function extractStructuredData(
  rawText: string,
  schema: ExtractionField[],
  modelId: string,
): Promise<Record<string, string>> {
  if (!isLlmLoaded(modelId)) {
    throw new Error('LLM not loaded — load a language model in the Models tab first.')
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

  // Extract JSON from response (handle potential wrapping)
  const jsonMatch = fullResponse.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('El modelo no devolvió un JSON válido. Inténtalo de nuevo.')
  }

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>

  // Normalize: all values to string
  const result: Record<string, string> = {}
  for (const field of schema) {
    result[field.key] = String(parsed[field.key] ?? '')
  }
  return result
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/extractionService.ts
git commit -m "feat: extractionService — LLM structured extraction with JSON schema prompt"
```

---

### Task 3: `SchemaEditor` component

**Files:**
- Create: `src/components/documents/SchemaEditor.tsx`

**Context:** A table-like editor where each row is an `ExtractionField`. Users can add/edit/remove fields. The `key` is auto-generated as a slug of the label. Max 15 fields.

- [ ] **Step 1: Create `SchemaEditor.tsx`**

```tsx
// src/components/documents/SchemaEditor.tsx
'use client'

import { useState } from 'react'
import type { ExtractionField } from '@/types/document'

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 30) || 'campo'
}

interface Props {
  schema: ExtractionField[]
  onChange: (schema: ExtractionField[]) => void
}

const EMPTY_FIELD = (): Omit<ExtractionField, 'key'> => ({ label: '', type: 'text', description: '' })

export default function SchemaEditor({ schema, onChange }: Props) {
  const [draft, setDraft] = useState<Omit<ExtractionField, 'key'>>(EMPTY_FIELD())

  const updateField = (index: number, patch: Partial<ExtractionField>) => {
    const next = schema.map((f, i) => {
      if (i !== index) return f
      const updated = { ...f, ...patch }
      // Re-generate key if label changed
      if (patch.label !== undefined) updated.key = slugify(patch.label)
      return updated
    })
    onChange(next)
  }

  const removeField = (index: number) => onChange(schema.filter((_, i) => i !== index))

  const addField = () => {
    if (!draft.label.trim() || schema.length >= 15) return
    const newField: ExtractionField = { ...draft, key: slugify(draft.label), label: draft.label.trim() }
    onChange([...schema, newField])
    setDraft(EMPTY_FIELD())
  }

  return (
    <div className="space-y-3">
      {/* Existing fields */}
      {schema.length > 0 && (
        <div className="space-y-2">
          {schema.map((field, i) => (
            <div key={field.key + i} className="flex gap-2 items-start">
              <input
                value={field.label}
                onChange={(e) => updateField(i, { label: e.target.value })}
                placeholder="Nombre"
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-white/10 bg-surface/60 text-xs text-ink placeholder:text-dim/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
              />
              <select
                value={field.type}
                onChange={(e) => updateField(i, { type: e.target.value as 'text' | 'number' })}
                className="px-2 py-1.5 rounded-lg border border-white/10 bg-surface/60 text-xs text-ink focus:outline-none"
              >
                <option value="text">Texto</option>
                <option value="number">Número</option>
              </select>
              <input
                value={field.description}
                onChange={(e) => updateField(i, { description: e.target.value })}
                placeholder="Descripción / reglas para el LLM"
                className="flex-[2] min-w-0 px-2.5 py-1.5 rounded-lg border border-white/10 bg-surface/60 text-xs text-ink placeholder:text-dim/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
              />
              <button
                type="button"
                onClick={() => removeField(i)}
                className="px-1.5 py-1.5 text-dim/60 hover:text-err transition-colors flex-shrink-0"
                aria-label={`Eliminar campo ${field.label}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* New field row */}
      {schema.length < 15 && (
        <div className="flex gap-2 items-start">
          <input
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addField() } }}
            placeholder="Nombre del campo"
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-dashed border-white/15 bg-transparent text-xs text-ink placeholder:text-dim/40 focus:outline-none focus:border-accent/40"
          />
          <select
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: e.target.value as 'text' | 'number' })}
            className="px-2 py-1.5 rounded-lg border border-white/10 bg-surface/60 text-xs text-ink focus:outline-none"
          >
            <option value="text">Texto</option>
            <option value="number">Número</option>
          </select>
          <input
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addField() } }}
            placeholder="Descripción / reglas"
            className="flex-[2] min-w-0 px-2.5 py-1.5 rounded-lg border border-dashed border-white/15 bg-transparent text-xs text-ink placeholder:text-dim/40 focus:outline-none focus:border-accent/40"
          />
          <button
            type="button"
            onClick={addField}
            disabled={!draft.label.trim()}
            className="px-2 py-1.5 text-xs rounded-lg border border-white/10 text-dim hover:text-ink hover:bg-white/5 transition-colors disabled:opacity-40 flex-shrink-0"
          >
            + Añadir
          </button>
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
git add src/components/documents/SchemaEditor.tsx
git commit -m "feat: SchemaEditor — inline field definition table for extraction schema"
```

---

### Task 4: `ExtractionTable` component

**Files:**
- Create: `src/components/documents/ExtractionTable.tsx`

**Context:** Renders the extracted data as a two-column table (label | value). Values are editable inline. Numbers are right-aligned.

- [ ] **Step 1: Create `ExtractionTable.tsx`**

```tsx
// src/components/documents/ExtractionTable.tsx
'use client'

import type { ExtractionField } from '@/types/document'

interface Props {
  schema: ExtractionField[]
  data: Record<string, string>
  onChange: (data: Record<string, string>) => void
}

export default function ExtractionTable({ schema, data, onChange }: Props) {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <table className="w-full text-xs">
        <tbody>
          {schema.map((field) => (
            <tr key={field.key} className="border-b border-white/7 last:border-0">
              <td className="px-3 py-2 text-dim/80 font-medium w-2/5 align-middle">{field.label}</td>
              <td className="px-3 py-2 align-middle">
                <input
                  value={data[field.key] ?? ''}
                  onChange={(e) => onChange({ ...data, [field.key]: e.target.value })}
                  className={`w-full bg-transparent text-ink focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 rounded ${
                    field.type === 'number' ? 'text-right font-mono' : ''
                  }`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
git add src/components/documents/ExtractionTable.tsx
git commit -m "feat: ExtractionTable — editable table for extracted structured data"
```

---

### Task 5: Integrate extraction section into `DocumentEditor`

**Files:**
- Modify: `src/components/documents/DocumentEditor.tsx`

**Context:** Add a "Datos estructurados" section below the tags section (or below the title area). It has three states: no schema, schema but no data, data present. The section manages its own `editingSchema` local state to show/hide `SchemaEditor`.

- [ ] **Step 1: Update `DocumentEditor.tsx`**

Add imports:
```tsx
import SchemaEditor from './SchemaEditor'
import ExtractionTable from './ExtractionTable'
import { extractStructuredData } from '@/services/extractionService'
import type { ExtractionField } from '@/types/document'
```

Update `Props` interface — add `llmModelId` and `llmReady`:
```tsx
interface Props {
  doc: ScannedDocument
  ragModelReady: boolean
  allTags: string[]
  llmModelId: string        // ← new: needed by extractionService
  llmReady: boolean         // ← new: rag.llmStatus === 'ready'
  onUpdate: (id: string, patch: Partial<ScannedDocument>) => Promise<void>
  onEmbed: (doc: ScannedDocument) => Promise<void>
  onBack: () => void
  onDelete: (id: string) => Promise<void>
}
```

Add state inside component:
```tsx
const [editingSchema, setEditingSchema] = useState(false)
const [extracting, setExtracting] = useState(false)
const [extractionError, setExtractionError] = useState<string | null>(null)
const [localSchema, setLocalSchema] = useState<ExtractionField[]>(doc.extractionSchema ?? [])
const [localData, setLocalData] = useState<Record<string, string>>(doc.extractedData ?? {})
```

Add handlers:
```tsx
const handleSaveSchema = async (schema: ExtractionField[]) => {
  setLocalSchema(schema)
  setEditingSchema(false)
  await onUpdate(doc.id, { extractionSchema: schema })
}

const handleExtract = async () => {
  setExtracting(true)
  setExtractionError(null)
  try {
    const data = await extractStructuredData(doc.rawText, localSchema, llmModelId)
    setLocalData(data)
    await onUpdate(doc.id, { extractedData: data })
  } catch (err) {
    setExtractionError(String(err).replace('Error: ', ''))
  } finally {
    setExtracting(false)
  }
}

const handleDataChange = async (data: Record<string, string>) => {
  setLocalData(data)
  await onUpdate(doc.id, { extractedData: data })
}
```

Add the section to the JSX, just before the `{showOriginal ? ... }` block:

```tsx
{/* Datos estructurados section */}
<div className="px-4 sm:px-6 py-3 border-b border-white/5 bg-surface/20 space-y-3">
  <div className="flex items-center justify-between gap-2">
    <p className="section-label">Datos estructurados</p>
    {localSchema.length > 0 && !editingSchema && (
      <button
        type="button"
        onClick={() => setEditingSchema(true)}
        className="text-xs text-dim/60 hover:text-dim transition-colors"
      >
        Editar schema
      </button>
    )}
  </div>

  {editingSchema || localSchema.length === 0 ? (
    <div className="space-y-3">
      <SchemaEditor schema={localSchema} onChange={setLocalSchema} />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleSaveSchema(localSchema)}
          disabled={localSchema.length === 0}
          className="text-xs px-3 py-1.5 rounded-lg bg-accent/15 border border-accent/30 text-accent disabled:opacity-40 transition-colors hover:bg-accent/20"
        >
          Guardar schema
        </button>
        {editingSchema && (
          <button type="button" onClick={() => setEditingSchema(false)} className="text-xs text-dim hover:text-ink transition-colors">
            Cancelar
          </button>
        )}
      </div>
    </div>
  ) : (
    <div className="space-y-3">
      {Object.keys(localData).length > 0 ? (
        <ExtractionTable schema={localSchema} data={localData} onChange={handleDataChange} />
      ) : (
        !llmReady && (
          <p className="text-xs text-info/80">El LLM no está cargado — cárgalo en la pestaña Modelos.</p>
        )
      )}
      <button
        type="button"
        onClick={handleExtract}
        disabled={extracting || !llmReady}
        className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-dim hover:text-ink hover:bg-white/5 disabled:opacity-40 transition-colors"
      >
        {extracting ? 'Extrayendo…' : Object.keys(localData).length > 0 ? 'Re-extraer' : 'Extraer con IA'}
      </button>
      {extractionError && (
        <p className="text-xs text-err/80">{extractionError}</p>
      )}
    </div>
  )}
</div>
```

- [ ] **Step 2: Update `App.tsx` to pass `llmModelId` and `llmReady` to `DocumentEditor`**

In `App.tsx`, inside the `DocumentEditor` render, add:
```tsx
llmModelId={rag.selectedLlmId}
llmReady={rag.llmStatus === 'ready'}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/documents/DocumentEditor.tsx src/components/App.tsx
git commit -m "feat: structured extraction section in DocumentEditor"
```

---

### Task 6: Dashboard "Datos clave" section

**Files:**
- Modify: `src/components/dashboard/DashboardView.tsx`

**Context:** Show a "Datos clave" card at the bottom of the dashboard, listing documents that have `extractedData`. Show up to 3 fields per doc. Clicking a doc item navigates to DocumentEditor.

- [ ] **Step 1: Update `DashboardView.tsx`**

Add prop to `Props`:
```tsx
interface Props {
  documents: ScannedDocument[]
  onNavigate: (tab: Tab) => void
  onCameraCapture: () => void
  onOpenDoc: (id: string) => void  // ← new
}
```

Add section at the end of the returned JSX (before the quick actions):

```tsx
{/* Datos clave */}
{(() => {
  const docsWithData = documents.filter((d) => d.extractedData && Object.keys(d.extractedData).length > 0)
  if (docsWithData.length === 0) return null
  return (
    <div className="card space-y-3">
      <p className="section-label">Datos clave</p>
      <div className="space-y-2">
        {docsWithData.slice(0, 5).map((doc) => {
          const fields = doc.extractionSchema?.slice(0, 3) ?? []
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => onOpenDoc(doc.id)}
              className="w-full text-left space-y-0.5 hover:bg-white/5 rounded-xl px-2 py-1.5 -mx-2 transition-colors"
            >
              <p className="text-xs font-medium text-ink truncate">{doc.title}</p>
              <p className="text-xs text-dim/70">
                {fields.map((f) => `${f.label}: ${doc.extractedData?.[f.key] ?? '—'}`).join(' · ')}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
})()}
```

- [ ] **Step 2: Update `App.tsx` to pass `onOpenDoc`**

In `App.tsx`, update the `DashboardView` render:
```tsx
<DashboardView
  documents={documents}
  onNavigate={handleTabChange}
  onCameraCapture={handleCameraCapture}
  onOpenDoc={(id) => { setSelectedDocId(id); handleTabChange('documents') }}
/>
```

- [ ] **Step 3: Type-check and build**

```bash
npx tsc --noEmit && npm run build
```

Expected: 0 errors, clean build.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/DashboardView.tsx src/components/App.tsx
git commit -m "feat: Dashboard 'Datos clave' section for documents with extracted data"
```
