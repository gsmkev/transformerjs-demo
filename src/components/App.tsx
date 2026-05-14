'use client'

import { useState } from 'react'
import type { Tab } from '@/types/ocr'
import { useEngineManager } from '@/hooks/useEngineManager'
import { useSelectedEngine } from '@/hooks/useSelectedEngine'
import { useImageLoader } from '@/hooks/useImageLoader'
import { useOcr } from '@/hooks/useOcr'
import TabBar from '@/components/tabs/TabBar'
import EngineGrid from '@/components/engines/EngineGrid'
import OcrView from '@/components/ocr/OcrView'

export default function App() {
  const [tab, setTab] = useState<Tab>('engines')

  const { engineStates, workersRef, initEngine, retryEngine } = useEngineManager()
  const { selectedId, setSelectedId } = useSelectedEngine()
  const imageLoader = useImageLoader()
  const ocr = useOcr({ workersRef, selectedId })

  const handleRunOcr = () => {
    if (imageLoader.file) ocr.execute(imageLoader.file)
  }

  return (
    <div className="min-h-screen bg-base text-ink">
      <header className="border-b border-rim px-4 sm:px-6 py-4">
        <h1 className="text-lg font-bold text-ink">Local OCR</h1>
        <p className="text-xs text-dim mt-0.5">100% on-device · no data leaves your browser</p>
      </header>

      <main className="max-w-4xl mx-auto">
        <TabBar active={tab} onChange={setTab} />

        <div id="panel-engines" role="tabpanel" hidden={tab !== 'engines'}>
          <EngineGrid
            engineStates={engineStates}
            selectedId={selectedId}
            onLoad={initEngine}
            onRetry={retryEngine}
            onSelect={setSelectedId}
          />
        </div>

        <div id="panel-ocr" role="tabpanel" hidden={tab !== 'ocr'}>
          <OcrView
            selectedId={selectedId}
            engineStates={engineStates}
            onSelectEngine={setSelectedId}
            imageLoader={imageLoader}
            ocrResult={ocr.result}
            ocrError={ocr.error}
            ocrRunning={ocr.running}
            onRunOcr={handleRunOcr}
          />
        </div>
      </main>
    </div>
  )
}
