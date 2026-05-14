'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ScannedDocument } from '@/types/document'
import {
  saveDocument,
  getAllDocuments,
  updateDocument,
  deleteDocument,
} from '@/services/documentStorage'

type CreatePayload = Omit<ScannedDocument, 'id' | 'createdAt' | 'updatedAt' | 'embedding'>

export function useDocuments() {
  const [documents, setDocuments] = useState<ScannedDocument[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const all = await getAllDocuments()
    setDocuments(all.sort((a, b) => b.createdAt - a.createdAt))
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const create = useCallback(async (data: CreatePayload): Promise<ScannedDocument> => {
    const doc: ScannedDocument = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      embedding: null,
    }
    await saveDocument(doc)
    setDocuments((prev) => [doc, ...prev])
    return doc
  }, [])

  const update = useCallback(async (id: string, patch: Partial<ScannedDocument>): Promise<void> => {
    const merged = { ...patch, updatedAt: Date.now() }
    await updateDocument(id, merged)
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...merged } : d)))
  }, [])

  const remove = useCallback(async (id: string): Promise<void> => {
    await deleteDocument(id)
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }, [])

  return { documents, loading, create, update, remove, refresh } as const
}
