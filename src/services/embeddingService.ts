// Lazy singleton — model downloads once (~23 MB) and is reused across calls
let _extractorPromise: Promise<(text: string, opts: Record<string, unknown>) => Promise<{ data: Float32Array }>> | null = null

export async function getExtractor(onProgress?: (pct: number) => void) {
  if (!_extractorPromise) {
    _extractorPromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers')
      env.allowLocalModels = false
      return pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress_callback: (info: any) => {
          if (typeof info?.progress === 'number') onProgress?.(Math.round(info.progress))
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
    })()
    _extractorPromise.catch(() => { _extractorPromise = null }) // reset on failure so caller can retry
  }
  return _extractorPromise
}

export async function embed(text: string, onProgress?: (pct: number) => void): Promise<number[]> {
  const extractor = await getExtractor(onProgress)
  const output = await extractor(text.slice(0, 1024), { pooling: 'mean', normalize: true })
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
