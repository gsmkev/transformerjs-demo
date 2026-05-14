import type { ScannedDocument } from '@/types/document'
import DocumentCard from './DocumentCard'

interface Props {
  documents: ScannedDocument[]
  loading: boolean
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}

export default function DocumentList({ documents, loading, onOpen, onDelete }: Props) {
  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <span className="text-sm text-dim">Loading library…</span>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center gap-2 text-center">
        <span className="text-4xl" aria-hidden="true">📂</span>
        <p className="text-sm font-semibold text-ink">No documents yet</p>
        <p className="text-xs text-dim">Run an OCR scan and click "Save to Library" to get started.</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <p className="text-xs text-dim">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
      <div className="space-y-3">
        {documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            onOpen={() => onOpen(doc.id)}
            onDelete={() => onDelete(doc.id)}
          />
        ))}
      </div>
    </div>
  )
}
