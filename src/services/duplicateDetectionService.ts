import type { ScannedDocument, DocumentChunk } from '@/types/document'
import { embed, cosineSimilarity, isEmbedderLoaded } from './embeddingService'

const SIMILARITY_THRESHOLD = 0.92

export interface DuplicateResult {
  doc: ScannedDocument
  maxSimilarity: number
}

export async function findNearDuplicates(
  rawText: string,
  chunks: DocumentChunk[],
  documents: ScannedDocument[],
  excludeDocId?: string,
): Promise<DuplicateResult[]> {
  if (!isEmbedderLoaded() || chunks.length === 0) return []

  const queryVec = await embed(rawText.slice(0, 1000))

  const bestByDoc = new Map<string, number>()
  for (const chunk of chunks) {
    if (chunk.docId === excludeDocId) continue
    const sim = cosineSimilarity(queryVec, chunk.embedding)
    if (sim >= SIMILARITY_THRESHOLD) {
      const prev = bestByDoc.get(chunk.docId) ?? 0
      if (sim > prev) bestByDoc.set(chunk.docId, sim)
    }
  }

  if (bestByDoc.size === 0) return []

  return [...bestByDoc.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([docId, maxSimilarity]) => {
      const doc = documents.find((d) => d.id === docId)
      return doc ? { doc, maxSimilarity } : null
    })
    .filter((r): r is DuplicateResult => r !== null)
}
