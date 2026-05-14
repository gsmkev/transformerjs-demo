'use client'

import { useState, useCallback } from 'react'
import type { OcrResult, WorkerMap } from '@/types/ocr'
import { runOcr } from '@/services/tesseractService'

interface UseOcrOptions {
  workersRef: React.RefObject<WorkerMap>
  selectedId: string
}

export function useOcr({ workersRef, selectedId }: UseOcrOptions) {
  const [result, setResult] = useState<OcrResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const execute = useCallback(async (file: File) => {
    const worker = workersRef.current?.get(selectedId)
    if (!worker) {
      setError('Engine not loaded. Go to Models tab and load the selected engine first.')
      return
    }

    setRunning(true)
    setError(null)
    setResult(null)

    try {
      const ocr = await runOcr(worker, file)
      setResult(ocr)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }, [workersRef, selectedId])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { result, error, running, execute, reset } as const
}
