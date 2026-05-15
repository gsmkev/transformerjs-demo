'use client'

import { useState, useCallback } from 'react'
import type { Tab } from '@/types/ocr'
import { useEngineManager } from '@/hooks/useEngineManager'
import { useSelectedEngine } from '@/hooks/useSelectedEngine'
import { useImageLoader } from '@/hooks/useImageLoader'
import { useOcr } from '@/hooks/useOcr'
import { useDocuments } from '@/hooks/useDocuments'
import { useRag } from '@/hooks/useRag'
import { classifyDocument } from '@/services/categoryService'
import { indexDocument, removeDocumentChunks } from '@/services/chunkService'
import TabBar from '@/components/tabs/TabBar'
import EngineGrid from '@/components/engines/EngineGrid'
import OcrView from '@/components/ocr/OcrView'
import DocumentList from '@/components/documents/DocumentList'
import DocumentEditor from '@/components/documents/DocumentEditor'
import RagView from '@/components/rag/RagView'
import DashboardView from '@/components/dashboard/DashboardView'
import InstallButton from '@/components/ui/InstallButton'

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { engineStates, workersRef, initEngine, retryEngine } = useEngineManager()
  const { selectedId, setSelectedId } = useSelectedEngine()
  const imageLoader = useImageLoader()
  const ocr = useOcr({ workersRef, selectedId })
  const { documents, chunks, loading: docsLoading, create, update, remove, refreshChunks } = useDocuments()
  const rag = useRag()

  const handleSave = useCallback(async () => {
    if (!imageLoader.dataUrl || !ocr.result) return
    setSaving(true)
    try {
      const firstLine = ocr.result.text.split('\n').find((l) => l.trim()) ?? 'Sin título'
      const category = classifyDocument(ocr.result.text)
      const doc = await create({
        title: firstLine.slice(0, 80),
        imageDataUrl: imageLoader.dataUrl,
        rawText: ocr.result.text,
        richText: '',
        engineId: selectedId,
        confidence: ocr.result.confidence,
        category,
      })
      setSelectedDocId(doc.id)
      setTab('documents')
    } finally {
      setSaving(false)
    }
  }, [imageLoader.dataUrl, ocr.result, create, selectedId])

  const handleEmbedDoc = useCallback(
    async (doc: (typeof documents)[number]) => {
      await indexDocument(doc.id, doc.rawText)
      // Use [1] as a truthy flag — actual embeddings live in the chunks store
      await update(doc.id, { embedding: [1] })
      await refreshChunks()
    },
    [update, refreshChunks],
  )

  const handleEmbedAll = useCallback(async () => {
    for (const doc of documents.filter((d) => d.embedding === null)) {
      await handleEmbedDoc(doc)
    }
  }, [documents, handleEmbedDoc])

  const handleRemoveDoc = useCallback(async (id: string) => {
    await removeDocumentChunks(id)
    await remove(id)
    await refreshChunks()
  }, [remove, refreshChunks])

  const selectedDoc = selectedDocId ? documents.find((d) => d.id === selectedDocId) : null

  return (
    <div className="min-h-screen text-ink">
      {/* Sticky glass header */}
      <header className="sticky top-0 z-40 border-b border-white/7 bg-base/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center shadow-accent-glow-sm flex-shrink-0" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <rect x="14" y="8" width="26" height="34" rx="2" fill="white" opacity="0.95"/>
                <polygon points="40,8 40,17 49,17" fill="rgba(15,118,110,0.8)"/>
                <line x1="18" y1="21" x2="35" y2="21" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="18" y1="27" x2="35" y2="27" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="18" y1="33" x2="29" y2="33" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold gradient-text leading-none">Papeleo</h1>
              <p className="text-[10px] text-dim/70 mt-0.5 leading-none">Tu vida, sin papeles</p>
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
        <div id="panel-home" role="tabpanel" hidden={tab !== 'home'}>
          <DashboardView documents={documents} onNavigate={setTab} />
        </div>
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
              onDelete={async (id) => { await handleRemoveDoc(id); setSelectedDocId(null) }}
            />
          ) : (
            <DocumentList documents={documents} loading={docsLoading} onOpen={setSelectedDocId} onDelete={handleRemoveDoc} />
          )}
        </div>
        <div id="panel-rag" role="tabpanel" hidden={tab !== 'rag'}>
          <RagView documents={documents} chunks={chunks} rag={rag} onEmbedDoc={handleEmbedDoc} onEmbedAll={handleEmbedAll} />
        </div>
      </main>
    </div>
  )
}
