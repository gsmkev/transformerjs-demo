import type { ScannedDocument } from '@/types/document'

interface Props {
  doc: ScannedDocument
  onOpen: () => void
  onDelete: () => void
}

export default function DocumentCard({ doc, onOpen, onDelete }: Props) {
  const date = new Date(doc.createdAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div
      className="card flex gap-3 cursor-pointer hover:border-accent/50 transition-colors group"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label={`Open document: ${doc.title}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
    >
      {/* Thumbnail */}
      {doc.imageDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={doc.imageDataUrl}
          alt=""
          aria-hidden="true"
          className="w-14 h-14 object-cover rounded-lg flex-shrink-0 bg-base"
        />
      )}

      {/* Meta */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink truncate">{doc.title}</p>
        <p className="text-xs text-dim mt-1 line-clamp-2 leading-relaxed">
          {doc.rawText.slice(0, 120)}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-dim">{date}</span>
          {doc.confidence !== null && (
            <span className="text-xs text-dim">{doc.confidence.toFixed(0)}% confidence</span>
          )}
          {doc.embedding !== null && (
            <span className="text-xs text-ok">● Indexed</span>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        aria-label={`Delete document: ${doc.title}`}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-dim hover:text-err transition-all self-start p-1 rounded"
      >
        ✕
      </button>
    </div>
  )
}
