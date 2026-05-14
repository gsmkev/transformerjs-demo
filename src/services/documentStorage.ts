import { getDb } from './db'
import type { ScannedDocument } from '@/types/document'

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
