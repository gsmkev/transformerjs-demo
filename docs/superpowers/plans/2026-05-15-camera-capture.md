# Camera Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mobile-only "Tomar foto" button in the Dropzone and a "Escanear con cámara" quick action in the Dashboard, both opening the device's rear camera via the native file picker.

**Architecture:** A `cameraInputRef` (plain `RefObject<HTMLInputElement>`) is created in `App.tsx` and threaded down through `OcrView` → `Dropzone`, where it's attached to a hidden `<input capture="environment">`. `DashboardView` receives an `onCameraCapture` callback that navigates to the OCR tab and then programmatically clicks the camera input after the tab-switch animation completes (150ms delay).

**Tech Stack:** React refs (`useRef`), `forwardRef` not needed — plain prop-passed ref. No new dependencies. TypeScript strict mode. Tailwind `sm:hidden`.

---

## File Map

| File | Change |
|------|--------|
| `src/components/ocr/Dropzone.tsx` | Add `cameraInputRef` prop + hidden camera input + "Tomar foto" button (`sm:hidden`) |
| `src/components/ocr/OcrView.tsx` | Add `cameraInputRef` prop, thread it to `<Dropzone>` |
| `src/components/dashboard/DashboardView.tsx` | Add `onCameraCapture` prop + "Escanear con cámara" button (`sm:hidden`) |
| `src/components/App.tsx` | Create `dropzoneCameraRef`, implement `handleCameraCapture`, wire to both components |

---

## Task 1: Dropzone — camera input + button

**Files:**
- Modify: `src/components/ocr/Dropzone.tsx`

- [ ] **Step 1: Add `cameraInputRef` to Props and render the hidden camera input**

Replace the entire file content with:

