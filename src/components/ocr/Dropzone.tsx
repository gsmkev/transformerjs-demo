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
}

export default function Dropzone({ isDragOver, fileTypeError, onFile, dragHandlers, fileInputRef }: Props) {
  const open = () => fileInputRef.current?.click()

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open()
    }
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
        className={`cursor-pointer rounded-xl border-2 border-dashed transition-colors p-8 flex flex-col items-center justify-center gap-2 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          isDragOver ? 'border-accent bg-accent/10' : 'border-rim hover:border-accent/60'
        }`}
      >
        <span className="text-3xl" aria-hidden="true">🖼️</span>
        <p className="text-sm text-dim">
          Drop an image here, or <span className="text-accent">browse</span>
        </p>
        <p className="text-xs text-dim/60">PNG, JPG, WEBP, BMP…</p>
        <input
          ref={fileInputRef as Ref<HTMLInputElement>}
          type="file"
          accept="image/*"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
          }}
        />
      </div>

      {fileTypeError && (
        <p role="alert" className="text-xs text-err">{fileTypeError}</p>
      )}
    </div>
  )
}
