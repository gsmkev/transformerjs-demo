'use client'

import { useEffect, useRef } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  onSelectImage: () => void
  onSelectAudio: () => void
}

const ImageIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
)

const AudioIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
)

export default function ScannerSheet({ open, onClose, onSelectImage, onSelectAudio }: Props) {
  const firstButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    // Lock scroll
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Move focus
    firstButtonRef.current?.focus()
    // Escape key
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const handleImage = () => { onClose(); onSelectImage() }
  const handleAudio = () => { onClose(); onSelectAudio() }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Añadir documento"
        className="relative bg-base border-t border-rim rounded-t-2xl pb-[env(safe-area-inset-bottom,16px)] animate-slide-up"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-rim" aria-hidden="true" />
        </div>

        <div className="px-4 pb-2 pt-1">
          <p className="text-sm font-semibold text-ink mb-4">Añadir documento</p>

          <div className="space-y-2">
            <button
              ref={firstButtonRef}
              type="button"
              onClick={handleImage}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface border border-rim hover:bg-surface2 active:scale-[0.98] transition-all text-left"
            >
              <span className="text-accent"><ImageIcon /></span>
              <div>
                <p className="text-sm font-medium text-ink">Imagen o PDF</p>
                <p className="text-xs text-dim mt-0.5">Desde archivos o cámara</p>
              </div>
            </button>

            <button
              type="button"
              onClick={handleAudio}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface border border-rim hover:bg-surface2 active:scale-[0.98] transition-all text-left"
            >
              <span className="text-accent"><AudioIcon /></span>
              <div>
                <p className="text-sm font-medium text-ink">Audio</p>
                <p className="text-xs text-dim mt-0.5">Transcripción con Whisper</p>
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full mt-3 py-3 text-sm text-dim hover:text-ink transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
