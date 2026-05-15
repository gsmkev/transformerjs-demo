// Lazy singleton — model downloads once (~23 MB) and is reused across calls
let _extractorPromise: Promise<(text: string, opts: Record<string, unknown>) => Promise<{ data: Float32Array }>> | null = null
let _isReady = false

export function isEmbedderLoaded(): boolean {
  return _isReady
}

export async function getExtractor(onProgress?: (pct: number) => void) {
  if (!_extractorPromise) {
    _extractorPromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers')
      env.allowLocalModels = false
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress_callback: (info: any) => {
          if (typeof info?.progress === 'number') onProgress?.(Math.round(info.progress))
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
      _isReady = true
      return extractor
    })()
    _extractorPromise.catch(() => { _extractorPromise = null; _isReady = false })
  }
  return _extractorPromise
}

export async function embed(text: string, onProgress?: (pct: number) => void): Promise<number[]> {
  const extractor = await getExtractor(onProgress)
  // No truncation: chunks are ~350 chars, well within the model's 256-token limit
  const output = await extractor(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}
