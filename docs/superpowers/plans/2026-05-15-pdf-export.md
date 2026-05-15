# PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `printDocument()` popup-window approach with an in-page `@media print` area, and add a confirmation modal with an "Incluir imagen original" checkbox before printing.

**Architecture:** A hidden `PrintArea` div is rendered inside the app and shown only by `@media print` CSS. A `PdfExportModal` controls the checkbox state and calls `window.print()`. `richTextToHtml()` converts Tiptap JSON to clean HTML for printing. The existing `Exportar PDF` button in `DocumentEditor` triggers the modal.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v3, `window.print()`, Tiptap JSON

---

### Task 1: `richTextToHtml` utility

**Files:**
- Create: `src/lib/richTextToHtml.ts`

**Context:** Tiptap stores documents as a JSON tree (ProseMirror). We need a function that converts this to clean HTML for printing. The existing `rawToHtml` in DocumentEditor handles plain text only. The print area must render richText, not rawText.

- [ ] **Step 1: Create `richTextToHtml.ts`**

```typescript
// src/lib/richTextToHtml.ts

interface TiptapNode {
  type: string
  content?: TiptapNode[]
  text?: string
  marks?: Array<{ type: string }>
  attrs?: Record<string, unknown>
}

function inlineNodes(nodes: TiptapNode[] = []): string {
  return nodes.map((n) => {
    if (n.type === 'text') {
      let t = n.text ?? ''
      t = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      for (const mark of n.marks ?? []) {
        if (mark.type === 'bold') t = `<strong>${t}</strong>`
        else if (mark.type === 'italic') t = `<em>${t}</em>`
        else if (mark.type === 'strike') t = `<s>${t}</s>`
        else if (mark.type === 'code') t = `<code>${t}</code>`
      }
      return t
    }
    if (n.type === 'hardBreak') return '<br>'
    return ''
  }).join('')
}

function blockNode(n: TiptapNode): string {
  const inner = inlineNodes(n.content)
  switch (n.type) {
    case 'paragraph': return `<p>${inner || '&nbsp;'}</p>`
    case 'heading': {
      const level = (n.attrs?.level as number) ?? 1
      return `<h${level}>${inner}</h${level}>`
    }
    case 'blockquote': return `<blockquote>${(n.content ?? []).map(blockNode).join('')}</blockquote>`
    case 'codeBlock': return `<pre><code>${inlineNodes(n.content)}</code></pre>`
    case 'bulletList':
      return `<ul>${(n.content ?? []).map((li) => `<li>${(li.content ?? []).map(blockNode).join('')}</li>`).join('')}</ul>`
    case 'orderedList':
      return `<ol>${(n.content ?? []).map((li) => `<li>${(li.content ?? []).map(blockNode).join('')}</li>`).join('')}</ol>`
    default: return inner ? `<p>${inner}</p>` : ''
  }
}

export function richTextToHtml(richText: string): string {
  try {
    const doc = JSON.parse(richText) as TiptapNode
    return (doc.content ?? []).map(blockNode).join('\n')
  } catch {
    return `<p>${richText}</p>`
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/richTextToHtml.ts
git commit -m "feat: richTextToHtml — Tiptap JSON to clean HTML for print/PDF"
```

---

### Task 2: Print CSS in `globals.css`

**Files:**
- Modify: `src/app/globals.css`

**Context:** We need `@media print` rules that hide the entire app UI and show only `#papeleo-print-area`. The existing globals.css has keyframe animations and Tailwind directives — append the print block at the end.

- [ ] **Step 1: Append print CSS to `globals.css`**

Add at the end of the file:

```css
/* ── Print / PDF export ─────────────────────────────────────────────── */
@media print {
  body > * { display: none !important; }

  #papeleo-print-area {
    display: block !important;
    position: static !important;
    color: #111 !important;
    background: #fff !important;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.7;
    padding: 2cm;
    max-width: none;
  }

  #papeleo-print-area h1 { font-size: 20pt; margin: 0 0 4pt; }
  #papeleo-print-area h2 { font-size: 16pt; margin: 16pt 0 4pt; }
  #papeleo-print-area h3 { font-size: 13pt; margin: 12pt 0 4pt; }
  #papeleo-print-area p  { margin: 0 0 8pt; }
  #papeleo-print-area ul, #papeleo-print-area ol { margin: 0 0 8pt; padding-left: 20pt; }
  #papeleo-print-area blockquote { border-left: 3pt solid #999; margin: 8pt 0; padding-left: 12pt; color: #555; }
  #papeleo-print-area code, #papeleo-print-area pre { font-family: 'Courier New', monospace; font-size: 10pt; background: #f5f5f5; }
  #papeleo-print-area pre { padding: 8pt; white-space: pre-wrap; }

  #papeleo-print-area .print-meta { font-size: 10pt; color: #666; margin-bottom: 16pt; }
  #papeleo-print-area .print-divider { border: none; border-top: 1pt solid #ddd; margin: 16pt 0; }

  #papeleo-print-area img {
    max-width: 100%;
    height: auto;
    page-break-after: always;
    display: block;
    margin-bottom: 16pt;
    border: 1pt solid #ddd;
    border-radius: 4pt;
  }
}
```

