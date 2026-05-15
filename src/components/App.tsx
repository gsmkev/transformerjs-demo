'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
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
import ModelsView from '@/components/models/ModelsView'
import OcrView from '@/components/ocr/OcrView'
import DocumentList from '@/components/documents/DocumentList'
import DocumentEditor from '@/components/documents/DocumentEditor'
import RagView from '@/components/rag/RagView'
import DashboardView from '@/components/dashboard/DashboardView'
import InstallButton from '@/components/ui/InstallButton'
import { useTheme } from '@/hooks/useTheme'
import SearchOverlay from '@/components/search/SearchOverlay'
import SettingsModal from '@/components/ui/SettingsModal'

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [activeKey, setActiveKey] = useState(0)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { theme, toggle } = useTheme()
  const { engineStates, workersRef, initEngine, retryEngine } = useEngineManager()
  const { selectedId, setSelectedId } = useSelectedEngine()
  const imageLoader = useImageLoader()
  const ocr = useOcr({ workersRef, selectedId })
  const { documents, chunks, loading: docsLoading, create, update, remove, refresh, refreshChunks } = useDocuments()
  const rag = useRag()

  const handleTabChange = useCallback((t: Tab) => {
    setTab(t)
    setActiveKey((k) => k + 1)
    if (t !== 'documents') setSelectedDocId(null)
  }, [])

  const dropzoneCameraRef = useRef<HTMLInputElement>(null)

  const handleCameraCapture = useCallback(() => {
    handleTabChange('ocr')
    setTimeout(() => dropzoneCameraRef.current?.click(), 150)
  }, [handleTabChange])

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
      handleTabChange('documents')
    } finally {
      setSaving(false)
    }
  }, [imageLoader.dataUrl, ocr.result, create, selectedId, handleTabChange])

  const handleEmbedDoc = useCallback(
    async (doc: (typeof documents)[number]) => {
      await indexDocument(doc.id, doc.rawText)
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

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const handleSearchNavigate = useCallback((docId: string) => {
    setSelectedDocId(docId)
    handleTabChange('documents')
  }, [handleTabChange])

  const selectedDoc = selectedDocId ? documents.find((d) => d.id === selectedDocId) : null
  const allTags = Array.from(new Set(documents.flatMap((d) => d.tags ?? []))).sort()

  return (
    <div className="min-h-screen text-ink">
      {/* Sticky glass header */}
      <header className="sticky top-0 z-40 border-b border-[var(--glass-border)] bg-base/80 backdrop-blur-xl">
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
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Buscar documentos (Cmd+K)"
            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-dim hover:text-ink flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Ajustes"
            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-dim hover:text-ink flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-dim hover:text-ink flex-shrink-0"
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
          <InstallButton />
        </div>
      </header>

      {/* Sticky top tab bar — desktop only */}
      <div className="hidden sm:block sticky top-[57px] z-30 bg-base/80 backdrop-blur-xl border-b border-[var(--glass-border)]">
        <div className="max-w-4xl mx-auto">
          <TabBar active={tab} onChange={handleTabChange} />
        </div>
      </div>

      {/* Fixed bottom tab bar — mobile only */}
      <TabBar variant="bottom" active={tab} onChange={handleTabChange} />

      {/* Main content */}
      <main className="max-w-4xl mx-auto mb-20 sm:mb-0">
        <div id="panel-home" role="tabpanel" aria-hidden={tab !== 'home'} className={tab !== 'home' ? 'hidden' : ''}>
          <div key={tab === 'home' ? activeKey : 0} className={tab === 'home' ? 'tab-panel-enter' : ''}>
            <DashboardView documents={documents} onNavigate={handleTabChange} onCameraCapture={handleCameraCapture} />
          </div>
        </div>
        <div id="panel-engines" role="tabpanel" aria-hidden={tab !== 'engines'} className={tab !== 'engines' ? 'hidden' : ''}>
          <div key={tab === 'engines' ? activeKey : 0} className={tab === 'engines' ? 'tab-panel-enter' : ''}>
            <ModelsView
              engineStates={engineStates} selectedId={selectedId} onLoad={initEngine} onRetry={retryEngine} onSelect={setSelectedId}
              embedStatus={rag.embedStatus} embedProgress={rag.embedProgress} embedError={rag.embedError} loadEmbedModel={rag.loadEmbedModel}
              rerankerStatus={rag.rerankerStatus} rerankerProgress={rag.rerankerProgress} rerankerError={rag.rerankerError} loadReranker={rag.loadReranker}
              llmStatus={rag.llmStatus} llmProgress={rag.llmProgress} llmProgressText={rag.llmProgressText} llmError={rag.llmError} loadLlm={rag.loadLlm}
              selectedLlmId={rag.selectedLlmId} setSelectedLlmId={rag.setSelectedLlmId} webGpuAvailable={rag.webGpuAvailable}
              responseLength={rag.responseLength} setResponseLength={rag.setResponseLength}
            />
          </div>
        </div>
        <div id="panel-ocr" role="tabpanel" aria-hidden={tab !== 'ocr'} className={tab !== 'ocr' ? 'hidden' : ''}>
          <div key={tab === 'ocr' ? activeKey : 0} className={tab === 'ocr' ? 'tab-panel-enter' : ''}>
            <OcrView
              selectedId={selectedId}
              engineStates={engineStates}
              onSelectEngine={setSelectedId}
              imageLoader={imageLoader}
              ocrResult={ocr.result}
              ocrError={ocr.error}
              ocrRunning={ocr.running}
              onRunOcr={() => {
                if (!imageLoader.dataUrl) return
                if (imageLoader.pages.length > 1) {
                  const [header, b64] = imageLoader.dataUrl.split(',')
                  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
                  const binary = atob(b64)
                  const bytes = new Uint8Array(binary.length)
                  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
                  const f = new File([bytes], 'multipage.jpg', { type: mime })
                  ocr.execute(f)
                } else if (imageLoader.file) {
                  ocr.execute(imageLoader.file)
                }
              }}
              onSave={handleSave}
              saving={saving}
              cameraInputRef={dropzoneCameraRef}
            />
          </div>
        </div>
        <div id="panel-documents" role="tabpanel" aria-hidden={tab !== 'documents'} className={tab !== 'documents' ? 'hidden' : ''}>
          <div key={tab === 'documents' ? activeKey : 0} className={tab === 'documents' ? 'tab-panel-enter' : ''}>
            {selectedDoc ? (
              <DocumentEditor
                doc={selectedDoc}
                ragModelReady={rag.embedStatus === 'ready'}
                allTags={allTags}
                onUpdate={update}
                onEmbed={handleEmbedDoc}
                onBack={() => setSelectedDocId(null)}
                onDelete={async (id) => { await handleRemoveDoc(id); setSelectedDocId(null) }}
              />
            ) : (
              <DocumentList
                documents={documents}
                loading={docsLoading}
                onOpen={setSelectedDocId}
                onDelete={handleRemoveDoc}
                onScanClick={() => handleTabChange('ocr')}
              />
            )}
          </div>
        </div>
        <div id="panel-rag" role="tabpanel" aria-hidden={tab !== 'rag'} className={tab !== 'rag' ? 'hidden' : ''}>
          <div key={tab === 'rag' ? activeKey : 0} className={tab === 'rag' ? 'tab-panel-enter' : ''}>
            <RagView documents={documents} chunks={chunks} rag={rag} onEmbedDoc={handleEmbedDoc} onEmbedAll={handleEmbedAll} onNavigateToModels={() => handleTabChange('engines')} />
          </div>
        </div>
      </main>

      {searchOpen && (
        <SearchOverlay
          documents={documents}
          onNavigate={handleSearchNavigate}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          documents={documents}
          onClose={() => setSettingsOpen(false)}
          onImportComplete={() => {
            if (typeof refresh === 'function') refresh()
            else window.location.reload()
          }}
        />
      )}
    </div>
  )
}
