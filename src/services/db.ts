import { openDB, type IDBPDatabase } from 'idb'
import type { ScannedDocument, DocumentChunk, ChatHistory } from '@/types/document'

const DB_NAME = 'local-ocr-v1'
const DB_VERSION = 4

export type DocStore = {
  documents: {
    key: string
    value: ScannedDocument
    indexes: { createdAt: number; category: string }
  }
  chunks: {
    key: string
    value: DocumentChunk
    indexes: { docId: string }
  }
  chat_histories: {
    key: string
    value: ChatHistory
    indexes: { createdAt: number }
  }
}

let _db: IDBPDatabase<DocStore> | null = null

export async function getDb(): Promise<IDBPDatabase<DocStore>> {
  if (_db) return _db
  _db = await openDB<DocStore>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        const store = db.createObjectStore('documents', { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt')
      }
      if (oldVersion < 2) {
        tx.objectStore('documents').createIndex('category', 'category')
      }
      if (oldVersion < 3) {
        const store = db.createObjectStore('chunks', { keyPath: 'id' })
        store.createIndex('docId', 'docId')
      }
      if (oldVersion < 4) {
        const store = db.createObjectStore('chat_histories', { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt')
      }
    },
  })
  return _db
}
