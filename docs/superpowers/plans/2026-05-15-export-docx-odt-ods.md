# Export DOCX / ODT / ODS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export scanned documents to `.docx` (Word), `.odt` (LibreOffice text), and `.ods` (LibreOffice spreadsheet) formats. Single-doc export from DocumentEditor; bulk export via a selection mode in DocumentList.

**Architecture:** `docx` npm package generates DOCX from Tiptap JSON. `jszip` generates ODF ZIP containers for ODT and ODS (XML-based). A `tiptapToDocx.ts` converter and `tiptapToOdf.ts` converter handle the Tiptap → format mapping. An `ExportMenu` dropdown component is the UI entry point. The existing `exportService.ts` gains the download-trigger functions.

**Tech Stack:** Next.js 15, TypeScript, `docx` npm package, `jszip` npm package

---

### Task 1: Install dependencies

**Files:** (package.json, package-lock.json)

- [ ] **Step 1: Install `docx` and `jszip`**

```bash
npm install docx jszip
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors (new packages have bundled types).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install docx and jszip for document export"
```

---

### Task 2: `tiptapToDocx.ts` — Tiptap JSON → docx nodes

**Files:**
- Create: `src/lib/tiptapToDocx.ts`

**Context:** The `docx` package uses a builder API. Each Tiptap node maps to a `docx` node. The function returns an array of `Paragraph` objects (the `Document` wrapper is created in `exportService.ts`).

- [ ] **Step 1: Create `tiptapToDocx.ts`**

```typescript
// src/lib/tiptapToDocx.ts
import {
  Paragraph, TextRun, HeadingLevel, ImageRun,
  AlignmentType, UnderlineType,
} from 'docx'

interface TiptapNode {
  type: string
  content?: TiptapNode[]
  text?: string
  marks?: Array<{ type: string }>
  attrs?: Record<string, unknown>
}

function inlineRuns(nodes: TiptapNode[] = []): TextRun[] {
  const runs: TextRun[] = []
  for (const n of nodes) {
    if (n.type === 'text') {
      const marks = n.marks ?? []
      runs.push(new TextRun({
        text: n.text ?? '',
        bold: marks.some((m) => m.type === 'bold'),
        italics: marks.some((m) => m.type === 'italic'),
        strike: marks.some((m) => m.type === 'strike'),
        font: marks.some((m) => m.type === 'code') ? 'Courier New' : undefined,
        size: marks.some((m) => m.type === 'code') ? 18 : undefined,
      }))
    } else if (n.type === 'hardBreak') {
      runs.push(new TextRun({ break: 1 }))
    }
  }
  return runs
}

function blockToParagraphs(n: TiptapNode): Paragraph[] {
  switch (n.type) {
    case 'paragraph':
      return [new Paragraph({ children: inlineRuns(n.content) })]

    case 'heading': {
      const levelMap: Record<number, HeadingLevel> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
      }
      const level = levelMap[(n.attrs?.level as number) ?? 1] ?? HeadingLevel.HEADING_1
      return [new Paragraph({ heading: level, children: inlineRuns(n.content) })]
    }

    case 'blockquote':
      return (n.content ?? []).flatMap((child) => {
        const inner = blockToParagraphs(child)
        return inner.map((p) => new Paragraph({
          indent: { left: 720 },
          children: (p as any).options?.children ?? [],
        }))
      })

    case 'bulletList':
      return (n.content ?? []).flatMap((li) =>
        (li.content ?? []).flatMap((child) => {
          const inner = blockToParagraphs(child)
          return inner.map((_, idx) =>
            idx === 0
              ? new Paragraph({ bullet: { level: 0 }, children: inlineRuns(child.content) })
              : new Paragraph({ children: inlineRuns(child.content) })
          )
        })
      )

    case 'orderedList':
      return (n.content ?? []).flatMap((li) =>
        (li.content ?? []).flatMap((child) =>
          [new Paragraph({ numbering: { reference: 'ordered-list', level: 0 }, children: inlineRuns(child.content) })]
        )
      )

    case 'codeBlock':
      return [new Paragraph({
        children: [new TextRun({ text: (n.content ?? []).map((t) => t.text ?? '').join(''), font: 'Courier New', size: 18 })],
      })]

    default:
      return [new Paragraph({ children: inlineRuns(n.content) })]
  }
}

export function tiptapToDocxChildren(
  richTextJson: string,
  imageDataUrl: string | null,
  includeImage: boolean,
): Paragraph[] {
  const paragraphs: Paragraph[] = []

  if (includeImage && imageDataUrl) {
    try {
      const b64 = imageDataUrl.split(',')[1]
      const binary = atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      paragraphs.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: bytes,
              transformation: { width: 400, height: 300 },
              type: 'jpg',
            }),
          ],
          pageBreakBefore: false,
        }),
        new Paragraph({ children: [] }),
      )
    } catch {
      // Image conversion failed — skip silently
    }
  }

  try {
    const doc = JSON.parse(richTextJson) as TiptapNode
    paragraphs.push(...(doc.content ?? []).flatMap(blockToParagraphs))
  } catch {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: richTextJson })] }))
  }

  return paragraphs
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/tiptapToDocx.ts
git commit -m "feat: tiptapToDocx — Tiptap JSON to docx paragraph nodes"
```

