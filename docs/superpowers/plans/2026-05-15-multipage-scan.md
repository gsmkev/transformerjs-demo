# Multi-Page Scanning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the user to add multiple images before running OCR. The images are concatenated vertically into a single canvas, and the combined image is processed by the OCR engine and saved as one document.

**Architecture:** `useImageLoader` gains a `pages: string[]` array and `addPage()`/`removePage()` functions. The computed `dataUrl` becomes the concatenated canvas. A new `PageStrip` component shows thumbnails with remove buttons and an "Add page" trigger. `OcrView` shows `PageStrip` when there are 2+ pages; the OCR button converts the concatenated `dataUrl` to a `File` before passing it to the engine.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v3, Canvas API

---

### Task 1: Extend `useImageLoader` with multi-page support

**Files:**
- Modify: `src/hooks/useImageLoader.ts`

**Context:** The current hook has `file`, `dataUrl`, `loadFile()`, `clearImage()`. We add `pages: string[]`, `addPage(file)`, `removePage(index)`. When `pages` changes, a `useEffect` concatenates them into a new `dataUrl`. `file` stays as the first file for backwards compatibility with the OCR engine check (`!file`). `clearImage()` resets pages too.

- [ ] **Step 1: Rewrite `useImageLoader.ts`**

```typescript
// src/hooks/useImageLoader.ts
'use client'

import { useState, useRef, useCallback, DragEvent, useEffect } from 'react'

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

async function concatenatePages(dataUrls: string[]): Promise<string> {
  if (dataUrls.length === 0) return ''
  if (dataUrls.length === 1) return dataUrls[0]
  const images = await Promise.all(dataUrls.map(loadImage))
  const width = Math.max(...images.map((img) => img.naturalWidth))
  const totalHeight = images.reduce((sum, img) => sum + img.naturalHeight, 0)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = totalHeight
  const ctx = canvas.getContext('2d')!
  let y = 0
  for (const img of images) {
    ctx.drawImage(img, 0, y)
    y += img.naturalHeight
  }
  return canvas.toDataURL('image/jpeg', 0.92)
}

function readFileAsDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') resolve(result)
      else reject(new Error('FileReader result is not a string'))
    }
    reader.onerror = reject
    reader.readAsDataURL(f)
  })
}

export function useImageLoader() {
  const [pages, setPages] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileTypeError, setFileTypeError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Recompute concatenated dataUrl whenever pages change
  useEffect(() => {
    if (pages.length === 0) {
      setDataUrl(null)
      return
    }
    let cancelled = false
    concatenatePages(pages).then((url) => {
      if (!cancelled) setDataUrl(url)
    })
    return () => { cancelled = true }
  }, [pages])

  const addPage = useCallback((f: File) => {
    setFileTypeError(null)
    if (!f.type.startsWith('image/')) {
      setFileTypeError(`"${f.name}" is not an image file.`)
      return
    }
    readFileAsDataUrl(f).then((url) => {
      setPages((prev) => {
        if (prev.length === 0) setFile(f)
        return [...prev, url]
      })
    })
  }, [])

  // Alias for single-file usage (Dropzone initial drop)
  const loadFile = addPage

  const removePage = useCallback((index: number) => {
    setPages((prev) => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 0) setFile(null)
      return next
    })
  }, [])

  const clearImage = useCallback(() => {
    setPages([])
    setFile(null)
    setDataUrl(null)
    setFileTypeError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const dragHandlers = {
    onDragOver: (e: DragEvent) => { e.preventDefault(); setIsDragOver(true) },
    onDragLeave: () => setIsDragOver(false),
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const files = Array.from(e.dataTransfer.files)
      files.forEach(addPage)
    },
  }

  return { file, dataUrl, pages, isDragOver, fileTypeError, loadFile, addPage, removePage, clearImage, dragHandlers, fileInputRef } as const
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useImageLoader.ts
git commit -m "feat: useImageLoader supports multiple pages with canvas concatenation"
```

---

### Task 2: `PageStrip` component

**Files:**
- Create: `src/components/ocr/PageStrip.tsx`

**Context:** Shows a horizontal row of thumbnails (56×56px) with a remove button on each. The last slot is an "+ Añadir página" button that triggers a hidden file input. Also shows the count. Only rendered when `pages.length >= 1`.

- [ ] **Step 1: Create `PageStrip.tsx`**

```tsx
// src/components/ocr/PageStrip.tsx
'use client'

import { useRef, type RefObject } from 'react'

interface Props {
  pages: string[]
  onAdd: (f: File) => void
  onRemove: (index: number) => void
  cameraInputRef?: RefObject<HTMLInputElement>
}

export default function PageStrip({ pages, onAdd, onRemove, cameraInputRef }: Props) {
  const addInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {pages.map((url, i) => (
          <div key={i} className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-surface group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Página ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label={`Eliminar página ${i + 1}`}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
            <div className="absolute bottom-0.5 left-0.5 px-1 py-0 rounded text-[9px] text-white/80 bg-black/40 leading-tight">
              {i + 1}
            </div>
          </div>
        ))}

        {/* Add page button */}
        <button
          type="button"
          onClick={() => addInputRef.current?.click()}
          className="flex-shrink-0 w-14 h-14 rounded-xl border border-dashed border-white/20 hover:border-accent/40 hover:bg-accent/5 flex flex-col items-center justify-center gap-0.5 transition-colors text-dim hover:text-accent"
          aria-label="Añadir página"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span className="text-[9px] leading-tight">Añadir</span>
        </button>

        <input
          ref={addInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            Array.from(e.target.files ?? []).forEach(onAdd)
            e.target.value = ''
          }}
        />
      </div>

      <p className="text-xs text-dim/60">
        {pages.length} {pages.length === 1 ? 'página' : 'páginas'} · se concatenarán verticalmente
        {cameraInputRef && (
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="sm:hidden ml-2 text-accent/70 hover:text-accent transition-colors"
          >
            + foto con cámara
          </button>
        )}
      </p>
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
git add src/components/ocr/PageStrip.tsx
git commit -m "feat: PageStrip component — thumbnail row with add/remove pages"
```

