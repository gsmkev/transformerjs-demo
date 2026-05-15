# Backup / Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export all documents (and chat histories, if they exist) as a `.zip` file, and restore from that same `.zip`. Accessible from a Settings modal opened via a ⚙ icon in the header.

**Architecture:** `backupService.ts` uses `jszip` (already installed for export) to generate and parse the backup ZIP. A `SettingsModal` component hosts Backup/Restore UI plus the chat limit selector. `App.tsx` owns the `settingsOpen` boolean and passes documents/chatHistories.

**Tech Stack:** Next.js 15, TypeScript, `jszip`, IndexedDB (`documentStorage.ts`)

---

### Task 1: `backupService.ts`

**Files:**
- Create: `src/services/backupService.ts`

**Context:** `jszip` is already installed. The backup ZIP contains `manifest.json` + `documents/{id}.json`. Chat history support is additive (skipped if no chat histories are passed). Import uses `saveDocument` from `documentStorage.ts` for upsert.

- [ ] **Step 1: Read `documentStorage.ts` to understand the save function signature**

```bash
grep -n "export async function save\|export function save" src/services/documentStorage.ts | head -10
```

Note the exact function name and signature.

- [ ] **Step 2: Create `backupService.ts`**

```typescript
// src/services/backupService.ts
import JSZip from 'jszip'
import type { ScannedDocument } from '@/types/document'
import { saveDocument } from './documentStorage'

export interface BackupManifest {
  version: 1
  exportedAt: string
  documentCount: number
  chatHistoryCount: number
}

export interface ImportResult {
  docsImported: number
  chatsImported: number
  errors: string[]
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export async function exportBackup(
  documents: ScannedDocument[],
  chatHistories: unknown[] = [],
): Promise<void> {
  const zip = new JSZip()

  const manifest: BackupManifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    documentCount: documents.length,
    chatHistoryCount: chatHistories.length,
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2))

  const docsFolder = zip.folder('documents')!
  for (const doc of documents) {
    // Exclude imageDataUrl — keep backup lightweight
    const { imageDataUrl: _, ...docWithoutImage } = doc
    docsFolder.file(`${doc.id}.json`, JSON.stringify(docWithoutImage, null, 2))
  }

  if (chatHistories.length > 0) {
    const chatsFolder = zip.folder('chat_histories')!
    for (const history of chatHistories) {
      const h = history as { id: string }
      chatsFolder.file(`${h.id}.json`, JSON.stringify(history, null, 2))
    }
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  const date = new Date().toISOString().slice(0, 10)
  downloadBlob(blob, `papeleo-backup-${date}.zip`)
}

export async function importBackup(file: File): Promise<ImportResult> {
  const result: ImportResult = { docsImported: 0, chatsImported: 0, errors: [] }

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    throw new Error('El archivo no es un backup válido de Papeleo')
  }

  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) throw new Error('El archivo no es un backup válido de Papeleo')

  let manifest: BackupManifest
  try {
    manifest = JSON.parse(await manifestFile.async('string'))
  } catch {
    throw new Error('El archivo no es un backup válido de Papeleo')
  }

  if (manifest.version !== 1) {
    throw new Error(`Versión de backup no compatible (v${manifest.version})`)
  }

  // Import documents
  const docFiles = Object.entries(zip.files).filter(([path]) => path.startsWith('documents/') && path.endsWith('.json'))
  for (const [path, zipFile] of docFiles) {
    try {
      const json = await zipFile.async('string')
      const doc = JSON.parse(json) as ScannedDocument
      // Restore without imageDataUrl (not backed up)
      await saveDocument({ ...doc, imageDataUrl: '' })
      result.docsImported++
    } catch (err) {
      result.errors.push(`${path}: ${String(err)}`)
    }
  }

  // Import chat histories (if present)
  const chatFiles = Object.entries(zip.files).filter(([path]) => path.startsWith('chat_histories/') && path.endsWith('.json'))
  for (const [path, zipFile] of chatFiles) {
    try {
      const json = await zipFile.async('string')
      const history = JSON.parse(json)
      // Dynamic import to avoid coupling — chat history storage may not exist yet
      const { saveChatHistory } = await import('./chatHistoryStorage').catch(() => ({ saveChatHistory: null }))
      if (saveChatHistory) {
        await saveChatHistory(history)
        result.chatsImported++
      }
    } catch (err) {
      result.errors.push(`${path}: ${String(err)}`)
    }
  }

  return result
}
```

- [ ] **Step 3: Check that `saveDocument` exists in `documentStorage.ts`**

```bash
grep -n "saveDocument\|export.*function" src/services/documentStorage.ts | head -20
```

If the function is named differently (e.g., `upsertDocument`), update the import accordingly.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors (the dynamic import of `chatHistoryStorage` may show a warning if the file doesn't exist yet — that's acceptable).

- [ ] **Step 5: Commit**

```bash
git add src/services/backupService.ts
git commit -m "feat: backupService — ZIP export/import of documents and chat histories"
```

---

### Task 2: `SettingsModal` component

**Files:**
- Create: `src/components/ui/SettingsModal.tsx`

**Context:** A centered modal overlay with three sections: Datos (backup/restore), Historial de Chat (limit selector), and Seguridad (PIN — placeholder for the PIN feature). Uses `exportBackup` and `importBackup`. Shows spinner and result messages inline.

- [ ] **Step 1: Create `SettingsModal.tsx`**

