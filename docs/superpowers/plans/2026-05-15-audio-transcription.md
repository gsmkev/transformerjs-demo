# Audio Transcription Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users can upload or record an audio file (MP3, WAV, OGG, M4A, WebM) in the OCR tab. The app transcribes it locally using OpenAI Whisper via `@huggingface/transformers` (already installed). The transcribed text flows into the existing "Guardar en biblioteca" flow identical to OCR output.

**Architecture:** `src/services/whisperService.ts` loads `Xenova/whisper-tiny` via the Transformers.js `pipeline('automatic-speech-recognition')` API. `useAudioTranscription` hook manages model state (idle/loading/ready/error), transcription state, and the audio file. A new `AudioView` component renders the UI: a file dropzone for audio, a record button (MediaRecorder API), progress, and the transcribed text. `OcrView` gains an "Audio" mode toggle; when active, `AudioView` is shown instead of the image dropzone. The transcribed text is surfaced to `App.tsx` via an `onResult` callback, which re-uses `handleSave` after inserting the text as `ocr.result`.

**Tech Stack:** `@huggingface/transformers` (already installed), MediaRecorder API, TypeScript, React, Tailwind CSS v3

---

## File Map

| File | Action |
|------|--------|
| `src/services/whisperService.ts` | **Create** — load Whisper model + `transcribe(audioData)` |
| `src/hooks/useAudioTranscription.ts` | **Create** — model state + transcription state management |
| `src/components/audio/AudioDropzone.tsx` | **Create** — file upload + microphone record UI |
| `src/components/audio/AudioView.tsx` | **Create** — assembles AudioDropzone + result + save button |
| `src/components/ocr/OcrView.tsx` | Modify — add Audio mode toggle |
| `src/components/App.tsx` | Modify — pass audio save handler |

---

### Task 1: whisperService.ts

**Files:**
- Create: `src/services/whisperService.ts`

The Whisper pipeline expects a `Float32Array` of 16 kHz mono audio. The service converts any audio file to that format via the Web Audio API.

- [ ] **Step 1: Create the service**

```typescript
// src/services/whisperService.ts

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pipelinePromise: Promise<any> | null = null
let _isReady = false

export type WhisperStatus = 'idle' | 'loading' | 'ready' | 'error'

export function isWhisperLoaded(): boolean { return _isReady }

export async function loadWhisper(
  onProgress?: (pct: number) => void,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (!_pipelinePromise) {
    _pipelinePromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers')
      env.allowLocalModels = false
      const pipe = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress_callback: (info: any) => {
          if (typeof info?.progress === 'number') onProgress?.(Math.round(info.progress))
        },
      })
      _isReady = true
      return pipe
    })()
    _pipelinePromise.catch(() => { _pipelinePromise = null; _isReady = false })
  }
  return _pipelinePromise
}

async function decodeAudioFile(file: File): Promise<Float32Array> {
  const arrayBuffer = await file.arrayBuffer()
  const audioCtx = new AudioContext({ sampleRate: 16000 })
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  // Mix down to mono and resample to 16 kHz (already set on AudioContext)
  const channelData = audioBuffer.getChannelData(0)
  await audioCtx.close()
  return channelData
}

export async function transcribe(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const pipe = await loadWhisper(onProgress)
  const audioData = await decodeAudioFile(file)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (pipe as any)(audioData, {
    chunk_length_s: 30,
    stride_length_s: 5,
    language: null,       // auto-detect language
    task: 'transcribe',
  })
  if (typeof result?.text === 'string') return result.text.trim()
  if (Array.isArray(result)) return result.map((r: { text: string }) => r.text).join(' ').trim()
  return ''
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit service**

```bash
git add src/services/whisperService.ts
git commit -m "feat: whisperService — load Xenova/whisper-tiny + transcribe audio file"
```

---

### Task 2: useAudioTranscription hook

**Files:**
- Create: `src/hooks/useAudioTranscription.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/hooks/useAudioTranscription.ts
'use client'

import { useState, useCallback } from 'react'
import { loadWhisper, transcribe, isWhisperLoaded } from '@/services/whisperService'
import type { WhisperStatus } from '@/services/whisperService'

