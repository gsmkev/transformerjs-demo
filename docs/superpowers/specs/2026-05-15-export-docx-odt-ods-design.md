# Export Word / ODT / ODS — Design Spec

**Date:** 2026-05-15  
**Status:** Approved  
**Scope:** Export scanned documents to .docx, .odt, and .ods formats — individual from DocumentEditor, bulk from DocumentList selection mode.

---

## 1. Data Source

- **Rich text export (DOCX, ODT):** use `doc.richText` (Tiptap/ProseMirror JSON) if non-empty; fall back to `doc.rawText` wrapped in plain `<paragraph>` nodes.
- **Spreadsheet export (ODS):** always use `doc.rawText` (plain text column) + metadata fields (title, date, category, confidence).
- **Image:** optional — user-controlled checkbox at export time; applies only to DOCX and ODT.

---

## 2. Dependencies

| Package | Purpose | Approx. size |
|---------|---------|-------------|
| `docx` | Generate `.docx` (OOXML) | ~200 KB gz |
| `jszip` | Generate ODF ZIP containers for `.odt` and `.ods`; also zip bulk DOCX/ODT files | ~100 KB gz |

No other new dependencies. Both are pure client-side, no backend required.

---

## 3. Files

### New

| File | Responsibility |
|------|---------------|
| `src/lib/tiptapToDocx.ts` | Tiptap JSON → `docx` node array (`Paragraph`, `HeadingLevel`, `TextRun`, marks, image) |
| `src/lib/tiptapToOdf.ts` | Tiptap JSON → ODT `content.xml` string; `ScannedDocument[]` → ODS `content.xml` string |
| `src/components/ui/ExportMenu.tsx` | Reusable dropdown: format selector (DOCX / ODT / ODS) + image checkbox + download trigger |

### Modified

| File | Change |
|------|--------|
| `src/services/exportService.ts` | Add `exportDocx`, `exportOdt`, `exportOds` (single); `exportBulkDocx`, `exportBulkOdt`, `exportBulkOds` (batch) |
| `src/components/documents/DocumentEditor.tsx` | Replace "Exportar PDF" button with `<ExportMenu doc={doc} />` (which also exposes print as secondary action) |
| `src/components/documents/DocumentList.tsx` | Add selection mode state + action bar; pass `ExportMenu` in bulk mode |
| `src/components/documents/DocumentCard.tsx` | Accept `selectionMode` + `isSelected` + `onToggleSelect` props; render checkbox overlay in selection mode |

---

## 4. Tiptap → DOCX Conversion (`tiptapToDocx.ts`)

```
tiptapToDocxChildren(json, imageDataUrl?, includeImage) → (Paragraph | Table)[]
```

Node mapping:

| Tiptap node | docx output |
|-------------|-------------|
| `paragraph` | `new Paragraph({ children: TextRun[] })` |
| `heading` level 1 | `Paragraph({ heading: HeadingLevel.HEADING_1 })` |
| `heading` level 2 | `Paragraph({ heading: HeadingLevel.HEADING_2 })` |
| `heading` level 3 | `Paragraph({ heading: HeadingLevel.HEADING_3 })` |
| `bulletList` item | `Paragraph({ bullet: { level: 0 } })` |
| `orderedList` item | `Paragraph({ numbering: { reference: 'ordered', level: 0 } })` |
| `blockquote` | `Paragraph({ indent: { left: 720 }, style: 'Quote' })` |
| `hardBreak` | `TextRun({ break: 1 })` |
| `codeBlock` | `Paragraph({ style: 'Code' })` |
| mark `bold` | `TextRun({ bold: true })` |
| mark `italic` | `TextRun({ italics: true })` |
| mark `strike` | `TextRun({ strike: true })` |
| mark `code` | `TextRun({ font: 'Courier New', size: 18 })` |

If `includeImage` is true, an `ImageRun` is prepended as the first child of the document.

---

## 5. Tiptap → ODF Conversion (`tiptapToOdf.ts`)

### ODT (`tiptapToOdtXml`)

Returns `content.xml` body XML for an ODF Text document. The full `.odt` is a ZIP with:

```
mimetype          (uncompressed, must be first)
META-INF/
  manifest.xml
content.xml
styles.xml        (minimal — page size, default paragraph style)
```

Node mapping to ODF XML:

| Tiptap node | ODF element |
|-------------|-------------|
| `paragraph` | `<text:p text:style-name="Text_20_Body">` |
| `heading` level N | `<text:h text:style-name="Heading_20_N" text:outline-level="N">` |
| `bulletList` item | `<text:list-item>` inside `<text:list>` |
| `orderedList` item | `<text:list-item>` with numbered list style |
| `blockquote` | `<text:p text:style-name="Quotations">` |
| `hardBreak` | `<text:line-break/>` |
| mark `bold` | `<text:span text:style-name="Bold">` |
| mark `italic` | `<text:span text:style-name="Italic">` |
| mark `strike` | `<text:span text:style-name="Strikethrough">` |
| mark `code` | `<text:span text:style-name="Source_20_Text">` |

