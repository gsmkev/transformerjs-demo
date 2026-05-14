import { openDB, type IDBPDatabase } from 'idb'
import type { ScannedDocument } from '@/types/document'

const DB_NAME = 'local-ocr-v1'
const DB_VERSION = 2

export type DocStore = {
  documents: {
    key: string
    value: ScannedDocument
    indexes: { createdAt: number; category: string }
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
    },
  })
  return _db
}
