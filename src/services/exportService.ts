import type { ScannedDocument } from '@/types/document'
import JSZip from 'jszip'
import { Document, Packer, AlignmentType } from 'docx'
import { tiptapToDocxChildren } from '@/lib/tiptapToDocx'
import { tiptapToOdtXml, documentsToOdsXml, ODT_STYLES_XML } from '@/lib/tiptapToOdf'

export async function shareDocument(doc: ScannedDocument): Promise<{ shared: boolean; copied: boolean }> {
  if (navigator.share) {
    try {
      await navigator.share({ title: doc.title, text: doc.rawText })
      return { shared: true, copied: false }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return { shared: false, copied: false }
    }
  }
  try {
    await navigator.clipboard.writeText(doc.rawText)
    return { shared: false, copied: true }
  } catch {
    return { shared: false, copied: false }
  }
}

export function printDocument(doc: ScannedDocument): void {
  const win = window.open('', '_blank')
  if (!win) return
  const date = new Date(doc.createdAt).toLocaleDateString()
  win.document.write(`<!DOCTYPE html><html><head>
    <title>${doc.title}</title>
    <meta charset="utf-8"/>
    <style>
      body{font-family:Georgia,serif;max-width:700px;margin:40px auto;font-size:14px;line-height:1.7;color:#111}
      h1{font-size:20px;margin-bottom:4px}
      .meta{color:#666;font-size:12px;margin-bottom:24px}
      img{max-width:100%;border-radius:4px;margin-bottom:20px;border:1px solid #ddd;display:block}
      pre{white-space:pre-wrap;font-family:inherit;margin:0}
      @media print{body{margin:0}}
    </style>
    </head><body>
    <h1>${doc.title}</h1>
    <p class="meta">${date} · Papeleo</p>
    ${doc.imageDataUrl ? `<img src="${doc.imageDataUrl}" alt="Documento escaneado"/>` : ''}
    <pre>${doc.rawText}</pre>
    </body></html>`)
  win.document.close()
  win.focus()
  win.print()
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'documento'
}

function buildOdtZip(contentXml: string): JSZip {
  const zip = new JSZip()
  const bodyXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  office:version="1.3">
<office:body><office:text>${contentXml}</office:text></office:body>
</office:document-content>`

  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' })
  zip.file('content.xml', bodyXml)
  zip.file('styles.xml', ODT_STYLES_XML)
  zip.folder('META-INF')!.file('manifest.xml',
    `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/></manifest:manifest>`)
  return zip
}

function buildOdsZip(contentXml: string): JSZip {
  const zip = new JSZip()
  zip.file('mimetype', 'application/vnd.oasis.opendocument.spreadsheet', { compression: 'STORE' })
  zip.file('content.xml', contentXml)
  zip.folder('META-INF')!.file('manifest.xml',
    `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.spreadsheet"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/></manifest:manifest>`)
  return zip
}

export async function exportDocx(doc: ScannedDocument, includeImage: boolean): Promise<void> {
  const richText = doc.richText || JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: doc.rawText }] }] })
  const children = tiptapToDocxChildren(richText, doc.imageDataUrl, includeImage)
  const docxDoc = new Document({
    numbering: { config: [{ reference: 'ordered-list', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT }] }] },
    sections: [{ properties: {}, children }],
  })
  const blob = await Packer.toBlob(docxDoc)
  downloadBlob(blob, `${slugify(doc.title)}.docx`)
}

export async function exportOdt(doc: ScannedDocument, includeImage: boolean): Promise<void> {
  const bodyXml = tiptapToOdtXml(doc.richText || '', doc.rawText)
  const zip = buildOdtZip(bodyXml)
  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `${slugify(doc.title)}.odt`)
}

export async function exportOds(doc: ScannedDocument): Promise<void> {
  const contentXml = documentsToOdsXml([doc])
  const zip = buildOdsZip(contentXml)
  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `${slugify(doc.title)}.ods`)
}

export async function exportBulkDocx(docs: ScannedDocument[], includeImage: boolean): Promise<void> {
  const zip = new JSZip()
  for (const doc of docs) {
    const richText = doc.richText || JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: doc.rawText }] }] })
    const children = tiptapToDocxChildren(richText, doc.imageDataUrl, includeImage)
    const docxDoc = new Document({
      numbering: { config: [{ reference: 'ordered-list', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT }] }] },
      sections: [{ properties: {}, children }],
    })
    const buffer = await Packer.toBuffer(docxDoc)
    zip.file(`${slugify(doc.title)}.docx`, buffer)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, 'documentos-export.zip')
}

export async function exportBulkOdt(docs: ScannedDocument[], includeImage: boolean): Promise<void> {
  const outerZip = new JSZip()
  for (const doc of docs) {
    const bodyXml = tiptapToOdtXml(doc.richText || '', doc.rawText)
    const innerZip = buildOdtZip(bodyXml)
    const buf = await innerZip.generateAsync({ type: 'uint8array' })
    outerZip.file(`${slugify(doc.title)}.odt`, buf)
  }
  const blob = await outerZip.generateAsync({ type: 'blob' })
  downloadBlob(blob, 'documentos-export.zip')
}

export async function exportBulkOds(docs: ScannedDocument[]): Promise<void> {
  const contentXml = documentsToOdsXml(docs)
  const zip = buildOdsZip(contentXml)
  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, 'documentos.ods')
}
