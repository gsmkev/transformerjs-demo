import type { ScannedDocument } from '@/types/document'

export async function shareDocument(doc: ScannedDocument): Promise<boolean> {
  if (!navigator.share) return false
  try {
    await navigator.share({ title: doc.title, text: doc.rawText })
    return true
  } catch {
    return false
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
