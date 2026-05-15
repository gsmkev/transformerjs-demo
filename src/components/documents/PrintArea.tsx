import type { ScannedDocument } from '@/types/document'
import { richTextToHtml } from '@/lib/richTextToHtml'

interface Props {
  doc: ScannedDocument | null
  includeImage: boolean
}

export default function PrintArea({ doc, includeImage }: Props) {
  if (!doc) return <div id="papeleo-print-area" style={{ display: 'none' }} />

  const date = new Date(doc.createdAt).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const bodyHtml = doc.richText
    ? richTextToHtml(doc.richText)
    : `<p>${doc.rawText.replace(/\n/g, '</p><p>').replace(/  +/g, ' ')}</p>`

  return (
    <div id="papeleo-print-area" style={{ display: 'none' }}>
      {includeImage && doc.imageDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={doc.imageDataUrl} alt={`Imagen: ${doc.title}`} />
      )}
      <h1>{doc.title}</h1>
      <p className="print-meta">{date} · Papeleo{doc.category ? ` · ${doc.category}` : ''}</p>
      <hr className="print-divider" />
      {/* eslint-disable-next-line react/no-danger */}
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </div>
  )
}
