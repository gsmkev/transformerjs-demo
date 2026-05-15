const PDF_SCALE = 150 / 72  // 150 DPI

export async function pdfToImages(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist')

  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const total = pdf.numPages
  const dataUrls: string[] = []

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: PDF_SCALE })

    const canvas = document.createElement('canvas')
    canvas.width  = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)

    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, canvas, viewport }).promise

    dataUrls.push(canvas.toDataURL('image/jpeg', 0.92))
    canvas.width = 0

    onProgress?.(pageNum, total)
  }

  return dataUrls
}
