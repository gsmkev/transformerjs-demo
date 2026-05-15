# Image Preprocessing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a preprocessing panel in the OCR view that lets users adjust brightness, contrast, and rotation of the loaded image before running OCR. A "Reset" button restores the original. The adjusted image (not the original) is used for OCR and saved.

**Architecture:** `preprocessImage(dataUrl, opts)` in `src/lib/imagePreprocessing.ts` applies CSS-filter-equivalent transforms via Canvas 2D API. `ImagePreprocessingPanel` is a self-contained component with three sliders and a live preview. It receives the original `dataUrl` and calls `onProcessed(adjustedDataUrl)` when sliders change. `OcrView` shows the panel when an image is loaded in single-file mode; `App.tsx` passes the adjusted data URL to the save handler.

**Tech Stack:** TypeScript, React, Canvas 2D API, Tailwind CSS v3

---

## File Map

| File | Action |
|------|--------|
| `src/lib/imagePreprocessing.ts` | **Create** — `preprocessImage(dataUrl, opts)` |
| `src/components/ocr/ImagePreprocessingPanel.tsx` | **Create** — sliders UI + live preview |
| `src/hooks/useImageLoader.ts` | Modify — expose `adjustedDataUrl` + `setAdjustedDataUrl` |
| `src/components/ocr/OcrView.tsx` | Modify — render preprocessing panel |
| `src/components/App.tsx` | Modify — use `adjustedDataUrl` for OCR and save |

---

### Task 1: imagePreprocessing utility

**Files:**
- Create: `src/lib/imagePreprocessing.ts`

- [ ] **Step 1: Create the preprocessing utility**

```typescript
// src/lib/imagePreprocessing.ts

export interface PreprocessOptions {
  brightness: number  // 0–200, default 100 (= 1.0x)
  contrast:   number  // 0–200, default 100 (= 1.0x)
  rotation:   number  // -180 to 180 degrees, default 0
}

export const DEFAULT_PREPROCESS: PreprocessOptions = {
  brightness: 100,
  contrast:   100,
  rotation:   0,
}

export function isDefaultPreprocess(opts: PreprocessOptions): boolean {
  return opts.brightness === 100 && opts.contrast === 100 && opts.rotation === 0
}

export async function preprocessImage(
  dataUrl: string,
  opts: PreprocessOptions,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const radians = (opts.rotation * Math.PI) / 180
      const sin = Math.abs(Math.sin(radians))
      const cos = Math.abs(Math.cos(radians))
      const rotatedWidth  = img.naturalWidth  * cos + img.naturalHeight * sin
      const rotatedHeight = img.naturalWidth  * sin + img.naturalHeight * cos

      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(rotatedWidth)
      canvas.height = Math.round(rotatedHeight)

      const ctx = canvas.getContext('2d')!
      ctx.filter = `brightness(${opts.brightness}%) contrast(${opts.contrast}%)`
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(radians)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)

      resolve(canvas.toDataURL('image/jpeg', 0.92))
      canvas.width = 0
    }
    img.onerror = reject
    img.src = dataUrl
  })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit utility**

```bash
git add src/lib/imagePreprocessing.ts
git commit -m "feat: imagePreprocessing utility — brightness, contrast, rotation via Canvas"
```

---

### Task 2: ImagePreprocessingPanel component

**Files:**
- Create: `src/components/ocr/ImagePreprocessingPanel.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/ocr/ImagePreprocessingPanel.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { preprocessImage, DEFAULT_PREPROCESS, isDefaultPreprocess } from '@/lib/imagePreprocessing'
import type { PreprocessOptions } from '@/lib/imagePreprocessing'

interface Props {
  originalDataUrl: string
  onProcessed: (dataUrl: string) => void
}

function Slider({
  label, value, min, max, defaultVal, onChange,
}: {
  label: string; value: number; min: number; max: number; defaultVal: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-dim w-20 flex-shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-accent"
      />
      <span className="text-xs font-mono text-dim/70 w-10 text-right">{value}</span>
      {value !== defaultVal && (
        <button
          type="button"
          onClick={() => onChange(defaultVal)}
          className="text-xs text-dim/40 hover:text-accent transition-colors"
          aria-label={`Reset ${label}`}
        >
          ↺
        </button>
      )}
    </div>
  )
}

