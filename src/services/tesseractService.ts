import Tesseract from 'tesseract.js'
import type { EngineConfig, OcrResult } from '@/types/ocr'

export async function buildWorker(
  engine: EngineConfig,
  onProgress: (pct: number, step: string) => void,
): Promise<Tesseract.Worker> {
  const worker = await Tesseract.createWorker(engine.langs, 1, {
    langPath: engine.langPath,
    logger: (m: Tesseract.LoggerMessage) => {
      if (m.status === 'loading tesseract core') {
        onProgress(Math.round((m.progress ?? 0) * 10), 'Loading core…')
      } else if (m.status === 'initializing tesseract') {
        onProgress(10 + Math.round((m.progress ?? 0) * 10), 'Initializing…')
      } else if (m.status === 'loading language traineddata') {
        onProgress(20 + Math.round((m.progress ?? 0) * 70), 'Downloading model…')
      } else if (m.status === 'initializing api') {
        onProgress(90 + Math.round((m.progress ?? 0) * 10), 'Finalizing…')
      }
    },
  })
  return worker
}

export async function runOcr(worker: Tesseract.Worker, file: File): Promise<OcrResult> {
  const { data } = await worker.recognize(file)
  return {
    text: data.text.trim(),
    confidence: data.confidence ?? null,
  }
}
