// Cross-encoder reranker: Xenova/ms-marco-MiniLM-L-6-v2
// Takes (query, passage) pairs and scores them for relevance.
// Much more accurate than cosine similarity for passage ranking.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _rerankerPromise: Promise<any> | null = null

export function isRerankerLoaded(): boolean {
  return _rerankerPromise !== null
}

export async function getReranker(onProgress?: (pct: number) => void) {
  if (!_rerankerPromise) {
    _rerankerPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers')
      return pipeline('text-classification', 'Xenova/ms-marco-MiniLM-L-6-v2', {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress_callback: (info: any) => {
          if (typeof info?.progress === 'number') onProgress?.(Math.round(info.progress))
        },
      })
    })()
    _rerankerPromise.catch(() => { _rerankerPromise = null })
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
          text_pair: passage.slice(0, 512),
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
