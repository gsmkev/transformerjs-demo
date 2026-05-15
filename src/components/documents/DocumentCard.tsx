import type { ScannedDocument, Collection } from '@/types/document'

function expiryBadge(expiresAt: number | null | undefined): { label: string; cls: string } | null {
  if (!expiresAt) return null
  const now = Date.now()
  const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0)   return { label: 'Caducado',                cls: 'text-err/90 bg-err/10 border-err/20' }
  if (daysLeft <= 7)  return { label: `Caduca en ${daysLeft}d`,  cls: 'text-err/70 bg-err/8 border-err/15' }
  if (daysLeft <= 30) return { label: `Caduca en ${daysLeft}d`,  cls: 'text-yellow-400/80 bg-yellow-400/8 border-yellow-400/15' }
  const dateStr = new Date(expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return { label: `Caduca ${dateStr}`, cls: 'text-ok/70 bg-ok/8 border-ok/15' }
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

interface Props {
  doc: ScannedDocument
  onOpen: () => void
  onDelete: () => void
  selectionMode?: boolean
  isSelected?: boolean
  onToggleSelect?: () => void
  collection?: Collection | null
}

export default function DocumentCard({ doc, onOpen, onDelete, selectionMode, isSelected, onToggleSelect, collection }: Props) {
  const date = new Date(doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div
      className="card card-interactive flex gap-4 group relative"
      onClick={selectionMode ? onToggleSelect : onOpen}
      role="button"
      tabIndex={0}
      aria-label={selectionMode ? `${isSelected ? 'Deselect' : 'Select'} document: ${doc.title}` : `Open document: ${doc.title}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectionMode ? onToggleSelect?.() : onOpen() } }}
    >
      {selectionMode && (
        <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          isSelected ? 'bg-accent border-accent' : 'bg-surface border-white/30'
        }`}>
          {isSelected && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </div>
      )}
      {doc.imageDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={doc.imageDataUrl} alt="" aria-hidden="true" className="w-14 h-14 object-cover rounded-xl flex-shrink-0 bg-surface border border-white/7" />
      )}
      <div className="flex-1 min-w-0 pr-6">
        <p className="font-semibold text-ink truncate leading-snug">{doc.title}</p>
        <p className="text-xs text-dim mt-1.5 line-clamp-2 leading-relaxed">{doc.summary ?? doc.rawText.slice(0, 120)}</p>
        <div className="flex items-center gap-2.5 mt-2.5 flex-wrap">
          <span className="text-xs text-dim/70">{date}</span>
          {doc.confidence !== null && <span className="text-xs text-dim/70 font-mono">{doc.confidence.toFixed(0)}% conf.</span>}
          {doc.embedding !== null && (
            <span className="inline-flex items-center gap-1 text-xs text-ok/90">
              <span className="w-1.5 h-1.5 rounded-full bg-ok" aria-hidden="true" />
              Indexed
            </span>
          )}
          {doc.category && (
            <span className="text-xs bg-accent/10 border border-accent/20 text-accent/80 px-2 py-0.5 rounded-full">
              {CATEGORY_LABELS[doc.category] ?? doc.category}
            </span>
          )}
          {collection && (
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: `${collection.color}18`,
                borderColor: `${collection.color}40`,
                color: collection.color,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: collection.color }} aria-hidden="true" />
              {collection.name}
            </span>
          )}
          {(() => {
            const badge = expiryBadge(doc.expiresAt)
            return badge ? (
              <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.cls}`}>
                {badge.label}
              </span>
            ) : null
          })()}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        aria-label={`Delete document: ${doc.title}`}
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 focus:opacity-100 w-10 h-10 rounded-xl bg-white/5 hover:bg-err/15 hover:border-err/30 border border-transparent text-dim hover:text-err flex items-center justify-center transition-all"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}
