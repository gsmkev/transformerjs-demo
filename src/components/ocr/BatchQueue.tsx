'use client'

import type { BatchItem } from '@/hooks/useBatchOcr'
import ProgressBar from '@/components/ui/ProgressBar'
import Button from '@/components/ui/Button'

interface Props {
  queue: BatchItem[]
  running: boolean
  progress: { done: number; total: number }
  onRemove: (id: string) => void
  onCancel: () => void
  onClear: () => void
  onNavigateToLibrary: () => void
}

function StatusIcon({ status }: { status: BatchItem['status'] }) {
  if (status === 'done') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ok flex-shrink-0" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
  if (status === 'error') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-err flex-shrink-0" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
  if (status === 'processing') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-info flex-shrink-0 animate-spin" aria-hidden="true">
      <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    </svg>
  )
  return <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0" />
}

export default function BatchQueue({ queue, running, progress, onRemove, onCancel, onClear, onNavigateToLibrary }: Props) {
  const allDone = queue.length > 0 && queue.every((i) => i.status === 'done' || i.status === 'error')
  const doneCount = queue.filter((i) => i.status === 'done').length
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="card space-y-3">
      {/* Header + progress */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink">
          Cola de OCR{progress.total > 0 ? ` · ${progress.done} / ${progress.total}` : ` · ${queue.length} archivos`}
        </p>
        {running && (
          <Button variant="ghost" onClick={onCancel} className="py-0.5 px-2 text-xs">
            Cancelar
          </Button>
        )}
      </div>

      {running && progress.total > 0 && (
        <ProgressBar value={pct} percentage />
      )}

      {/* Queue items */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {queue.map((item) => (
          <div key={item.id} className="flex items-start gap-2.5">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-surface border border-white/7">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.dataUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-xs text-ink truncate">{item.file.name}</p>
              {item.status === 'error' && (
                <p className="text-xs text-err/80 mt-0.5">{item.error}</p>
              )}
              {item.status === 'done' && (
                <p className="text-xs text-ok/80 mt-0.5">Guardado</p>
              )}
              {item.status === 'pending' && (
                <p className="text-xs text-dim/50 mt-0.5">Pendiente</p>
              )}
            </div>
            <StatusIcon status={item.status} />
            {item.status === 'pending' && !running && (
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="text-dim/40 hover:text-dim transition-colors flex-shrink-0 text-xs mt-0.5"
                aria-label="Eliminar de la cola"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Done banner */}
      {allDone && (
        <div className="space-y-2 pt-1 border-t border-white/7">
          <p className="text-xs text-ok/80">
            {doneCount} documento{doneCount !== 1 ? 's' : ''} guardado{doneCount !== 1 ? 's' : ''} en la biblioteca
            {queue.filter((i) => i.status === 'error').length > 0 && ` · ${queue.filter((i) => i.status === 'error').length} errores`}
          </p>
          <div className="flex gap-2">
            <Button onClick={onNavigateToLibrary} className="flex-1 py-1.5 text-xs">
              Ir a Archivo
            </Button>
            <Button variant="ghost" onClick={onClear} className="py-1.5 text-xs">
              Limpiar cola
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