---

### Task 3: `tiptapToOdf.ts` — ODT + ODS XML generators

**Files:**
- Create: `src/lib/tiptapToOdf.ts`

**Context:** ODT and ODS are ZIP files containing XML. We generate the XML strings here; the ZIP assembly happens in `exportService.ts`. For ODT: full `content.xml` body. For ODS: spreadsheet `content.xml` with one row per document.

- [ ] **Step 1: Create `tiptapToOdf.ts`**

```typescript
// src/lib/tiptapToOdf.ts
import type { ScannedDocument } from '@/types/document'

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

interface TiptapNode {
  type: string
  content?: TiptapNode[]
  text?: string
  marks?: Array<{ type: string }>
  attrs?: Record<string, unknown>
}

function inlineXml(nodes: TiptapNode[] = []): string {
  return nodes.map((n) => {
    if (n.type === 'text') {
      let t = escapeXml(n.text ?? '')
      for (const mark of n.marks ?? []) {
        if (mark.type === 'bold') t = `<text:span text:style-name="Bold">${t}</text:span>`
        else if (mark.type === 'italic') t = `<text:span text:style-name="Italic">${t}</text:span>`
        else if (mark.type === 'strike') t = `<text:span text:style-name="Strikethrough">${t}</text:span>`
        else if (mark.type === 'code') t = `<text:span text:style-name="Source_20_Text">${t}</text:span>`
      }
      return t
    }
    if (n.type === 'hardBreak') return '<text:line-break/>'
    return ''
  }).join('')
}

function blockXml(n: TiptapNode): string {
  switch (n.type) {
    case 'paragraph':
      return `<text:p text:style-name="Text_20_Body">${inlineXml(n.content)}</text:p>`
    case 'heading': {
      const level = (n.attrs?.level as number) ?? 1
      return `<text:h text:style-name="Heading_20_${level}" text:outline-level="${level}">${inlineXml(n.content)}</text:h>`
    }
    case 'blockquote':
      return `<text:p text:style-name="Quotations">${(n.content ?? []).map((c) => inlineXml(c.content)).join('')}</text:p>`
    case 'bulletList':
      return `<text:list text:style-name="List_20_Bullet">${(n.content ?? []).map((li) =>
        `<text:list-item>${(li.content ?? []).map(blockXml).join('')}</text:list-item>`
      ).join('')}</text:list>`
    case 'orderedList':
      return `<text:list text:style-name="List_20_Number">${(n.content ?? []).map((li) =>
        `<text:list-item>${(li.content ?? []).map(blockXml).join('')}</text:list-item>`
      ).join('')}</text:list>`
    case 'codeBlock':
      return `<text:p text:style-name="Preformatted_20_Text">${escapeXml((n.content ?? []).map((t) => t.text ?? '').join(''))}</text:p>`
    default:
      return `<text:p text:style-name="Text_20_Body">${inlineXml(n.content)}</text:p>`
  }
}

export function tiptapToOdtXml(richText: string, rawText: string): string {
  let bodyXml: string
  try {
    const doc = JSON.parse(richText) as TiptapNode
    bodyXml = (doc.content ?? []).map(blockXml).join('\n')
  } catch {
    bodyXml = `<text:p text:style-name="Text_20_Body">${escapeXml(rawText)}</text:p>`
  }
  return bodyXml
}

export const ODT_STYLES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.3">
<office:styles>
  <style:style style:name="Text_20_Body" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="6pt"/></style:style>
  <style:style style:name="Heading_20_1" style:family="paragraph"><style:text-properties fo:font-size="18pt" fo:font-weight="bold"/></style:style>
  <style:style style:name="Heading_20_2" style:family="paragraph"><style:text-properties fo:font-size="14pt" fo:font-weight="bold"/></style:style>
  <style:style style:name="Heading_20_3" style:family="paragraph"><style:text-properties fo:font-size="12pt" fo:font-weight="bold"/></style:style>
  <style:style style:name="Quotations" style:family="paragraph"><style:paragraph-properties fo:margin-left="1cm"/></style:style>
  <style:style style:name="Preformatted_20_Text" style:family="paragraph"><style:text-properties style:font-name="Courier New"/></style:style>
  <style:style style:name="Bold" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>
  <style:style style:name="Italic" style:family="text"><style:text-properties fo:font-style="italic"/></style:style>
  <style:style style:name="Strikethrough" style:family="text"><style:text-properties style:text-line-through-style="solid"/></style:style>
  <style:style style:name="Source_20_Text" style:family="text"><style:text-properties style:font-name="Courier New"/></style:style>
</office:styles>
</office:document-styles>`

