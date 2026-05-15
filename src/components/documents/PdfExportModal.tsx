'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'

interface Props {
  hasImage: boolean
  onConfirm: (includeImage: boolean) => void
  onClose: () => void
}

export default function PdfExportModal({ hasImage, onConfirm, onClose }: Props) {
  const [includeImage, setIncludeImage] = useState(hasImage)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-xs shadow-xl space-y-5">
        <h2 className="text-sm font-semibold text-ink">Exportar como PDF</h2>

        {hasImage && (
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeImage}
              onChange={(e) => setIncludeImage(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            <span className="text-sm text-dim">Incluir imagen original</span>
          </label>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} className="py-1.5 px-3 text-xs">
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(includeImage)} className="py-1.5 px-3 text-xs">
            Imprimir / PDF
          </Button>
        </div>
      </div>
    </div>
  )
}