- [ ] **Step 2: Type-check + build**

```bash
npx tsc --noEmit && npm run build
```

Expected: 0 errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add @media print styles for PDF export area"
```

---

### Task 3: `PrintArea` component

**Files:**
- Create: `src/components/documents/PrintArea.tsx`

**Context:** A component rendered in the DOM at all times but visually hidden. Only `@media print` makes it visible. It receives the current doc and whether to include the image. It renders the formatted document content.

- [ ] **Step 1: Create `PrintArea.tsx`**

```tsx
// src/components/documents/PrintArea.tsx
import type { ScannedDocument } from '@/types/document'
import { richTextToHtml } from '@/lib/richTextToHtml'

interface Props {
  doc: ScannedDocument | null
  includeImage: boolean
}

export default function PrintArea({ doc, includeImage }: Props) {
  if (!doc) return <div id="papeleo-print-area" style={{ display: 'none' }} />

  const date = new Date(doc.createdAt).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const bodyHtml = doc.richText
    ? richTextToHtml(doc.richText)
    : `<p>${doc.rawText.replace(/\n/g, '</p><p>').replace(/  +/g, ' ')}</p>`

  return (
    <div id="papeleo-print-area" style={{ display: 'none' }}>
      {includeImage && doc.imageDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={doc.imageDataUrl} alt={`Imagen: ${doc.title}`} />
      )}
      <h1>{doc.title}</h1>
      <p className="print-meta">{date} · Papeleo{doc.category ? ` · ${doc.category}` : ''}</p>
      <hr className="print-divider" />
      {/* eslint-disable-next-line react/no-danger */}
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
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
git add src/components/documents/PrintArea.tsx
git commit -m "feat: PrintArea component — hidden DOM node shown only during print"
```

---

### Task 4: `PdfExportModal` component

**Files:**
- Create: `src/components/documents/PdfExportModal.tsx`

**Context:** A small modal with a checkbox "Incluir imagen original" and a "Imprimir / PDF" button. When confirmed, it updates the PrintArea and calls `window.print()`. Uses the existing `Button` component.

- [ ] **Step 1: Create `PdfExportModal.tsx`**

```tsx
// src/components/documents/PdfExportModal.tsx
'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'

interface Props {
  hasImage: boolean
  onConfirm: (includeImage: boolean) => void
  onClose: () => void
}

export default function PdfExportModal({ hasImage, onConfirm, onClose }: Props) {
  const [includeImage, setIncludeImage] = useState(hasImage)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-xs shadow-xl space-y-5">
        <h2 className="text-sm font-semibold text-ink">Exportar como PDF</h2>

        {hasImage && (
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeImage}
              onChange={(e) => setIncludeImage(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            <span className="text-sm text-dim">Incluir imagen original</span>
          </label>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} className="py-1.5 px-3 text-xs">
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(includeImage)} className="py-1.5 px-3 text-xs">
            Imprimir / PDF
          </Button>
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
git add src/components/documents/PdfExportModal.tsx
git commit -m "feat: PdfExportModal — image checkbox + print trigger"
```

---

### Task 5: Wire everything into `DocumentEditor`

**Files:**
- Modify: `src/components/documents/DocumentEditor.tsx`

**Context:** The existing "Exportar PDF" button calls `printDocument(doc)` which opens a new window. Replace this with the modal+PrintArea approach. The `PrintArea` must be rendered at the document root level so `@media print` can target `#papeleo-print-area` correctly.

- [ ] **Step 1: Update `DocumentEditor.tsx`**

1. Add imports:
```tsx
import PdfExportModal from './PdfExportModal'
import PrintArea from './PrintArea'
```

2. Add state (after `const [toastMsg, setToastMsg] = useState<string | null>(null)` if it exists, otherwise after showOriginal):
```tsx
const [showPdfModal, setShowPdfModal] = useState(false)
const [printIncludeImage, setPrintIncludeImage] = useState(true)
```

3. Add handler (after `handleShare` or `handleEmbed`):
```tsx
const handlePrint = (includeImage: boolean) => {
  setPrintIncludeImage(includeImage)
  setShowPdfModal(false)
  // Give React one frame to update PrintArea before printing
  setTimeout(() => window.print(), 50)
}
```

4. Replace the existing "Exportar PDF" button:
```tsx
<Button variant="ghost" onClick={() => setShowPdfModal(true)} className="py-1 px-2.5 text-xs flex-shrink-0">
  PDF
</Button>
```

5. Before the closing `</div>` of the root element, add:
```tsx
{showPdfModal && (
  <PdfExportModal
    hasImage={!!doc.imageDataUrl}
    onConfirm={handlePrint}
    onClose={() => setShowPdfModal(false)}
  />
)}
<PrintArea doc={doc} includeImage={printIncludeImage} />
```

6. Remove the `printDocument` import if it is no longer used (keep `shareDocument`):
```tsx
import { shareDocument } from '@/services/exportService'
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
git add src/components/documents/DocumentEditor.tsx
git commit -m "feat: PDF export via in-page PrintArea + modal — no popup window"
```
