'use client'

import { useState, useCallback, useRef } from 'react'
import { nanoid } from 'nanoid'
import { classifyDocument } from '@/services/categoryService'
import type { ScannedDocument } from '@/types/document'

export interface BatchItem {
  id: string
  file: File
  dataUrl: string
  status: 'pending' | 'processing' | 'done' | 'error'
  error?: string
  docId?: string
}

interface BatchOcrDeps {
  selectedEngineId: string
  runOcr: (file: File) => Promise<{ text: string; confidence: number | null }>
  create: (data: Omit<ScannedDocument, 'id' | 'createdAt' | 'updatedAt' | 'embedding'>) => Promise<ScannedDocument>
}

export function useBatchOcr({ selectedEngineId, runOcr, create }: BatchOcrDeps) {
  const [queue, setQueue] = useState<BatchItem[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const cancelRef = useRef(false)

  const setItemStatus = useCallback((id: string, status: BatchItem['status'], extra: Partial<BatchItem> = {}) => {
    setQueue((prev) => prev.map((item) => item.id === id ? { ...item, status, ...extra } : item))
  }, [])

  const addFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    Promise.all(imageFiles.map((f) => new Promise<BatchItem>((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        resolve({
          id: nanoid(),
          file: f,
          dataUrl: e.target?.result as string,
          status: 'pending',
        })
      }
      reader.readAsDataURL(f)
    }))).then((items) => {
      setQueue((prev) => [...prev, ...items])
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id || item.status !== 'pending'))
  }, [])

  const clearQueue = useCallback(() => {
    setQueue([])
    setProgress({ done: 0, total: 0 })
    cancelRef.current = false
  }, [])

  const startBatch = useCallback(async () => {
    const pending = queue.filter((i) => i.status === 'pending')
    if (pending.length === 0) return

    setRunning(true)
    cancelRef.current = false
    setProgress({ done: 0, total: pending.length })

    for (const item of pending) {
      if (cancelRef.current) break
      setItemStatus(item.id, 'processing')
      try {
        const result = await runOcr(item.file)
        const firstLine = result.text.split('\n').find((l) => l.trim()) ?? 'Sin título'
        const category = classifyDocument(result.text)
        const doc = await create({
          title: firstLine.slice(0, 80),
          imageDataUrl: item.dataUrl,
          rawText: result.text,
          richText: '',
          engineId: selectedEngineId,
          confidence: result.confidence,
          category,
          tags: [],
        })
        setItemStatus(item.id, 'done', { docId: doc.id })
      } catch (err) {
        setItemStatus(item.id, 'error', { error: String(err).replace('Error: ', '') })
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }))
    }

    setRunning(false)
  }, [queue, runOcr, create, selectedEngineId, setItemStatus])

  const cancel = useCallback(() => {
    cancelRef.current = true
  }, [])

  return { queue, running, progress, addFiles, removeItem, clearQueue, startBatch, cancel }
}