export function documentsToOdsXml(docs: ScannedDocument[]): string {
  const headerRow = `<table:table-row>
    <table:table-cell office:value-type="string"><text:p>Título</text:p></table:table-cell>
    <table:table-cell office:value-type="string"><text:p>Fecha</text:p></table:table-cell>
    <table:table-cell office:value-type="string"><text:p>Categoría</text:p></table:table-cell>
    <table:table-cell office:value-type="string"><text:p>Confianza (%)</text:p></table:table-cell>
    <table:table-cell office:value-type="string"><text:p>Texto</text:p></table:table-cell>
  </table:table-row>`

  const dataRows = docs.map((doc) => {
    const date = new Date(doc.createdAt).toISOString().slice(0, 10)
    const confidence = doc.confidence != null ? String(Math.round(doc.confidence)) : ''
    return `<table:table-row>
      <table:table-cell office:value-type="string"><text:p>${escapeXml(doc.title)}</text:p></table:table-cell>
      <table:table-cell office:value-type="string"><text:p>${date}</text:p></table:table-cell>
      <table:table-cell office:value-type="string"><text:p>${escapeXml(doc.category ?? '')}</text:p></table:table-cell>
      <table:table-cell office:value-type="string"><text:p>${confidence}</text:p></table:table-cell>
      <table:table-cell office:value-type="string"><text:p>${escapeXml(doc.rawText.slice(0, 32767))}</text:p></table:table-cell>
    </table:table-row>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.3">
<office:body><office:spreadsheet>
<table:table table:name="Documentos">
${headerRow}
${dataRows}
</table:table>
</office:spreadsheet></office:body>
</office:document-content>`
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/tiptapToOdf.ts
git commit -m "feat: tiptapToOdf — ODT content XML and ODS spreadsheet XML generators"
```

---

### Task 4: Export functions in `exportService.ts`

**Files:**
- Modify: `src/services/exportService.ts`

**Context:** Add `exportDocx`, `exportOdt`, `exportOds` (single), and `exportBulkDocx`, `exportBulkOdt`, `exportBulkOds` (bulk). Each triggers a browser download. Bulk DOCX/ODT wraps individual files in a `.zip`; bulk ODS puts all docs in one sheet.

- [ ] **Step 1: Add export functions to `exportService.ts`**

Append to `src/services/exportService.ts`:

```typescript
import JSZip from 'jszip'
import { Document, Packer, NumberingConfig, AlignmentType } from 'docx'
import { tiptapToDocxChildren } from '@/lib/tiptapToDocx'
import { tiptapToOdtXml, documentsToOdsXml, ODT_STYLES_XML } from '@/lib/tiptapToOdf'
import type { DocumentChunk } from '@/types/document'

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'documento'
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

// ── ODT helpers ──────────────────────────────────────────────────────────────

function buildOdtZip(contentXml: string, includeImage: boolean, imageDataUrl: string | null): JSZip {
  const zip = new JSZip()
  const bodyXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  office:version="1.3">
<office:body><office:text>${contentXml}</office:text></office:body>
</office:document-content>`

  const manifestEntries = [
    `<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>`,
    `<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>`,
    `<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>`,
  ]

  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' })
  zip.file('content.xml', bodyXml)
  zip.file('styles.xml', ODT_STYLES_XML)
  zip.folder('META-INF')!.file('manifest.xml',
    `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">${manifestEntries.join('')}</manifest:manifest>`)
  return zip
}

function buildOdsZip(contentXml: string): JSZip {
  const zip = new JSZip()
  const manifestEntries = [
    `<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.spreadsheet"/>`,
    `<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>`,
  ]
  zip.file('mimetype', 'application/vnd.oasis.opendocument.spreadsheet', { compression: 'STORE' })
  zip.file('content.xml', contentXml)
  zip.folder('META-INF')!.file('manifest.xml',
    `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">${manifestEntries.join('')}</manifest:manifest>`)
  return zip
}

// ── Single exports ───────────────────────────────────────────────────────────

export async function exportDocx(doc: ScannedDocument, includeImage: boolean): Promise<void> {
  const richText = doc.richText || JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: doc.rawText }] }] })
  const children = tiptapToDocxChildren(richText, doc.imageDataUrl, includeImage)
  const docxDoc = new Document({
    numbering: { config: [{ reference: 'ordered-list', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT }] }] },
    sections: [{ properties: {}, children }],
  })
  const blob = await Packer.toBlob(docxDoc)
  downloadBlob(blob, `${slugify(doc.title)}.docx`)
}