```tsx
// src/components/ui/SettingsModal.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import Button from './Button'
import type { ScannedDocument } from '@/types/document'
import { exportBackup, importBackup, type ImportResult } from '@/services/backupService'

const CHAT_LIMIT_OPTIONS = [
  { value: 10, label: '10' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: Infinity, label: '∞' },
]

const CHAT_LIMIT_KEY = 'papeleo_chat_limit'

function getChatLimit(): number {
  if (typeof window === 'undefined') return 25
  const stored = localStorage.getItem(CHAT_LIMIT_KEY)
  if (stored === 'Infinity') return Infinity
  const n = Number(stored)
  return isNaN(n) ? 25 : n
}

interface Props {
  documents: ScannedDocument[]
  onClose: () => void
  onImportComplete: () => void
}

export default function SettingsModal({ documents, onClose, onImportComplete }: Props) {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [chatLimit, setChatLimit] = useState<number>(getChatLimit)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleExport = async () => {
    setExporting(true)
    try { await exportBackup(documents) } finally { setExporting(false) }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImportResult(null)
    setImportError(null)
    setImporting(true)
    try {
      const result = await importBackup(file)
      setImportResult(result)
      onImportComplete()
    } catch (err) {
      setImportError(String(err).replace('Error: ', ''))
    } finally {
      setImporting(false)
    }
  }

  const handleChatLimitChange = (value: number) => {
    setChatLimit(value)
    localStorage.setItem(CHAT_LIMIT_KEY, value === Infinity ? 'Infinity' : String(value))
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/7">
          <h2 className="text-sm font-semibold text-ink">Ajustes</h2>
          <button onClick={onClose} className="text-dim hover:text-ink transition-colors" aria-label="Cerrar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Datos section */}
          <section className="space-y-3">
            <p className="section-label">Datos</p>

            <div className="space-y-1">
              <Button variant="ghost" onClick={handleExport} spinning={exporting} disabled={exporting} className="w-full py-2 text-xs justify-start">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {exporting ? 'Generando backup…' : 'Exportar backup'}
              </Button>
              <p className="text-xs text-dim/60 px-1">Descarga un ZIP con todos tus documentos</p>
            </div>

            <div className="space-y-1">
              <Button variant="ghost" onClick={() => fileInputRef.current?.click()} spinning={importing} disabled={importing} className="w-full py-2 text-xs justify-start">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {importing ? 'Importando…' : 'Importar backup'}
              </Button>
              <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={handleImportFile} />
              <p className="text-xs text-dim/60 px-1">Restaura desde un backup .zip de Papeleo</p>
            </div>

            {importResult && (
              <div className="px-3 py-2 rounded-xl bg-ok/10 border border-ok/20 text-xs text-ok">
                {importResult.docsImported} documento{importResult.docsImported !== 1 ? 's' : ''} importado{importResult.docsImported !== 1 ? 's' : ''}
                {importResult.chatsImported > 0 && `, ${importResult.chatsImported} conversaciones`}
                {importResult.errors.length > 0 && ` · ${importResult.errors.length} errores`}
              </div>
            )}

            {importError && (
              <div className="px-3 py-2 rounded-xl bg-err/10 border border-err/20 text-xs text-err">
                {importError}
              </div>
            )}
          </section>

          {/* Chat limit section */}
          <section className="space-y-3">
            <p className="section-label">Historial de Chat</p>
            <div className="space-y-2">
              <p className="text-xs text-dim">Conversaciones guardadas</p>
              <div className="flex gap-1.5">
                {CHAT_LIMIT_OPTIONS.map(({ value, label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleChatLimitChange(value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      chatLimit === value
                        ? 'bg-accent/15 border-accent/30 text-accent'
                        : 'border-white/10 text-dim hover:text-ink hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>
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
git add src/components/ui/SettingsModal.tsx
git commit -m "feat: SettingsModal — backup/restore + chat limit selector"
```

---

### Task 3: Wire `SettingsModal` into `App.tsx`

**Files:**
- Modify: `src/components/App.tsx`

**Context:** Add `settingsOpen` state, a ⚙ button in the header, and render `SettingsModal`. `onImportComplete` calls `refreshDocuments` (already exposed by `useDocuments`).

- [ ] **Step 1: Check what `useDocuments` returns**

```bash
grep -n "return {" src/hooks/useDocuments.ts
```

Note whether a `refresh` or `refreshDocuments` function is exposed.

- [ ] **Step 2: Update `App.tsx`**

1. Import:
```tsx
import SettingsModal from '@/components/ui/SettingsModal'
```

2. Add state:
```tsx
const [settingsOpen, setSettingsOpen] = useState(false)
```

3. Add ⚙ button in the header (after the search button):
```tsx
<button
  onClick={() => setSettingsOpen(true)}
  aria-label="Ajustes"
  className="p-2 rounded-lg hover:bg-white/5 transition-colors text-dim hover:text-ink flex-shrink-0"
>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
</button>
```

4. Add modal just before the closing `</div>` of the root:
```tsx
{settingsOpen && (
  <SettingsModal
    documents={documents}
    onClose={() => setSettingsOpen(false)}
    onImportComplete={() => {
      // Refresh documents list after import
      // Call the refresh function from useDocuments if available, or reload
      window.location.reload()
    }}
  />
)}
```

(If `useDocuments` exposes a `refresh()` function, use that instead of `window.location.reload()`.)

- [ ] **Step 3: Type-check and build**

```bash
npx tsc --noEmit && npm run build
```

Expected: 0 errors, clean build.

- [ ] **Step 4: Commit**

```bash
git add src/components/App.tsx
git commit -m "feat: Settings modal wired in App — gear icon in header"
```
