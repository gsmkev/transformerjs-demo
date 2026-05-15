'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Collection } from '@/types/document'
import { saveCollection, getAllCollections, updateCollection, deleteCollection } from '@/services/collectionStorage'

const COLLECTION_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
]

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([])

  useEffect(() => {
    getAllCollections().then(setCollections)
  }, [])

  const create = useCallback(async (name: string): Promise<Collection> => {
    const colorIdx = collections.length % COLLECTION_COLORS.length
    const col: Collection = {
      id: crypto.randomUUID(),
      name: name.trim(),
      color: COLLECTION_COLORS[colorIdx],
      createdAt: Date.now(),
    }
    await saveCollection(col)
    setCollections((prev) => [...prev, col])
    return col
  }, [collections.length])

  const rename = useCallback(async (id: string, name: string): Promise<void> => {
    await updateCollection(id, { name: name.trim() })
    setCollections((prev) => prev.map((c) => c.id === id ? { ...c, name: name.trim() } : c))
  }, [])

  const remove = useCallback(async (id: string): Promise<void> => {
    await deleteCollection(id)
    setCollections((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return { collections, create, rename, remove } as const
}
