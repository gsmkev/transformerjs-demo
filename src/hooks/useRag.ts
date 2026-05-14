'use client'

import { useState, useCallback } from 'react'
import type { ScannedDocument, RagResult } from '@/types/document'
import { getExtractor, embed, cosineSimilarity } from '@/services/embeddingService'

export type EmbedModelStatus = 'idle' | 'loading' | 'ready' | 'error'

export function useRag() {
  const [modelStatus, setModelStatus] = useState<EmbedModelStatus>('idle')
  const [modelProgress, setModelProgress] = useState(0)
  const [modelError, setModelError] = useState<string | null>(null)
  const [querying, setQuerying] = useState(false)
  const [results, setResults] = useState<RagResult[]>([])
  const [queryError, setQueryError] = useState<string | null>(null)

  const loadModel = useCallback(async () => {
    if (modelStatus === 'loading' || modelStatus === 'ready') return
    setModelStatus('loading')
    setModelError(null)
    setModelProgress(0)
    try {
      await getExtractor((pct) => setModelProgress(pct))
      setModelStatus('ready')
      setModelProgress(100)
    } catch (err) {
      setModelError(err instanceof Error ? err.message : String(err))
      setModelStatus('error')
    }
  }, [modelStatus])

  const embedDoc = useCallback(async (doc: ScannedDocument): Promise<number[]> => {
    return embed(doc.rawText)
  }, [])

  const query = useCallback(
    async (queryText: string, documents: ScannedDocument[], topK = 5): Promise<void> => {
      if (modelStatus !== 'ready') {
        setQueryError('Load the embedding model first.')
        return
      }
      const indexed = documents.filter((d) => d.embedding !== null)
      if (indexed.length === 0) {
        setQueryError('No indexed documents. Open the Library tab and click "Index" on your documents.')
        return
      }

      setQuerying(true)
      setQueryError(null)
      try {
        const qVec = await embed(queryText)
        const scored: RagResult[] = indexed
          .map((d) => ({
            doc: d,
            score: cosineSimilarity(qVec, d.embedding!),
            excerpt: d.rawText.slice(0, 280).trim(),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, topK)
        setResults(scored)
      } catch (err) {
        setQueryError(err instanceof Error ? err.message : String(err))
      } finally {
        setQuerying(false)
      }
    },
    [modelStatus],
  )

  return {
    modelStatus, modelProgress, modelError,
    querying, results, queryError,
    loadModel, embedDoc, query,
  } as const
}