export async function exportOdt(doc: ScannedDocument, includeImage: boolean): Promise<void> {
  const richText = doc.richText || ''
  const bodyXml = tiptapToOdtXml(richText, doc.rawText)
  const zip = buildOdtZip(bodyXml, includeImage, doc.imageDataUrl)
  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `${slugify(doc.title)}.odt`)
}

export async function exportOds(doc: ScannedDocument): Promise<void> {
  const contentXml = documentsToOdsXml([doc])
  const zip = buildOdsZip(contentXml)
  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `${slugify(doc.title)}.ods`)
}

// ── Bulk exports ─────────────────────────────────────────────────────────────

export async function exportBulkDocx(docs: ScannedDocument[], includeImage: boolean): Promise<void> {
  const zip = new JSZip()
  for (const doc of docs) {
    const richText = doc.richText || JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: doc.rawText }] }] })
    const children = tiptapToDocxChildren(richText, doc.imageDataUrl, includeImage)
    const docxDoc = new Document({
      numbering: { config: [{ reference: 'ordered-list', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT }] }] },
      sections: [{ properties: {}, children }],
    })
    const buffer = await Packer.toBuffer(docxDoc)
    zip.file(`${slugify(doc.title)}.docx`, buffer)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, 'documentos-export.zip')
}

export async function exportBulkOdt(docs: ScannedDocument[], includeImage: boolean): Promise<void> {
  const outerZip = new JSZip()
  for (const doc of docs) {
    const bodyXml = tiptapToOdtXml(doc.richText || '', doc.rawText)
    const innerZip = buildOdtZip(bodyXml, includeImage, doc.imageDataUrl)
    const buf = await innerZip.generateAsync({ type: 'uint8array' })
    outerZip.file(`${slugify(doc.title)}.odt`, buf)
  }
  const blob = await outerZip.generateAsync({ type: 'blob' })
  downloadBlob(blob, 'documentos-export.zip')
}

