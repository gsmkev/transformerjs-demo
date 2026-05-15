'use client'

import type { DuplicateResult } from '@/services/duplicateDetectionService'

interface Props {
  duplicates: DuplicateResult[]
  onOpenDoc: (id: string) => void
  onDismiss: () => void
}

export default function DuplicateWarning({ duplicates, onOpenDoc, onDismiss }: Props) {
  return (
    <div className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(420px,calc(100vw-2rem))] animate-fade-in">
      <div className="card border border-yellow-400/25 bg-yellow-400/5 shadow-lg">
        <div className="flex items-start gap-3 p-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400 flex-shrink-0 mt-0.5" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-ink">Posible duplicado</p>
            <p className="text-xs text-dim mt-0.5">Este documento es muy similar a:</p>
            <ul className="mt-2 space-y-1">
              {duplicates.map(({ doc, maxSimilarity }) => (
                <li key={doc.id} className="flex items-center gap-2">
                  <button
                    onClick={() => { onDismiss(); onOpenDoc(doc.id) }}
                    className="text-xs text-accent hover:underline truncate flex-1 text-left"
                  >
                    {doc.title}
                  </button>
                  <span className="text-xs font-mono text-dim/60 flex-shrink-0">
                    {Math.round(maxSimilarity * 100)}% similar
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={onDismiss}
            className="text-dim/40 hover:text-dim transition-colors flex-shrink-0"
            aria-label="Cerrar advertencia"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
