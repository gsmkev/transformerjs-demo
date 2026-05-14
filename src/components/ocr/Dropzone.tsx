import type { DragEvent, Ref, RefObject } from 'react'

interface Props {
  isDragOver: boolean
  onFile: (f: File) => void
  dragHandlers: {
    onDragOver: (e: DragEvent) => void
    onDragLeave: () => void
    onDrop: (e: DragEvent) => void
  }
  fileInputRef: RefObject<HTMLInputElement | null>
}

export default function Dropzone({ isDragOver, onFile, dragHandlers, fileInputRef }: Props) {
  return (
    <div
      {...dragHandlers}
      onClick={() => fileInputRef.current?.click()}
      className={`cursor-pointer rounded-xl border-2 border-dashed transition-colors p-8 flex flex-col items-center justify-center gap-2 text-center ${
        isDragOver ? 'border-accent bg-accent/10' : 'border-rim hover:border-accent/60'
      }`}
    >
      <span className="text-3xl">🖼️</span>
      <p className="text-sm text-dim">
        Drop an image here, or <span className="text-accent">browse</span>
      </p>
      <p className="text-xs text-dim/60">PNG, JPG, WEBP, BMP…</p>
      <input
        ref={fileInputRef as Ref<HTMLInputElement>}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
        }}
      />
    </div>
  )
}
