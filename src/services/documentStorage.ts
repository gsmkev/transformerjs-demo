import { getDb } from './db'
import type { ScannedDocument, DocumentChunk } from '@/types/document'

// ── Documents ────────────────────────────────────────────────────────────────

export async function saveDocument(doc: ScannedDocument): Promise<void> {
  const db = await getDb()
  await db.put('documents', doc)
}

export async function getDocument(id: string): Promise<ScannedDocument | undefined> {
  const db = await getDb()
  return db.get('documents', id)
}

export async function getAllDocuments(): Promise<ScannedDocument[]> {
  const db = await getDb()
  return db.getAll('documents')
}

export async function updateDocument(id: string, patch: Partial<ScannedDocument>): Promise<void> {
  const db = await getDb()
  const existing = await db.get('documents', id)
  if (!existing) throw new Error(`Document "${id}" not found`)
  await db.put('documents', { ...existing, ...patch })
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('documents', id)
}

// ── Chunks ───────────────────────────────────────────────────────────────────

export async function saveChunks(chunks: DocumentChunk[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('chunks', 'readwrite')
  await Promise.all(chunks.map((c) => tx.store.put(c)))
  await tx.done
}

export async function getAllChunks(): Promise<DocumentChunk[]> {
  const db = await getDb()
  return db.getAll('chunks')
}

export async function getChunksByDocId(docId: string): Promise<DocumentChunk[]> {
  const db = await getDb()
  return db.getAllFromIndex('chunks', 'docId', docId)
}

export async function deleteChunksByDocId(docId: string): Promise<void> {
  const db = await getDb()
  const existing = await db.getAllFromIndex('chunks', 'docId', docId)
  if (existing.length === 0) return
  const tx = db.transaction('chunks', 'readwrite')
  await Promise.all(existing.map((c) => tx.store.delete(c.id)))
  await tx.done
}
