'use client'

import { useState, useCallback } from 'react'
import type { Tab, OcrResult } from '@/types/ocr'
import { useEngineManager } from '@/hooks/useEngineManager'
import { useSelectedEngine } from '@/hooks/useSelectedEngine'
import { useImageLoader } from '@/hooks/useImageLoader'
import { runOcr } from '@/services/tesseractService'
import TabBar from '@/components/tabs/TabBar'
import EngineGrid from '@/components/engines/EngineGrid'
import OcrView from '@/components/ocr/OcrView'

export default function App() {
  const [tab, setTab] = useState<Tab>('engines')
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [ocrRunning, setOcrRunning] = useState(false)

  const { engineStates, workersRef, initEngine } = useEngineManager()
  const { selectedId, setSelectedId } = useSelectedEngine()
  const imageLoader = useImageLoader()

  const handleRunOcr = useCallback(async () => {
    const worker = workersRef.current.get(selectedId)
    if (!worker || !imageLoader.file) return

    setOcrRunning(true)
    setOcrError(null)
    setOcrResult(null)

    try {
      const result = await runOcr(worker, imageLoader.file)
      setOcrResult(result)
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : String(err))
    } finally {
      setOcrRunning(false)
    }
  }, [selectedId, imageLoader.file, workersRef])

  return (
    <div className="min-h-screen bg-base text-ink">
      <header className="border-b border-rim px-4 sm:px-6 py-4">
        <h1 className="text-lg font-bold text-ink">Local OCR</h1>
        <p className="text-xs text-dim mt-0.5">100% on-device · no data leaves your browser</p>
      </header>

      <main className="max-w-4xl mx-auto">
        <TabBar active={tab} onChange={setTab} />

        {tab === 'engines' ? (
          <EngineGrid
            engineStates={engineStates}
            selectedId={selectedId}
            onLoad={initEngine}
            onSelect={setSelectedId}
          />
        ) : (
          <OcrView
            selectedId={selectedId}
            engineStates={engineStates}
            onSelectEngine={setSelectedId}
            imageLoader={imageLoader}
            ocrResult={ocrResult}
            ocrError={ocrError}
            ocrRunning={ocrRunning}
            onRunOcr={handleRunOcr}
          />
        )}
      </main>
    </div>
  )
}
