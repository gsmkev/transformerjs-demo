'use client'

import { useState, useCallback } from 'react'
import type { Tab } from '@/types/ocr'
import { useEngineManager } from '@/hooks/useEngineManager'
import { useSelectedEngine } from '@/hooks/useSelectedEngine'
import { useImageLoader } from '@/hooks/useImageLoader'
import { useOcr } from '@/hooks/useOcr'
import { useDocuments } from '@/hooks/useDocuments'
import { useRag } from '@/hooks/useRag'
import TabBar from '@/components/tabs/TabBar'
import EngineGrid from '@/components/engines/EngineGrid'
import OcrView from '@/components/ocr/OcrView'
import DocumentList from '@/components/documents/DocumentList'
import DocumentEditor from '@/components/documents/DocumentEditor'
import RagView from '@/components/rag/RagView'
import InstallButton from '@/components/ui/InstallButton'

export default function App() {
  const [tab, setTab] = useState<Tab>('engines')
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { engineStates, workersRef, initEngine, retryEngine } = useEngineManager()
  const { selectedId, setSelectedId } = useSelectedEngine()
  const imageLoader = useImageLoader()
  const ocr = useOcr({ workersRef, selectedId })
  const { documents, loading: docsLoading, create, update, remove } = useDocuments()
  const rag = useRag()

  const handleSave = useCallback(async () => {
    if (!imageLoader.dataUrl || !ocr.result) return
    setSaving(true)
    try {
      const firstLine = ocr.result.text.split('\n').find((l) => l.trim()) ?? 'Untitled'
      const doc = await create({
        title: firstLine.slice(0, 80),
        imageDataUrl: imageLoader.dataUrl,
        rawText: ocr.result.text,
        richText: '',
        engineId: selectedId,
        confidence: ocr.result.confidence,
      })
      setSelectedDocId(doc.id)
      setTab('documents')
    } finally {
      setSaving(false)
    }
  }, [imageLoader.dataUrl, ocr.result, create, selectedId])

  const handleEmbedDoc = useCallback(
    async (doc: (typeof documents)[number]) => {
      const embedding = await rag.embedDoc(doc)
      await update(doc.id, { embedding })
    },
    [rag, update],
  )

  const handleEmbedAll = useCallback(async () => {
    for (const doc of documents.filter((d) => d.embedding === null)) {
      await handleEmbedDoc(doc)
    }
  }, [documents, handleEmbedDoc])

  const selectedDoc = selectedDocId ? documents.find((d) => d.id === selectedDocId) : null

  return (
    <div className="min-h-screen text-ink">
      {/* Sticky glass header */}
      <header className="sticky top-0 z-40 border-b border-white/7 bg-base/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-violet-500 flex items-center justify-center shadow-accent-glow-sm flex-shrink-0" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="3" y1="15" x2="21" y2="15"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
                <line x1="15" y1="3" x2="15" y2="21"/>
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold gradient-text leading-none">Local OCR</h1>
              <p className="text-[10px] text-dim/70 mt-0.5 leading-none">100% on-device · private</p>
            </div>
          </div>
          <InstallButton />
        </div>
      </header>

      {/* Sticky tab bar */}
      <div className="sticky top-[57px] z-30 bg-base/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto">
          <TabBar active={tab} onChange={(t) => { setTab(t); if (t !== 'documents') setSelectedDocId(null) }} />
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-4xl mx-auto">
        <div id="panel-engines" role="tabpanel" hidden={tab !== 'engines'}>
          <EngineGrid engineStates={engineStates} selectedId={selectedId} onLoad={initEngine} onRetry={retryEngine} onSelect={setSelectedId} />
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
            onRunOcr={() => imageLoader.file && ocr.execute(imageLoader.file)}
            onSave={handleSave}
            saving={saving}
          />
        </div>
        <div id="panel-documents" role="tabpanel" hidden={tab !== 'documents'}>
          {selectedDoc ? (
            <DocumentEditor
              doc={selectedDoc}
              ragModelReady={rag.embedStatus === 'ready'}
              onUpdate={update}
              onEmbed={handleEmbedDoc}
              onBack={() => setSelectedDocId(null)}
              onDelete={async (id) => { await remove(id); setSelectedDocId(null) }}
            />
          ) : (
            <DocumentList documents={documents} loading={docsLoading} onOpen={setSelectedDocId} onDelete={remove} />
          )}
        </div>
        <div id="panel-rag" role="tabpanel" hidden={tab !== 'rag'}>
          <RagView documents={documents} rag={rag} onEmbedDoc={handleEmbedDoc} onEmbedAll={handleEmbedAll} />
        </div>
      </main>
    </div>
  )
}
