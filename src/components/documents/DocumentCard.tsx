import type { ScannedDocument } from '@/types/document'

interface Props { doc: ScannedDocument; onOpen: () => void; onDelete: () => void }

export default function DocumentCard({ doc, onOpen, onDelete }: Props) {
  const date = new Date(doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div
      className="card card-interactive flex gap-4 group"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label={`Open document: ${doc.title}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
    >
      {doc.imageDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={doc.imageDataUrl} alt="" aria-hidden="true" className="w-14 h-14 object-cover rounded-xl flex-shrink-0 bg-surface border border-white/7" />
      )}
      <div className="flex-1 min-w-0 pr-6">
        <p className="font-semibold text-ink truncate leading-snug">{doc.title}</p>
        <p className="text-xs text-dim mt-1.5 line-clamp-2 leading-relaxed">{doc.rawText.slice(0, 120)}</p>
        <div className="flex items-center gap-2.5 mt-2.5 flex-wrap">
          <span className="text-xs text-dim/70">{date}</span>
          {doc.confidence !== null && <span className="text-xs text-dim/70 font-mono">{doc.confidence.toFixed(0)}% conf.</span>}
          {doc.embedding !== null && (
            <span className="inline-flex items-center gap-1 text-xs text-ok/90">
              <span className="w-1.5 h-1.5 rounded-full bg-ok" aria-hidden="true" />
              Indexed
            </span>
          )}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        aria-label={`Delete document: ${doc.title}`}
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 focus:opacity-100 w-7 h-7 rounded-lg bg-white/5 hover:bg-err/15 hover:border-err/30 border border-transparent text-dim hover:text-err flex items-center justify-center transition-all"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}
