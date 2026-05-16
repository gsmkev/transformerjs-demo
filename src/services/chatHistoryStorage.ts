// src/services/chatHistoryStorage.ts
import { getDb } from './db'
import type { ChatHistory } from '@/types/document'

export async function saveChatHistory(history: ChatHistory): Promise<void> {
  const db = await getDb()
  await db.put('chat_histories', history)
}

export async function getAllChatHistories(): Promise<ChatHistory[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('chat_histories', 'createdAt')
  return all.reverse() // newest first
}

export async function updateChatHistory(id: string, patch: Partial<ChatHistory>): Promise<void> {
  const db = await getDb()
  const existing = await db.get('chat_histories', id)
  if (!existing) throw new Error(`Chat history not found: ${id}`)
  await db.put('chat_histories', { ...existing, ...patch, updatedAt: Date.now() })
}

export async function deleteChatHistory(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('chat_histories', id)
}

export async function pruneChatHistories(limit: number): Promise<void> {
  if (!isFinite(limit)) return
  const db = await getDb()
  const all = await db.getAllFromIndex('chat_histories', 'createdAt') // oldest first
  if (all.length <= limit) return
  const toDelete = all.slice(0, all.length - limit)
  const tx = db.transaction('chat_histories', 'readwrite')
  await Promise.all(toDelete.map((h) => tx.store.delete(h.id)))
  await tx.done
}
