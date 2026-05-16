import { getDb } from './db'
import type { Collection } from '@/types/document'

export async function saveCollection(col: Collection): Promise<void> {
  const db = await getDb()
  await db.put('collections', col)
}

export async function getAllCollections(): Promise<Collection[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('collections', 'createdAt')
  return all
}

export async function updateCollection(id: string, patch: Partial<Collection>): Promise<void> {
  const db = await getDb()
  const existing = await db.get('collections', id)
  if (!existing) throw new Error(`Collection not found: ${id}`)
  await db.put('collections', { ...existing, ...patch })
}

export async function deleteCollection(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('collections', id)
}
