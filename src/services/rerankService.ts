// Cross-encoder reranker: Xenova/ms-marco-MiniLM-L-6-v2
// Takes (query, passage) pairs and scores them for relevance.
// Much more accurate than cosine similarity for passage ranking.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _rerankerPromise: Promise<any> | null = null
let _isReady = false

export function isRerankerLoaded(): boolean {
  return _isReady
}

export async function getReranker(onProgress?: (pct: number) => void) {
  if (!_rerankerPromise) {
    _rerankerPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers')
      const reranker = await pipeline('text-classification', 'Xenova/ms-marco-MiniLM-L-6-v2', {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress_callback: (info: any) => {
          if (typeof info?.progress === 'number') onProgress?.(Math.round(info.progress))
        },
      })
      _isReady = true
      return reranker
    })()
    _rerankerPromise.catch(() => { _rerankerPromise = null; _isReady = false })
  }
  return _rerankerPromise
}

// Score each passage against the query. Returns scores in the same order as passages.
// Higher score = more relevant.
export async function rerankPassages(query: string, passages: string[]): Promise<number[]> {
  const reranker = await getReranker()
  return Promise.all(
    passages.map(async (passage) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (reranker as any)(query, {
          text_pair: passage,
          truncation: true,
        })
        const items: Array<{ score: number }> = Array.isArray(result) ? result : [result]
        return items[0]?.score ?? 0
      } catch {
        return 0
      }
    }),
  )
}