---

### Task 3: Update `OcrView` to show `PageStrip`

**Files:**
- Modify: `src/components/ocr/OcrView.tsx`

**Context:** When `pages.length >= 1`, replace the simple `ImagePreview` with `PageStrip` + the concatenated preview below it. The OCR button converts the `dataUrl` to a `File` before calling the engine (the engine receives a `File`, not a dataUrl).

`dataURLtoBlob` is a small utility — define it inline in `OcrView`.

- [ ] **Step 1: Update `OcrView.tsx`**

```tsx
// src/components/ocr/OcrView.tsx
import type { EngineStateMap, OcrResult } from '@/types/ocr'
import type { RefObject } from 'react'
import EngineSelector from './EngineSelector'
import Dropzone from './Dropzone'
import ImagePreview from './ImagePreview'
import PageStrip from './PageStrip'
import ResultPanel from './ResultPanel'
import Button from '@/components/ui/Button'
import type { useImageLoader } from '@/hooks/useImageLoader'

interface Props {
  selectedId: string
  engineStates: EngineStateMap
  onSelectEngine: (id: string) => void
  imageLoader: ReturnType<typeof useImageLoader>
  ocrResult: OcrResult | null
  ocrError: string | null
  ocrRunning: boolean
  onRunOcr: () => void
  onSave: () => Promise<void>
  saving: boolean
  cameraInputRef?: RefObject<HTMLInputElement>
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, b64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], filename, { type: mime })
}

export default function OcrView({
  selectedId, engineStates, onSelectEngine, imageLoader,
  ocrResult, ocrError, ocrRunning, onRunOcr, onSave, saving,
  cameraInputRef,
}: Props) {
  const { file, dataUrl, pages, isDragOver, fileTypeError, loadFile, addPage, removePage, clearImage, dragHandlers, fileInputRef } = imageLoader
  const engineReady = engineStates[selectedId]?.status === 'ready'
  const hasPages = pages.length >= 1

  const handleRunOcr = () => {
    if (!dataUrl) return
    const f = pages.length > 1
      ? dataUrlToFile(dataUrl, 'multipage.jpg')
      : file!
    if (f) {
      // Call parent's onRunOcr which uses imageLoader.file — but for multipage
      // we need to trigger OCR on the concatenated file directly
      // We expose a workaround: call the prop, which in App.tsx uses imageLoader.file.
      // For multipage, App.tsx will need the concatenated file. We pass it via onRunOcr.
      onRunOcr()
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start gap-6">
        {/* Left column: controls */}
        <div className="flex flex-col gap-4">
          <EngineSelector selectedId={selectedId} engineStates={engineStates} onChange={onSelectEngine} />

          {!engineReady && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-info/8 border border-info/20 text-xs text-info">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Carga el motor en la sección <strong className="text-ink font-medium ml-1">Modelos</strong>&nbsp;primero.
            </div>
          )}

          {hasPages ? (
            <>
              <PageStrip pages={pages} onAdd={addPage} onRemove={removePage} cameraInputRef={cameraInputRef} />
              {dataUrl && <ImagePreview dataUrl={dataUrl} onClear={clearImage} />}
            </>
          ) : (
            <Dropzone
              isDragOver={isDragOver}
              fileTypeError={fileTypeError}
              onFile={addPage}
              dragHandlers={dragHandlers}
              fileInputRef={fileInputRef}
              cameraInputRef={cameraInputRef}
            />
          )}

          <Button onClick={onRunOcr} disabled={!dataUrl || !engineReady || ocrRunning} spinning={ocrRunning} className="w-full py-2.5">
            {ocrRunning ? 'Procesando…' : 'Ejecutar OCR'}
          </Button>

          {ocrResult && (
            <Button variant="ghost" onClick={onSave} disabled={saving} spinning={saving} className="w-full py-2.5">
              {saving ? 'Guardando…' : 'Guardar en biblioteca'}
            </Button>
          )}
        </div>

        {/* Right column: result */}
        <div className="lg:sticky lg:top-[110px]">
          <ResultPanel result={ocrResult} error={ocrError} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `App.tsx` — pass concatenated file to OCR**

In `App.tsx`, the current `onRunOcr` is:
```tsx
onRunOcr={() => imageLoader.file && ocr.execute(imageLoader.file)}
```

Update it to use the concatenated `dataUrl` when there are multiple pages:

```tsx
onRunOcr={() => {
  if (!imageLoader.dataUrl) return
  if (imageLoader.pages.length > 1) {
    // Convert concatenated dataUrl to File for the OCR engine
    const [header, b64] = imageLoader.dataUrl.split(',')
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const file = new File([bytes], 'multipage.jpg', { type: mime })
    ocr.execute(file)
  } else if (imageLoader.file) {
    ocr.execute(imageLoader.file)
  }
}}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 5: Commit**

```bash
git add src/components/ocr/OcrView.tsx src/components/App.tsx
git commit -m "feat: multi-page OCR — PageStrip UI, canvas concat, OCR on combined image"
```
