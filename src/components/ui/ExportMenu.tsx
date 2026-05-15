'use client'

import { useState, useRef, useEffect } from 'react'
import type { ScannedDocument, ExportHistoryEntry } from '@/types/document'
import Button from './Button'
import {
  exportDocx, exportOdt, exportOds,
  exportBulkDocx, exportBulkOdt, exportBulkOds,
} from '@/services/exportService'

type Format = 'docx' | 'odt' | 'ods'

interface Props {
  doc?: ScannedDocument
  docs?: ScannedDocument[]
  onExport?: (format: ExportHistoryEntry['format']) => void
}

export default function ExportMenu({ doc, docs, onExport }: Props) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<Format>('docx')
  const [includeImage, setIncludeImage] = useState(true)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const targets = docs ?? (doc ? [doc] : [])
  const isBulk = !!docs
  const showImageOption = format === 'docx'

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  const handleDownload = async () => {
    if (targets.length === 0) return
    setLoading(true)
    try {
      if (isBulk) {
        if (format === 'docx') await exportBulkDocx(targets, includeImage)
        else if (format === 'odt') await exportBulkOdt(targets, includeImage)
        else await exportBulkOds(targets)
      } else {
        const d = targets[0]
        if (format === 'docx') await exportDocx(d, includeImage)
        else if (format === 'odt') await exportOdt(d, includeImage)
        else await exportOds(d)
      }
      onExport?.(format)
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        className="py-1 px-2.5 text-xs flex-shrink-0"
      >
        Exportar ▾
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-30 w-56 bg-surface border border-white/10 rounded-2xl shadow-xl p-4 space-y-4">
          <p className="text-xs font-semibold text-ink">Formato</p>

          <div className="flex gap-1.5">
            {(['docx', 'odt', 'ods'] as Format[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`flex-1 py-1 rounded-lg text-xs font-medium border transition-all ${
                  format === f
                    ? 'bg-accent/15 border-accent/30 text-accent'
                    : 'border-white/10 text-dim hover:text-ink hover:bg-white/5'
                }`}
              >
                {f === 'docx' ? 'Word' : f.toUpperCase()}
              </button>
            ))}
          </div>

          {showImageOption && (
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeImage}
                onChange={(e) => setIncludeImage(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              <span className="text-xs text-dim">Incluir imagen escaneada</span>
            </label>
          )}

          <Button
            onClick={handleDownload}
            disabled={loading || targets.length === 0}
            spinning={loading}
            className="w-full py-1.5 text-xs"
          >
            {loading ? 'Generando…' : `Descargar${isBulk && targets.length > 0 ? ` (${targets.length})` : ''}`}
          </Button>
        </div>
      )}
    </div>
  )
}
