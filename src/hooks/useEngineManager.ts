'use client'

import { useRef, useState, useCallback } from 'react'
import type Tesseract from 'tesseract.js'
import { ENGINES } from '@/config/engines'
import { buildWorker } from '@/services/tesseractService'
import type { EngineState, EngineStateMap, WorkerMap } from '@/types/ocr'

function initialStates(): EngineStateMap {
  return Object.fromEntries(
    ENGINES.map((e) => [e.id, { status: 'idle', progress: 0, stepLabel: '', errorMsg: '' } satisfies EngineState]),
  )
}

function patch(prev: EngineStateMap, id: string, delta: Partial<EngineState>): EngineStateMap {
  return { ...prev, [id]: { ...prev[id], ...delta } }
}

export function useEngineManager() {
  const workersRef = useRef<WorkerMap>(new Map())
  const [engineStates, setEngineStates] = useState<EngineStateMap>(initialStates)

  const initEngine = useCallback(async (engineId: string) => {
    const engine = ENGINES.find((e) => e.id === engineId)
    if (!engine) return

    const existing = workersRef.current.get(engineId)
    if (existing) return

    setEngineStates((prev) => patch(prev, engineId, { status: 'loading', progress: 0, stepLabel: 'Starting…', errorMsg: '' }))

    try {
      const worker = await buildWorker(engine, (pct, step) => {
        setEngineStates((prev) => patch(prev, engineId, { progress: pct, stepLabel: step }))
      })
      workersRef.current.set(engineId, worker)
      setEngineStates((prev) => patch(prev, engineId, { status: 'ready', progress: 100, stepLabel: 'Ready' }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setEngineStates((prev) => patch(prev, engineId, { status: 'error', errorMsg: msg }))
    }
  }, [])

  const isWorkerReady = useCallback(
    (engineId: string) => workersRef.current.has(engineId) && engineStates[engineId]?.status === 'ready',
    [engineStates],
  )

  return { engineStates, workersRef, initEngine, isWorkerReady } as const
}
