import { BM25Index } from '@/services/bm25'
import type { ScannedDocument } from '@/types/document'

export interface SearchResult {
  doc: ScannedDocument
  snippet: string
  score: number
}

function extractSnippet(text: string, query: string): string {
  const lower = text.toLowerCase()
  const qLower = query.toLowerCase().trim()
  const firstTerm = qLower.split(/\s+/)[0]
  const idx = lower.indexOf(firstTerm)
  if (idx === -1) return text.slice(0, 120).trim() + '…'
  const start = Math.max(0, idx - 50)
  const end = Math.min(text.length, idx + firstTerm.length + 70)
  const before = start > 0 ? '…' : ''
  const after = end < text.length ? '…' : ''
  const raw = before + text.slice(start, end).trim() + after
  return raw.length > 140 ? raw.slice(0, 137) + '…' : raw
}

export function searchDocuments(query: string, documents: ScannedDocument[]): SearchResult[] {
  if (!query.trim() || documents.length === 0) return []
  const corpus = documents.map((d) => `${d.title} ${d.rawText}`)
  const index = new BM25Index(corpus)
  const hits = index.search(query, 10)
  return hits.map(({ idx, score }) => ({
    doc: documents[idx],
    snippet: extractSnippet(documents[idx].rawText, query),
    score,
  }))
}
