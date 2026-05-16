const PDF_SCALE = 150 / 72  // 150 DPI

export async function pdfToImages(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  console.log('[pdfToImages] Starting. File:', file.name, file.type, file.size, 'bytes')

  const pdfjsLib = await import('pdfjs-dist')
  console.log('[pdfToImages] pdfjs imported, version:', pdfjsLib.version)

  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
  console.log('[pdfToImages] workerSrc set to:', pdfjsLib.GlobalWorkerOptions.workerSrc)

  const arrayBuffer = await file.arrayBuffer()
  console.log('[pdfToImages] ArrayBuffer ready, size:', arrayBuffer.byteLength)

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
  console.log('[pdfToImages] Loading task created')

  const pdf = await loadingTask.promise
  console.log('[pdfToImages] PDF loaded. Pages:', pdf.numPages)

  const total = pdf.numPages
  const dataUrls: string[] = []

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    console.log(`[pdfToImages] Rendering page ${pageNum}/${total}`)
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: PDF_SCALE })
    console.log(`[pdfToImages] Page ${pageNum} viewport: ${Math.round(viewport.width)}x${Math.round(viewport.height)}`)

    const canvas = document.createElement('canvas')
    canvas.width  = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)

    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, canvas, viewport }).promise
    console.log(`[pdfToImages] Page ${pageNum} rendered`)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    console.log(`[pdfToImages] Page ${pageNum} dataUrl length: ${dataUrl.length}`)
    dataUrls.push(dataUrl)
    canvas.width = 0

    onProgress?.(pageNum, total)
  }

  console.log('[pdfToImages] Done. Total pages rendered:', dataUrls.length)
  return dataUrls
}