export function useAudioTranscription() {
  const [status, setStatus]       = useState<WhisperStatus>('idle')
  const [progress, setProgress]   = useState(0)
  const [error, setError]         = useState<string | null>(null)
  const [running, setRunning]     = useState(false)
  const [transcript, setTranscript] = useState<string | null>(null)

  const loadModel = useCallback(async () => {
    if (status === 'loading' || status === 'ready') return
    setStatus('loading')
    setError(null)
    try {
      await loadWhisper((pct) => setProgress(pct))
      setStatus('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }, [status])

  const run = useCallback(async (file: File): Promise<string | null> => {
    if (!isWhisperLoaded()) {
      setError('Carga el modelo Whisper primero.')
      return null
    }
    setRunning(true)
    setError(null)
    setTranscript(null)
    try {
      const text = await transcribe(file)
      setTranscript(text)
      return text
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return null
    } finally {
      setRunning(false)
    }
  }, [])

  const reset = useCallback(() => {
    setTranscript(null)
    setError(null)
  }, [])

  return { status, progress, error, running, transcript, loadModel, run, reset } as const
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit hook**

```bash
git add src/hooks/useAudioTranscription.ts
git commit -m "feat: useAudioTranscription hook — model lifecycle + transcription state"
```

---

### Task 3: AudioDropzone component

**Files:**
- Create: `src/components/audio/AudioDropzone.tsx`

Handles file input (accept audio/*) and microphone recording via MediaRecorder.

- [ ] **Step 1: Create the directory and component**

```bash
mkdir -p /home/user/transformerjs-demo/src/components/audio
```

```tsx
// src/components/audio/AudioDropzone.tsx
'use client'

import { useRef, useState, useCallback } from 'react'

interface Props {
  onFile: (file: File) => void
  disabled?: boolean
}

export default function AudioDropzone({ onFile, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [recording, setRecording]   = useState(false)
  const [dragOver, setDragOver]     = useState(false)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const handleFile = (f: File) => {
    if (!f.type.startsWith('audio/')) return
    onFile(f)
  }

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onFile(new File([blob], 'recording.webm', { type: 'audio/webm' }))
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      mediaRef.current = recorder
      setRecording(true)
    } catch {
      alert('No se pudo acceder al micrófono.')
    }
  }, [onFile])

  const stopRecording = useCallback(() => {
    mediaRef.current?.stop()
    mediaRef.current = null
    setRecording(false)
  }, [])

  return (
    <div className="space-y-2">
      <div
        onClick={() => !disabled && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const f = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('audio/'))
          if (f) handleFile(f)
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => { if (e.key === 'Enter') fileRef.current?.click() }}
        aria-label="Subir archivo de audio"
        className={`cursor-pointer rounded-2xl border-2 border-dashed transition-all p-10 flex flex-col items-center justify-center gap-3 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
          dragOver ? 'border-accent bg-accent/8' : 'border-white/12 hover:border-accent/50 hover:bg-white/3'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <div className="w-12 h-12 rounded-2xl bg-white/5 text-dim flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
        <div>
          <p className="text-sm text-ink/80">Suelta un audio aquí, o <span className="text-accent font-medium">selecciona archivo</span></p>
          <p className="text-xs text-dim/60 mt-1">MP3, WAV, OGG, M4A, WebM</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        disabled={disabled}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-colors ${
          recording
            ? 'border-err/30 bg-err/10 text-err hover:bg-err/15'
            : 'border-white/10 text-dim hover:text-ink hover:bg-white/5'
        } disabled:opacity-50`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={recording ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
        </svg>
        {recording ? 'Detener grabación' : 'Grabar con micrófono'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/audio/AudioDropzone.tsx
git commit -m "feat: AudioDropzone — file upload + MediaRecorder mic recording"
```

---

### Task 4: AudioView component

**Files:**
- Create: `src/components/audio/AudioView.tsx`

Assembles dropzone, model load button, progress, transcript, and save button.

- [ ] **Step 1: Create the component**

```tsx
// src/components/audio/AudioView.tsx
'use client'

import AudioDropzone from './AudioDropzone'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'
import type { useAudioTranscription } from '@/hooks/useAudioTranscription'

interface Props {
  audio: ReturnType<typeof useAudioTranscription>
  onSave: (text: string) => Promise<void>
  saving: boolean
}

export default function AudioView({ audio, onSave, saving }: Props) {
  const modelReady = audio.status === 'ready'

  return (
    <div className="flex flex-col gap-4">
      {/* Model load */}
      {audio.status !== 'ready' && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Modelo Whisper Tiny (~39 MB)</p>
            <Button
              onClick={audio.loadModel}
              spinning={audio.status === 'loading'}
              disabled={audio.status === 'loading'}
              className="py-1 px-3 text-xs"
            >
              {audio.status === 'loading' ? 'Cargando…' : 'Cargar modelo'}
            </Button>
          </div>
          {audio.status === 'loading' && <ProgressBar value={audio.progress} />}
          {audio.error && <p className="text-xs text-err/80">{audio.error}</p>}
        </div>
      )}

      <AudioDropzone
        onFile={(file) => audio.run(file)}
        disabled={!modelReady || audio.running}
      />

      {audio.running && (
        <div className="flex items-center gap-2 text-xs text-info/80">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          Transcribiendo…
        </div>
      )}

      {audio.transcript && (
        <div className="card space-y-3 animate-fade-in">
          <p className="section-label">Transcripción</p>
          <textarea
            readOnly
            value={audio.transcript}
            rows={6}
            className="w-full bg-void border border-white/7 rounded-xl px-4 py-3 text-sm text-ink/85 font-mono resize-y focus:outline-none focus:ring-1 focus:ring-accent/40 leading-relaxed"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => onSave(audio.transcript!)}
              disabled={saving}
              spinning={saving}
              className="py-1.5 px-4 text-xs"
            >
              {saving ? 'Guardando…' : 'Guardar en biblioteca'}
            </Button>
            <Button variant="ghost" onClick={audio.reset} className="py-1.5 px-3 text-xs">
              Limpiar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/audio/AudioView.tsx
git commit -m "feat: AudioView — assembles model loader, dropzone, transcript, and save"
```

---

### Task 5: Wire AudioView into OcrView and App.tsx

**Files:**
- Modify: `src/components/ocr/OcrView.tsx`
- Modify: `src/components/App.tsx`

- [ ] **Step 1: Add audio mode to OcrView**

In `src/components/ocr/OcrView.tsx`, add imports and a new prop:

```typescript
import AudioView from '@/components/audio/AudioView'
import type { useAudioTranscription } from '@/hooks/useAudioTranscription'
```

Add to the `Props` interface:

```typescript
audio: ReturnType<typeof useAudioTranscription>
onAudioSave: (text: string) => Promise<void>
audioSaving: boolean
```

Add state inside the component:

```typescript
// (This is a functional component — add useState at the top)
import { useState } from 'react'  // already imported
const [audioMode, setAudioMode] = useState(false)
```

Add a mode toggle above the EngineSelector:

```tsx
<div className="flex gap-1 p-1 bg-surface/60 rounded-xl border border-white/8 self-start">
  <button
    onClick={() => setAudioMode(false)}
    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!audioMode ? 'bg-accent/15 border border-accent/30 text-accent' : 'text-dim hover:text-ink'}`}
  >
    Imagen / PDF
  </button>
  <button
    onClick={() => setAudioMode(true)}
    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${audioMode ? 'bg-accent/15 border border-accent/30 text-accent' : 'text-dim hover:text-ink'}`}
  >
    Audio
  </button>
</div>
```

Wrap the entire left column content in a conditional:

```tsx
{audioMode ? (
  <AudioView audio={audio} onSave={onAudioSave} saving={audioSaving} />
) : (
  /* existing EngineSelector + Dropzone + BatchQueue + buttons JSX */
)}
```

- [ ] **Step 2: Update App.tsx**

In `src/components/App.tsx`:

Add import:

```typescript
import { useAudioTranscription } from '@/hooks/useAudioTranscription'
import AudioView from '@/components/audio/AudioView'
```

Add hook:

```typescript
const audio = useAudioTranscription()
const [audioSaving, setAudioSaving] = useState(false)
```

Add handler:

```typescript
const handleAudioSave = useCallback(async (text: string) => {
  setAudioSaving(true)
  try {
    const firstLine = text.split('\n').find((l) => l.trim()) ?? 'Transcripción de audio'
    const category = classifyDocument(text)
    const doc = await create({
      title: firstLine.slice(0, 80),
      imageDataUrl: '',
      rawText: text,
      richText: '',
      engineId: 'whisper-tiny',
      confidence: null,
      category,
    })
    setSelectedDocId(doc.id)
    handleTabChange('documents')
  } finally {
    setAudioSaving(false)
  }
}, [create, handleTabChange])
```

Pass to OcrView:

```tsx
<OcrView
  ...existing props...
  audio={audio}
  onAudioSave={handleAudioSave}
  audioSaving={audioSaving}
/>
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual test**

1. `npm run dev`
2. Open OCR tab, click "Audio"
3. Click "Cargar modelo" — Whisper Tiny (~39 MB) downloads
4. Drop an MP3 or record with microphone
5. Transcript appears in the textarea
6. Click "Guardar en biblioteca" — document appears in library with audio transcription text

- [ ] **Step 5: Commit and push**

```bash
git add src/components/audio/ src/components/ocr/OcrView.tsx src/components/App.tsx
git commit -m "feat: audio transcription — Whisper Tiny via Transformers.js, file upload + mic recording"
git push -u origin claude/local-ocr-webapp-NowwS
```