```tsx
import { useRef } from 'react'
import type { DragEvent, KeyboardEvent, Ref, RefObject } from 'react'

interface Props {
  isDragOver: boolean
  fileTypeError: string | null
  onFile: (f: File) => void
  dragHandlers: {
    onDragOver: (e: DragEvent) => void
    onDragLeave: () => void
    onDrop: (e: DragEvent) => void
  }
  fileInputRef: RefObject<HTMLInputElement | null>
  cameraInputRef?: RefObject<HTMLInputElement | null>
}

export default function Dropzone({ isDragOver, fileTypeError, onFile, dragHandlers, fileInputRef, cameraInputRef }: Props) {
  const open = () => fileInputRef.current?.click()

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() }
  }

  return (
    <div className="space-y-2">
      <div
        {...dragHandlers}
        onClick={open}
        onKeyDown={onKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Upload image for OCR — click or drag and drop"
        className={`cursor-pointer rounded-2xl border-2 border-dashed transition-all p-10 flex flex-col items-center justify-center gap-3 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
          isDragOver
            ? 'border-accent bg-accent/8 shadow-accent-glow'
            : 'border-white/12 hover:border-accent/50 hover:bg-white/3'
        }`}
      >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
          isDragOver ? 'bg-accent/20 text-accent' : 'bg-white/5 text-dim'
        }`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <div>
          <p className="text-sm text-ink/80">Drop an image here, or <span className="text-accent font-medium">browse</span></p>
          <p className="text-xs text-dim/60 mt-1">PNG, JPG, WEBP, BMP, TIFF</p>
        </div>
        <input
          ref={fileInputRef as Ref<HTMLInputElement>}
          type="file"
          accept="image/*"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
        />
        {/* Hidden camera input — mobile only, attached via ref from App.tsx */}
        <input
          ref={cameraInputRef as Ref<HTMLInputElement>}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
        />
      </div>

      {/* Camera button — mobile only */}
      {cameraInputRef && (
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="sm:hidden w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-dim hover:text-ink hover:bg-white/5 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          Tomar foto
        </button>
      )}

      {fileTypeError && (
        <div className="flex items-center gap-1.5 text-xs text-err">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p role="alert">{fileTypeError}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors (or only pre-existing errors unrelated to Dropzone — Dropzone itself must be clean).

---

## Task 2: OcrView — thread `cameraInputRef` to Dropzone

**Files:**
- Modify: `src/components/ocr/OcrView.tsx`

- [ ] **Step 1: Add `cameraInputRef` prop to OcrView and pass to Dropzone**

```tsx
import type { EngineStateMap, OcrResult } from '@/types/ocr'
import type { RefObject } from 'react'
import EngineSelector from './EngineSelector'
import Dropzone from './Dropzone'
import ImagePreview from './ImagePreview'
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
  cameraInputRef?: RefObject<HTMLInputElement | null>
}

export default function OcrView({
  selectedId, engineStates, onSelectEngine, imageLoader,
  ocrResult, ocrError, ocrRunning, onRunOcr, onSave, saving,
  cameraInputRef,
}: Props) {
  const { file, dataUrl, isDragOver, fileTypeError, loadFile, clearImage, dragHandlers, fileInputRef } = imageLoader
  const engineReady = engineStates[selectedId]?.status === 'ready'

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

          {dataUrl ? (
            <ImagePreview dataUrl={dataUrl} onClear={clearImage} />
          ) : (
            <Dropzone
              isDragOver={isDragOver}
              fileTypeError={fileTypeError}
              onFile={loadFile}
              dragHandlers={dragHandlers}
              fileInputRef={fileInputRef}
              cameraInputRef={cameraInputRef}
            />
          )}

          <Button onClick={onRunOcr} disabled={!file || !engineReady || ocrRunning} spinning={ocrRunning} className="w-full py-2.5">
            {ocrRunning ? 'Procesando…' : 'Ejecutar OCR'}
          </Button>

          {ocrResult && (
            <Button variant="ghost" onClick={onSave} disabled={saving} spinning={saving} className="w-full py-2.5">
              {saving ? 'Guardando…' : 'Guardar en biblioteca'}
            </Button>
          )}
        </div>

        {/* Right column: result — sticky on desktop */}
        <div className="lg:sticky lg:top-[110px]">
          <ResultPanel result={ocrResult} error={ocrError} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 3: DashboardView — "Escanear con cámara" button

**Files:**
- Modify: `src/components/dashboard/DashboardView.tsx`

- [ ] **Step 1: Add `onCameraCapture` prop and camera button to quick actions**

In `DashboardView.tsx`, update the Props interface and the quick actions section:

```tsx
interface Props {
  documents: ScannedDocument[]
  onNavigate: (tab: Tab) => void
  onCameraCapture: () => void
}
```

In the quick actions section at the bottom of the component (find the `<div className="flex gap-3 flex-wrap">` block), add the camera button:

```tsx
{/* Quick actions */}
<div className="flex gap-3 flex-wrap">
  <Button onClick={() => onNavigate('ocr')} className="flex-1">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <rect x="7" y="7" width="10" height="10" rx="1"/>
    </svg>
    Escanear
  </Button>
  <Button variant="ghost" onClick={onCameraCapture} className="sm:hidden flex-1">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
    Cámara
  </Button>
  <Button variant="ghost" onClick={() => onNavigate('rag')} className="flex-1">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
    Buscar con IA
  </Button>
</div>
```

Also update the empty state quick action — the `onCameraCapture` prop exists on the component so it's already available if needed in the empty state path too. The empty state currently only has "Escanear primer documento" which is fine as-is.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors (App.tsx will error on missing prop until Task 4 — acceptable at this stage).

---

## Task 4: App.tsx — wire `dropzoneCameraRef` and `handleCameraCapture`

**Files:**
- Modify: `src/components/App.tsx`

- [ ] **Step 1: Add `dropzoneCameraRef` and `handleCameraCapture`**

At the top of the `App` function body, after the existing refs/state, add:

```tsx
const dropzoneCameraRef = useRef<HTMLInputElement>(null)

const handleCameraCapture = useCallback(() => {
  handleTabChange('ocr')
  setTimeout(() => dropzoneCameraRef.current?.click(), 150)
}, [handleTabChange])
```

- [ ] **Step 2: Pass `cameraInputRef` to OcrView**

Find the `<OcrView` render and add the prop:

```tsx
<OcrView
  selectedId={selectedId}
  engineStates={engineStates}
  onSelectEngine={setSelectedId}
  imageLoader={imageLoader}
  ocrResult={ocr.result}
  ocrError={ocr.error}
  ocrRunning={ocr.running}
  onRunOcr={() => imageLoader.file && ocr.execute(imageLoader.file)}
  onSave={handleSave}
  saving={saving}
  cameraInputRef={dropzoneCameraRef}
/>
```

- [ ] **Step 3: Pass `onCameraCapture` to DashboardView**

Find the `<DashboardView` render and add the prop:

```tsx
<DashboardView documents={documents} onNavigate={handleTabChange} onCameraCapture={handleCameraCapture} />
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Build check**

```bash
npm run build 2>&1 | tail -15
```

Expected: clean build, no type errors, route `/` listed.

- [ ] **Step 6: Commit and push**

```bash
git add src/components/ocr/Dropzone.tsx src/components/ocr/OcrView.tsx src/components/dashboard/DashboardView.tsx src/components/App.tsx
git commit -m "$(cat <<'EOF'
feat: add mobile camera capture in Dropzone and Dashboard

- Dropzone: hidden <input capture="environment"> + "Tomar foto" button (sm:hidden)
- OcrView: thread cameraInputRef prop to Dropzone
- DashboardView: "Cámara" quick action button (sm:hidden)
- App: dropzoneCameraRef + handleCameraCapture (navigate to OCR + trigger input after 150ms)

https://claude.ai/code/session_01JkRdeFXggc9j5VmzCCREtY
EOF
)"
git push -u origin claude/local-ocr-webapp-NowwS
```

---

## Self-Review

**Spec coverage:**
- ✅ `<input capture="environment">` hidden in Dropzone
- ✅ "Tomar foto" button `sm:hidden` in Dropzone
- ✅ Reuses `onFile` handler — no changes to `useImageLoader`
- ✅ Same flow as file upload (ImagePreview, OCR ready)
- ✅ Dashboard "Escanear con cámara" button `sm:hidden`
- ✅ `onCameraCapture` prop on DashboardView
- ✅ `dropzoneCameraRef` in App.tsx
- ✅ `setTimeout(150)` for tab animation before camera trigger
- ✅ Not visible on desktop (`sm:hidden`)

**No-goals confirmed not implemented:**
- ✅ No front camera
- ✅ No special preview — uses existing ImagePreview
- ✅ No batch OCR integration
