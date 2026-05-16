import type { DocumentChunk } from '@/types/document'
import { embed } from './embeddingService'
import { saveChunks, deleteChunksByDocId } from './documentStorage'

const CHUNK_MAX_CHARS = 350
const CHUNK_OVERLAP   = 80
const CHUNK_MIN_CHARS = 30

export function chunkText(text: string): string[] {
  // Split on sentence/paragraph boundaries to avoid mid-sentence cuts
  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) ?? [text]
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if (current.length + sentence.length > CHUNK_MAX_CHARS && current.length > 0) {
      chunks.push(current.trim())
      // Keep last few words for context overlap in the next chunk
      const words = current.split(' ')
      current = words.slice(-Math.ceil(CHUNK_OVERLAP / 6)).join(' ') + ' ' + sentence
    } else {
      current += sentence
    }
  }
  if (current.trim().length >= CHUNK_MIN_CHARS) chunks.push(current.trim())
  return chunks.filter((c) => c.length >= CHUNK_MIN_CHARS)
}

/**
 * Chunks and embeds a document, persisting each chunk in IndexedDB.
 * Re-indexes from scratch if the document was previously indexed.
 * Returns the number of chunks created.
 */
export async function indexDocument(
  docId: string,
  rawText: string,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  await deleteChunksByDocId(docId)

  const texts = chunkText(rawText)
  const chunks: DocumentChunk[] = []

  const BATCH = 4
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH)
    const embeddings = await Promise.all(slice.map((t) => embed(t)))
    embeddings.forEach((embedding, j) => {
      const idx = i + j
      chunks.push({ id: `${docId}_c${idx}`, docId, chunkIndex: idx, text: slice[j], embedding })
      onProgress?.(idx + 1, texts.length)
    })
  }

  await saveChunks(chunks)
  return chunks.length
}

export async function removeDocumentChunks(docId: string): Promise<void> {
  await deleteChunksByDocId(docId)
}
