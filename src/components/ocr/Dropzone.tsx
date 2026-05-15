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
  cameraInputRef?: RefObject<HTMLInputElement>
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
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { onFile(f); e.target.value = '' } }}
        />
      </div>

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
