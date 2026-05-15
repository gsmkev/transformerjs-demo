'use client'

import type { ExportHistoryEntry } from '@/types/document'

interface Props {
  history: ExportHistoryEntry[]
  onClose: () => void
}

const FORMAT_LABELS: Record<ExportHistoryEntry['format'], string> = {
  pdf:   'PDF',
  txt:   'TXT',
  json:  'JSON',
  share: 'Compartir',
  copy:  'Copiar',
  docx:  'DOCX',
  odt:   'ODT',
  ods:   'ODS',
}

function formatDate(ms: number): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(ms))
}

export default function ExportHistoryDrawer({ history, onClose }: Props) {
  const sorted = [...history].sort((a, b) => b.exportedAt - a.exportedAt)

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
      aria-label="Cerrar historial"
    >
      <div
        className="relative w-full max-w-xs bg-surface border-l border-white/10 shadow-2xl flex flex-col animate-slide-in-right h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/7">
          <p className="text-sm font-semibold text-ink">Historial de exportación</p>
          <button
            onClick={onClose}
            className="text-dim/40 hover:text-dim transition-colors"
            aria-label="Cerrar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-dim/50">Sin exportaciones todavía.</p>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto divide-y divide-white/5">
            {sorted.map((entry, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs font-mono font-semibold text-accent/80 w-12 flex-shrink-0">
                  {FORMAT_LABELS[entry.format]}
                </span>
                <span className="text-xs text-dim/70 tabular-nums">{formatDate(entry.exportedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