If `includeImage` is true, a `<draw:frame>` with `<draw:image>` (base64 PNG) is added at the start and the image is registered in `manifest.xml`.

### ODS (`tiptapToOdsXml`)

Returns `content.xml` for an ODF Spreadsheet. One row per document:

| Column | A | B | C | D | E |
|--------|---|---|---|---|---|
| Header | Título | Fecha | Categoría | Confianza (%) | Texto |
| Data | `doc.title` | ISO date | `doc.category` | `doc.confidence` | `doc.rawText` |

The ODS ZIP structure mirrors ODT but with `urn:oasis:names:tc:opendocument:xmlns:spreadsheet:1.0` mimetype.

---

## 6. Export Service (`exportService.ts`)

### Single-document exports

```typescript
export async function exportDocx(doc: ScannedDocument, includeImage: boolean): Promise<void>
export async function exportOdt(doc: ScannedDocument, includeImage: boolean): Promise<void>
export async function exportOds(doc: ScannedDocument): Promise<void>
```

Each function:
1. Converts the document using the appropriate converter
2. Generates the file blob
3. Triggers browser download via `URL.createObjectURL` + programmatic `<a>` click
4. Revokes the object URL after click

Filename pattern: `{title-slugified}.{ext}`

### Bulk exports

```typescript
export async function exportBulkDocx(docs: ScannedDocument[], includeImage: boolean): Promise<void>
export async function exportBulkOdt(docs: ScannedDocument[], includeImage: boolean): Promise<void>
export async function exportBulkOds(docs: ScannedDocument[]): Promise<void>
```

- **Bulk DOCX / ODT:** one file per document, all packaged into `documentos-export.zip` via JSZip
- **Bulk ODS:** single `.ods` with all selected documents as rows in one sheet; downloads as `documentos.ods`

---

## 7. ExportMenu Component (`ExportMenu.tsx`)

```typescript
interface ExportMenuProps {
  doc?: ScannedDocument          // single-doc mode
  docs?: ScannedDocument[]       // bulk mode (one of the two required)
  onClose?: () => void
}
```

UI elements:
- **Format selector** — 3 pill buttons: `Word (.docx)` | `ODT` | `ODS`
- **Image checkbox** — `"Incluir imagen escaneada"` — visible only when format is DOCX or ODT; hidden for ODS
- **"Descargar"** primary button — calls the appropriate export function; shows spinner while generating
- **"Imprimir / PDF"** — text link (secondary), calls existing `printDocument()` — only shown in single-doc mode
- Rendered as a floating popover anchored to the trigger button; closes on outside click or Escape

---

## 8. DocumentEditor Integration

Replace:
```tsx
<Button onClick={printDocument}>Exportar PDF</Button>
```

With:
```tsx
<ExportMenu doc={doc} />
```

The `ExportMenu` internally renders the "Exportar ▾" trigger button and manages its own open/close state.

---

## 9. DocumentList — Selection Mode

**State additions (inside `DocumentList`):**
```typescript
const [selectionMode, setSelectionMode] = useState(false)
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
```

**"Seleccionar" button** — appears in the list header, next to the document count label. Toggles `selectionMode`. Entering selection mode clears `selectedIds`.

**DocumentCard changes:**
- New props: `selectionMode?: boolean`, `isSelected?: boolean`, `onToggleSelect?: () => void`
- In selection mode: clicking the card calls `onToggleSelect` instead of `onOpen`; a circular checkbox appears top-left (filled teal when selected)
- Outside selection mode: existing behavior unchanged

**Bottom action bar** — fixed, appears only in selection mode (above the mobile bottom tab bar):
```
[N documentos seleccionados]  [Exportar ▾]  [Cancelar]
```
- `z-40`, `fixed bottom-20 sm:bottom-0 left-0 right-0`
- `bg-base/90 backdrop-blur-xl border-t border-white/7 px-4 py-3`
- "Exportar ▾" opens `<ExportMenu docs={selectedDocs} />` — disabled if 0 docs selected
- "Cancelar" exits selection mode

---

## 10. Error Handling

- If `richText` is empty string or malformed JSON: catch parse error, fall back to `rawText`
- If `imageDataUrl` is null and `includeImage` is true: silently skip image (no error shown)
- If JSZip or docx throws: show an inline error toast (reuse existing error pattern in the app)
- Large documents (>5 MB rawText): no special handling — browser memory is sufficient for typical scanned docs

---

## 11. Non-Goals

- No PDF generation (existing print dialog covers this)
- No XLSX export (ODS covers the spreadsheet use case)
- No import from Word/ODT/ODS
- No server-side rendering of documents
- No password protection or digital signatures
