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

  // ── Save OCR result to library ───────────────────────────────────────────

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

  // ── RAG embed helpers ────────────────────────────────────────────────────

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
    <div className="min-h-screen bg-base text-ink">
      <header className="border-b border-rim px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink">Local OCR</h1>
          <p className="text-xs text-dim mt-0.5">100% on-device · no data leaves your browser</p>
        </div>
        <InstallButton />
      </header>

      <main className="max-w-4xl mx-auto">
        <TabBar active={tab} onChange={(t) => { setTab(t); if (t !== 'documents') setSelectedDocId(null) }} />

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
            <DocumentList
              documents={documents}
              loading={docsLoading}
              onOpen={setSelectedDocId}
              onDelete={remove}
            />
          )}
        </div>

        <div id="panel-rag" role="tabpanel" hidden={tab !== 'rag'}>
          <RagView
            documents={documents}
            rag={rag}
            onEmbedDoc={handleEmbedDoc}
            onEmbedAll={handleEmbedAll}
          />
        </div>
      </main>
    </div>
  )
}