export async function exportBulkOds(docs: ScannedDocument[]): Promise<void> {
  const contentXml = documentsToOdsXml(docs)
  const zip = buildOdsZip(contentXml)
  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, 'documentos.ods')
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors. (If `DocumentChunk` import is unused, remove it.)

- [ ] **Step 3: Commit**

```bash
git add src/services/exportService.ts
git commit -m "feat: DOCX/ODT/ODS export functions in exportService"
```

---

### Task 5: `ExportMenu` component

**Files:**
- Create: `src/components/ui/ExportMenu.tsx`

**Context:** A dropdown anchored to a trigger button. Shows format pills (DOCX / ODT / ODS), an image checkbox (only for DOCX/ODT), and a "Descargar" button. Manages its own open state. Works in single-doc and multi-doc (bulk) modes.

- [ ] **Step 1: Create `ExportMenu.tsx`**

```tsx
// src/components/ui/ExportMenu.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import type { ScannedDocument } from '@/types/document'
import Button from './Button'
import {
  exportDocx, exportOdt, exportOds,
  exportBulkDocx, exportBulkOdt, exportBulkOds,
} from '@/services/exportService'

type Format = 'docx' | 'odt' | 'ods'

interface Props {
  doc?: ScannedDocument
  docs?: ScannedDocument[]
}

export default function ExportMenu({ doc, docs }: Props) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<Format>('docx')
  const [includeImage, setIncludeImage] = useState(true)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const targets = docs ?? (doc ? [doc] : [])
  const isBulk = !!docs
  const showImageOption = format !== 'ods'

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  const handleDownload = async () => {
    if (targets.length === 0) return
    setLoading(true)
    try {
      if (isBulk) {
        if (format === 'docx') await exportBulkDocx(targets, includeImage)
        else if (format === 'odt') await exportBulkOdt(targets, includeImage)
        else await exportBulkOds(targets)
      } else {
        const d = targets[0]
        if (format === 'docx') await exportDocx(d, includeImage)
        else if (format === 'odt') await exportOdt(d, includeImage)
        else await exportOds(d)
      }
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        className="py-1 px-2.5 text-xs flex-shrink-0"
      >
        Exportar ▾
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-30 w-56 bg-surface border border-white/10 rounded-2xl shadow-xl p-4 space-y-4">
          <p className="text-xs font-semibold text-ink">Formato</p>

          <div className="flex gap-1.5">
            {(['docx', 'odt', 'ods'] as Format[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`flex-1 py-1 rounded-lg text-xs font-medium border transition-all ${
                  format === f
                    ? 'bg-accent/15 border-accent/30 text-accent'
                    : 'border-white/10 text-dim hover:text-ink hover:bg-white/5'
                }`}
              >
                {f === 'docx' ? 'Word' : f.toUpperCase()}
              </button>
            ))}
          </div>

          {showImageOption && (
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeImage}
                onChange={(e) => setIncludeImage(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              <span className="text-xs text-dim">Incluir imagen escaneada</span>
            </label>
          )}

          <Button
            onClick={handleDownload}
            disabled={loading || targets.length === 0}
            spinning={loading}
            className="w-full py-1.5 text-xs"
          >
            {loading ? 'Generando…' : `Descargar${isBulk && targets.length > 0 ? ` (${targets.length})` : ''}`}
          </Button>
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
git add src/components/ui/ExportMenu.tsx
git commit -m "feat: ExportMenu dropdown — DOCX/ODT/ODS format selector + image checkbox"
```

---

### Task 6: Integrate `ExportMenu` into `DocumentEditor`

**Files:**
- Modify: `src/components/documents/DocumentEditor.tsx`

**Context:** Replace the "Exportar PDF" button with `<ExportMenu doc={doc} />`. PDF export is now handled via the `PdfExportModal` (from the pdf-export plan). The `ExportMenu` sits next to the other action buttons in the header.

- [ ] **Step 1: Update `DocumentEditor.tsx`**

1. Add import:
```tsx
import ExportMenu from '@/components/ui/ExportMenu'
```