export default function ImagePreprocessingPanel({ originalDataUrl, onProcessed }: Props) {
  const [opts, setOpts] = useState<PreprocessOptions>(DEFAULT_PREPROCESS)
  const [processing, setProcessing] = useState(false)

  const apply = useCallback(async (o: PreprocessOptions) => {
    if (isDefaultPreprocess(o)) {
      onProcessed(originalDataUrl)
      return
    }
    setProcessing(true)
    try {
      const result = await preprocessImage(originalDataUrl, o)
      onProcessed(result)
    } finally {
      setProcessing(false)
    }
  }, [originalDataUrl, onProcessed])

  // Debounce: apply 200ms after the user stops moving a slider
  useEffect(() => {
    const id = setTimeout(() => apply(opts), 200)
    return () => clearTimeout(id)
  }, [opts, apply])

  const update = (key: keyof PreprocessOptions) => (v: number) =>
    setOpts((prev) => ({ ...prev, [key]: v }))

  const reset = () => setOpts(DEFAULT_PREPROCESS)
  const isDefault = isDefaultPreprocess(opts)

  return (
    <div className="space-y-2 px-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-dim/70 font-medium">Ajuste de imagen</p>
        {!isDefault && (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-dim/50 hover:text-accent transition-colors"
          >
            Restablecer
          </button>
        )}
        {processing && (
          <span className="text-xs text-info/70">Procesando…</span>
        )}
      </div>
      <Slider label="Brillo"    value={opts.brightness} min={0}    max={200} defaultVal={100} onChange={update('brightness')} />
      <Slider label="Contraste" value={opts.contrast}   min={0}    max={200} defaultVal={100} onChange={update('contrast')}   />
      <Slider label="Rotación"  value={opts.rotation}   min={-180} max={180} defaultVal={0}   onChange={update('rotation')}   />
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
git add src/components/ocr/ImagePreprocessingPanel.tsx
git commit -m "feat: ImagePreprocessingPanel — brightness/contrast/rotation sliders"
```

---

### Task 3: Wire preprocessing into OcrView and App.tsx

**Files:**
- Modify: `src/components/ocr/OcrView.tsx`
- Modify: `src/components/App.tsx`

- [ ] **Step 1: Add adjustedDataUrl state to useImageLoader**

In `src/hooks/useImageLoader.ts`, add:

```typescript
const [adjustedDataUrl, setAdjustedDataUrl] = useState<string | null>(null)
```

In the `useEffect` that computes `dataUrl` from pages, also reset `adjustedDataUrl` when pages change:

```typescript
useEffect(() => {
  if (pages.length === 0) {
    setDataUrl(null)
    setAdjustedDataUrl(null)
    return
  }
  // ... existing concatenatePages logic ...
  // After setting dataUrl, also reset adjustedDataUrl:
  concatenatePages(pages).then((url) => {
    if (!cancelled) {
      setDataUrl(url)
      setAdjustedDataUrl(null) // reset adjusted when source changes
    }
  }).catch(...)
}, [pages])
```

Add `adjustedDataUrl, setAdjustedDataUrl` to the return value:

```typescript
return { file, dataUrl, adjustedDataUrl, setAdjustedDataUrl, pages, isDragOver, ... } as const
```

- [ ] **Step 2: Show preprocessing panel in OcrView**

In `src/components/ocr/OcrView.tsx`, import the panel:

```typescript
import ImagePreprocessingPanel from './ImagePreprocessingPanel'
```

After the `{dataUrl && <ImagePreview dataUrl={dataUrl} onClear={clearImage} />}` line (in single-file mode), add the preprocessing panel:

```tsx
{dataUrl && (
  <ImagePreprocessingPanel
    originalDataUrl={dataUrl}
    onProcessed={(adjusted) => imageLoader.setAdjustedDataUrl(adjusted)}
  />
)}
```

Note: destructure `setAdjustedDataUrl` from `imageLoader` at the top of `OcrView`:

```typescript
const { file, dataUrl, adjustedDataUrl, setAdjustedDataUrl, pages, ... } = imageLoader
```

- [ ] **Step 3: Use adjustedDataUrl in App.tsx for OCR and save**

In `App.tsx`, the `onRunOcr` prop passed to `OcrView` currently builds a `File` from `imageLoader.dataUrl`. Update to prefer `adjustedDataUrl`:

```typescript
onRunOcr={() => {
  const sourceUrl = imageLoader.adjustedDataUrl ?? imageLoader.dataUrl
  if (!sourceUrl) return
  if (imageLoader.pages.length > 1) {
    const [header, b64] = sourceUrl.split(',')
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const f = new File([bytes], 'multipage.jpg', { type: mime })
    ocr.execute(f)
  } else if (imageLoader.file) {
    // For single file, if no preprocessing applied use original file, else build from adjusted
    if (imageLoader.adjustedDataUrl && imageLoader.adjustedDataUrl !== imageLoader.dataUrl) {
      const [header, b64] = imageLoader.adjustedDataUrl.split(',')
      const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
      const binary = atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      ocr.execute(new File([bytes], imageLoader.file.name, { type: mime }))
    } else {
      ocr.execute(imageLoader.file)
    }
  }
}}
```

In `handleSave`, use `adjustedDataUrl ?? imageLoader.dataUrl` for `imageDataUrl` stored in the document:

```typescript
const handleSave = useCallback(async () => {
  const sourceUrl = imageLoader.adjustedDataUrl ?? imageLoader.dataUrl
  if (!sourceUrl || !ocr.result) return
  setSaving(true)
  try {
    const firstLine = ocr.result.text.split('\n').find((l) => l.trim()) ?? 'Sin título'
    const category = classifyDocument(ocr.result.text)
    const doc = await create({
      title: firstLine.slice(0, 80),
      imageDataUrl: sourceUrl,
      rawText: ocr.result.text,
      richText: '',
      engineId: selectedId,
      confidence: ocr.result.confidence,
      category,
    })
    setSelectedDocId(doc.id)
    handleTabChange('documents')
  } finally {
    setSaving(false)
  }
}, [imageLoader.adjustedDataUrl, imageLoader.dataUrl, ocr.result, create, selectedId, handleTabChange])
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual test**

1. Load an image in OCR view
2. The preprocessing panel appears below the image preview with Brillo/Contraste/Rotación sliders
3. Adjust brightness to 150 — image brightens with 200ms debounce
4. Adjust rotation to 5 — image rotates
5. Click "Restablecer" — sliders return to 100/100/0, image shows original
6. Run OCR — uses the preprocessed (adjusted) image
7. Save — the document card shows the preprocessed image

- [ ] **Step 6: Commit and push**

```bash
git add src/lib/imagePreprocessing.ts src/components/ocr/ImagePreprocessingPanel.tsx src/hooks/useImageLoader.ts src/components/ocr/OcrView.tsx src/components/App.tsx
git commit -m "feat: image preprocessing — brightness, contrast, rotation before OCR"
git push -u origin claude/local-ocr-webapp-NowwS
```
