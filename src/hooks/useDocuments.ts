'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ScannedDocument, DocumentChunk, ExportHistoryEntry } from '@/types/document'
import {
  saveDocument,
  getAllDocuments,
  updateDocument,
  deleteDocument,
  getAllChunks,
} from '@/services/documentStorage'

type CreatePayload = Omit<ScannedDocument, 'id' | 'createdAt' | 'updatedAt' | 'embedding'>

export function useDocuments() {
  const [documents, setDocuments] = useState<ScannedDocument[]>([])
  const [chunks, setChunks]       = useState<DocumentChunk[]>([])
  const [loading, setLoading]     = useState(true)

  const refreshChunks = useCallback(async () => {
    const all = await getAllChunks()
    setChunks(all)
  }, [])

  const refresh = useCallback(async () => {
    const [allDocs, allChunks] = await Promise.all([getAllDocuments(), getAllChunks()])
    setDocuments(allDocs.sort((a, b) => b.createdAt - a.createdAt))
    setChunks(allChunks)
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

  const addExportEntry = useCallback(
    async (id: string, format: ExportHistoryEntry['format']) => {
      const doc = documents.find((d) => d.id === id)
      if (!doc) return
      const entry: ExportHistoryEntry = { format, exportedAt: Date.now() }
      await update(id, {
        exportHistory: [...(doc.exportHistory ?? []), entry],
      })
    },
    [documents, update],
  )

  return { documents, chunks, loading, create, update, remove, refresh, refreshChunks, addExportEntry } as const
}
