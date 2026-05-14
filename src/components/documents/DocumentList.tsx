import type { ScannedDocument } from '@/types/document'
import DocumentCard from './DocumentCard'

interface Props { documents: ScannedDocument[]; loading: boolean; onOpen: (id: string) => void; onDelete: (id: string) => void }

function SkeletonCard() {
  return (
    <div className="card flex gap-4 pointer-events-none">
      <div className="w-14 h-14 rounded-xl bg-white/5 flex-shrink-0 animate-pulse" />
      <div className="flex-1 space-y-2.5 py-0.5">
        <div className="h-3.5 bg-white/5 rounded-lg animate-pulse w-3/5" />
        <div className="h-2.5 bg-white/4 rounded-lg animate-pulse w-4/5" />
        <div className="h-2.5 bg-white/4 rounded-lg animate-pulse w-2/5" />
      </div>
    </div>
  )
}

export default function DocumentList({ documents, loading, onOpen, onDelete }: Props) {
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
          <p className="text-sm font-semibold text-ink">No documents yet</p>
          <p className="text-xs text-dim mt-1.5 max-w-xs leading-relaxed">
            Run an OCR scan and click <strong className="text-ink font-medium">Save to Library</strong> to get started.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 animate-fade-in">
      <p className="section-label">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
      <div className="space-y-3">
        {documents.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} onOpen={() => onOpen(doc.id)} onDelete={() => onDelete(doc.id)} />
        ))}
      </div>
    </div>
  )
}