2. Replace the "Exportar PDF" / "PDF" button with:
```tsx
<ExportMenu doc={doc} />
```

(Remove any import of `printDocument` from `exportService` if it's no longer used directly.)

- [ ] **Step 2: Type-check and build**

```bash
npx tsc --noEmit && npm run build
```

Expected: 0 errors, clean build.

- [ ] **Step 3: Commit**

```bash
git add src/components/documents/DocumentEditor.tsx
git commit -m "feat: ExportMenu integrated in DocumentEditor"
```

---

### Task 7: Selection mode in `DocumentList` + bulk export

**Files:**
- Modify: `src/components/documents/DocumentList.tsx`
- Modify: `src/components/documents/DocumentCard.tsx`

**Context:** Add a "Seleccionar" toggle to the document list header. In selection mode, cards show a checkbox; clicking selects them instead of opening them. A bottom action bar (above mobile tab bar) shows `ExportMenu docs={selectedDocs}` and a Cancel button.

- [ ] **Step 1: Update `DocumentCard.tsx` to support selection mode**

Read `src/components/documents/DocumentCard.tsx`. Add these props:

```tsx
interface Props {
  doc: ScannedDocument
  onOpen: () => void
  onDelete: () => void
  selectionMode?: boolean
  isSelected?: boolean
  onToggleSelect?: () => void
}
```

In the card's main `onClick`:
```tsx
onClick={selectionMode ? onToggleSelect : onOpen}
```

Add checkbox overlay in selection mode (inside the card, top-left):
```tsx
{selectionMode && (
  <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
    isSelected ? 'bg-accent border-accent' : 'bg-surface border-white/30'
  }`}>
    {isSelected && (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    )}
  </div>
)}
```

Make the card `relative` if not already.

- [ ] **Step 2: Update `DocumentList.tsx` — add selection mode state + action bar**

Add state after existing state declarations:
```tsx
const [selectionMode, setSelectionMode] = useState(false)
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
```

Add "Seleccionar" button in the header row (next to the document count):
```tsx
<button
  onClick={() => { setSelectionMode((m) => !m); setSelectedIds(new Set()) }}
  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
    selectionMode
      ? 'bg-accent/15 border-accent/30 text-accent'
      : 'border-white/10 text-dim hover:text-ink hover:bg-white/5'
  }`}
>
  {selectionMode ? 'Cancelar' : 'Seleccionar'}
</button>
```

Update the `DocumentCard` renders to pass selection props:
```tsx
<DocumentCard
  key={doc.id}
  doc={doc}
  onOpen={() => onOpen(doc.id)}
  onDelete={() => onDelete(doc.id)}
  selectionMode={selectionMode}
  isSelected={selectedIds.has(doc.id)}
  onToggleSelect={() => setSelectedIds((prev) => {
    const next = new Set(prev)
    if (next.has(doc.id)) next.delete(doc.id)
    else next.add(doc.id)
    return next
  })}
/>
```

Add bulk action bar at the end of the returned JSX (before closing `</div>`):
```tsx
{selectionMode && selectedIds.size > 0 && (
  <div className="fixed bottom-20 sm:bottom-0 left-0 right-0 z-40 bg-base/90 backdrop-blur-xl border-t border-white/7 px-4 py-3 flex items-center gap-3">
    <span className="text-xs text-dim flex-1">{selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}</span>
    <ExportMenu docs={filtered.filter((d) => selectedIds.has(d.id))} />
    <Button variant="ghost" onClick={() => { setSelectionMode(false); setSelectedIds(new Set()) }} className="py-1 px-3 text-xs">
      Cancelar
    </Button>
  </div>
)}
```

Add import at top:
```tsx
import ExportMenu from '@/components/ui/ExportMenu'
```

- [ ] **Step 3: Type-check and build**

```bash
npx tsc --noEmit && npm run build
```

Expected: 0 errors, clean build.

- [ ] **Step 4: Commit**

```bash
git add src/components/documents/DocumentCard.tsx src/components/documents/DocumentList.tsx
git commit -m "feat: selection mode + bulk export in DocumentList"
```
