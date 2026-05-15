'use client'

import { useState } from 'react'
import type { ScannedDocument } from '@/types/document'
import DocumentCard from './DocumentCard'
import Button from '@/components/ui/Button'

interface Props {
  documents: ScannedDocument[]
  loading: boolean
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onScanClick?: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  factura: '🧾 Factura',
  contrato: '📝 Contrato',
  médico: '🏥 Médico',
  identidad: '🪪 Identidad',
  seguro: '🛡️ Seguro',
  bancario: '🏦 Bancario',
  hogar: '🏠 Hogar',
  otro: '📄 Otro',
}

const shimmerCls = 'bg-gradient-to-r from-white/4 via-white/8 to-white/4 bg-[length:200%_100%] animate-shimmer rounded-lg'

function SkeletonCard() {
  return (
    <div className="card flex gap-4 pointer-events-none">
      <div className={`w-14 h-14 rounded-xl flex-shrink-0 ${shimmerCls}`} />
      <div className="flex-1 space-y-2.5 py-0.5">
        <div className={`h-3.5 w-3/5 ${shimmerCls}`} />
        <div className={`h-2.5 w-4/5 ${shimmerCls}`} />
        <div className={`h-2.5 w-2/5 ${shimmerCls}`} />
      </div>
    </div>
  )
}

export default function DocumentList({ documents, loading, onOpen, onDelete, onScanClick }: Props) {
  const [filter, setFilter] = useState<string>('all')

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-3 animate-fade-in">
        {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="p-8 sm:p-12 flex flex-col items-center gap-4 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-dim/50" aria-hidden="true">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Biblioteca vacía</p>
          <p className="text-xs text-dim mt-1.5 max-w-xs leading-relaxed">
            Escanea un documento y guárdalo en la biblioteca para verlo aquí.
          </p>
        </div>
        {onScanClick && (
          <Button onClick={onScanClick} className="px-5">
            Ir a OCR
          </Button>
        )}
      </div>
    )
  }

  const categories = Array.from(new Set(documents.map((d) => d.category).filter(Boolean))) as string[]
  const filtered = filter === 'all' ? documents : documents.filter((d) => d.category === filter)

  return (
    <div className="p-4 sm:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        <p className="section-label">{filtered.length} documento{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
              filter === 'all'
                ? 'bg-accent/15 border-accent/30 text-accent'
                : 'border-white/10 text-dim hover:text-ink hover:bg-white/5'
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                filter === cat
                  ? 'bg-accent/15 border-accent/30 text-accent'
                  : 'border-white/10 text-dim hover:text-ink hover:bg-white/5'
              }`}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} onOpen={() => onOpen(doc.id)} onDelete={() => onDelete(doc.id)} />
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-dim text-center py-6">No hay documentos en esta categoría.</p>
        )}
      </div>
    </div>
  )
}
