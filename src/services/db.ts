import { openDB, type IDBPDatabase } from 'idb'
import type { ScannedDocument } from '@/types/document'

const DB_NAME = 'local-ocr-v1'
const DB_VERSION = 1

export type DocStore = {
  documents: {
    key: string
    value: ScannedDocument
    indexes: { createdAt: number }
  }
}

let _db: IDBPDatabase<DocStore> | null = null

export async function getDb(): Promise<IDBPDatabase<DocStore>> {
  if (_db) return _db
  _db = await openDB<DocStore>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('documents')) {
        const store = db.createObjectStore('documents', { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt')
      }
    },
  })
  return _db
}
