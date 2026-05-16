'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Tab } from '@/types/ocr'
import { useEngineManager } from '@/hooks/useEngineManager'
import { useSelectedEngine } from '@/hooks/useSelectedEngine'
import { useImageLoader } from '@/hooks/useImageLoader'
import { useOcr } from '@/hooks/useOcr'
import { useDocuments } from '@/hooks/useDocuments'
import { useRag } from '@/hooks/useRag'
import { useChatHistory } from '@/hooks/useChatHistory'
import { useBatchOcr } from '@/hooks/useBatchOcr'
import { useCollections } from '@/hooks/useCollections'
import { findNearDuplicates } from '@/services/duplicateDetectionService'
import type { DuplicateResult } from '@/services/duplicateDetectionService'
import DuplicateWarning from '@/components/ui/DuplicateWarning'
import { classifyDocument } from '@/services/categoryService'
import { summarizeDocument } from '@/services/summaryService'
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
import { usePinLock } from '@/hooks/usePinLock'
import LockScreen from '@/components/ui/LockScreen'
import { useAudioTranscription } from '@/hooks/useAudioTranscription'
import { useA11y } from '@/hooks/useA11y'
import ProfileDrawer from '@/components/layout/ProfileDrawer'
import ScannerSheet from '@/components/scanner/ScannerSheet'

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [activeKey, setActiveKey] = useState(0)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateResult[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const pinLock = usePinLock()
  const { theme, choice: themeChoice, setThemeChoice, toggle } = useTheme()
  const a11y = useA11y()
  const [profileOpen, setProfileOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const { engineStates, workersRef, initEngine, retryEngine } = useEngineManager()
  const { selectedId, setSelectedId } = useSelectedEngine()
  const imageLoader = useImageLoader()
  const ocr = useOcr({ workersRef, selectedId })
  const { documents, chunks, loading: docsLoading, create, update, remove, refresh, refreshChunks, addExportEntry } = useDocuments()
  const batchOcr = useBatchOcr({
    selectedEngineId: selectedId,
    runOcr: (file: File) => ocr.executeAndReturn(file),
    create,
  })
  const chatLimit = (() => {
    if (typeof window === 'undefined') return 25
    try {
      const stored = localStorage.getItem('papeleo_chat_limit')
      if (stored === 'Infinity') return Infinity
      const n = Number(stored)
      return isNaN(n) ? 25 : n
    } catch { return 25 }
  })()

  const chatHistory = useChatHistory({ limit: chatLimit })

  const { collections, create: createCollection, rename: renameCollection, remove: removeCollection } = useCollections()

  const rag = useRag({ onAfterChat: chatHistory.saveHistory })

  const audio = useAudioTranscription()
  const [audioSaving, setAudioSaving] = useState(false)

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
        imageDataUrl: imageLoader.adjustedDataUrl ?? imageLoader.dataUrl,
        rawText: ocr.result.text,
        richText: '',
        engineId: selectedId,
        confidence: ocr.result.confidence,
        category,
      })
      const dupes = await findNearDuplicates(ocr.result.text, chunks, documents, doc.id)
      if (dupes.length > 0) setDuplicateWarning(dupes)
      setSelectedDocId(doc.id)
      handleTabChange('documents')
    } finally {
      setSaving(false)
    }
  }, [imageLoader.adjustedDataUrl, imageLoader.dataUrl, ocr.result, create, selectedId, handleTabChange, chunks, documents])

  const handleAudioSave = useCallback(async (text: string) => {
    setAudioSaving(true)
    try {
      const firstLine = text.split('\n').find((l) => l.trim()) ?? 'Transcripción de audio'
      const category = classifyDocument(text)
      const doc = await create({
        title: firstLine.slice(0, 80),
        imageDataUrl: '',
        rawText: text,
        richText: '',
        engineId: 'whisper-tiny',
        confidence: null,
        category,
      })
      setSelectedDocId(doc.id)
      handleTabChange('documents')
    } finally {
      setAudioSaving(false)
    }
  }, [create, handleTabChange])

  const handleEmbedDoc = useCallback(
    async (doc: (typeof documents)[number]) => {
      await indexDocument(doc.id, doc.rawText)
      const summary = await summarizeDocument(doc.rawText, rag.selectedLlmId)
      await update(doc.id, { embedding: [1], ...(summary ? { summary } : {}) })
      await refreshChunks()
    },
    [update, refreshChunks, rag.selectedLlmId],
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

  const handleFab = useCallback(() => setScannerOpen(true), [])

  const handleScannerImage = useCallback(() => {
    setScannerOpen(false)
    handleTabChange('ocr')
  }, [handleTabChange])

  const handleScannerAudio = useCallback(() => {
    setScannerOpen(false)
    handleTabChange('ocr')
  }, [handleTabChange])

  const selectedDoc = selectedDocId ? documents.find((d) => d.id === selectedDocId) : null
  const allTags = Array.from(new Set(documents.flatMap((d) => d.tags ?? []))).sort()

  if (pinLock.isLocked) {
    return (
      <LockScreen
        hasWebAuthn={pinLock.hasWebAuthn}
        onUnlock={pinLock.unlock}
        onUnlockBiometric={pinLock.unlockWithBiometric}
        onReset={pinLock.resetAll}
      />
    )
  }

  return (
    <div className="min-h-screen text-ink">
      <header className="sticky top-0 z-40 border-b border-rim bg-base/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 64 64">
                <rect x="14" y="8" width="26" height="34" rx="2" fill="white" opacity="0.95"/>
                <polygon points="40,8 40,17 49,17" fill="rgba(255,255,255,0.5)"/>
                <line x1="18" y1="21" x2="35" y2="21" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
                <line x1="18" y1="27" x2="35" y2="27" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
                <line x1="18" y1="33" x2="29" y2="33" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
              </svg>
            </div>
            <h1 className="text-base font-bold text-ink">Archivo</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Buscar documentos"
              className="p-2 rounded-lg hover:bg-surface transition-colors text-dim hover:text-ink"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-label="Perfil y ajustes"
              className="p-2 rounded-lg hover:bg-surface transition-colors text-dim hover:text-ink"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </button>
          </div>
        </div>
        {/* Desktop top TabBar (hidden on mobile) */}
        <div className="hidden sm:block">
          <TabBar active={tab} onChange={handleTabChange} />
        </div>
      </header>

      {/* Fixed bottom tab bar — mobile only */}
      <TabBar variant="bottom" active={tab} onChange={handleTabChange} onFab={handleFab} fabPulse={documents.length === 0} />

      {/* Main content */}
      <main className="max-w-4xl mx-auto mb-20 sm:mb-0">
        <div id="panel-home" role="tabpanel" aria-hidden={tab !== 'home'} className={tab !== 'home' ? 'hidden' : ''}>
          <div key={tab === 'home' ? activeKey : 0} className={tab === 'home' ? 'tab-panel-enter' : ''}>
            <DashboardView
                documents={documents}
                collections={collections}
                onOpenScanner={() => handleTabChange('ocr')}
                onOpenDoc={(id) => { setSelectedDocId(id); handleTabChange('documents') }}
                onOpenSecurity={() => setSettingsOpen(true)}
                onOpenModels={() => handleTabChange('engines')}
                onNavigateRag={() => handleTabChange('rag')}
              />
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
                const sourceUrl = imageLoader.adjustedDataUrl ?? imageLoader.dataUrl
                if (imageLoader.adjustedDataUrl || imageLoader.file?.type === 'application/pdf' || imageLoader.pages.length > 1) {
                  const [header, b64] = sourceUrl.split(',')
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
              batchOcr={batchOcr}
              onNavigateToLibrary={() => handleTabChange('documents')}
              audio={audio}
              onAudioSave={handleAudioSave}
              audioSaving={audioSaving}
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
                llmModelId={rag.selectedLlmId}
                llmReady={rag.llmStatus === 'ready'}
                onUpdate={update}
                onEmbed={handleEmbedDoc}
                onBack={() => setSelectedDocId(null)}
                onDelete={async (id) => { await handleRemoveDoc(id); setSelectedDocId(null) }}
                addExportEntry={addExportEntry}
                collections={collections}
                onAssignCollection={(collectionId) => update(selectedDoc.id, { collectionId })}
              />
            ) : (
              <DocumentList
                documents={documents}
                loading={docsLoading}
                onOpen={setSelectedDocId}
                onDelete={handleRemoveDoc}
                onScanClick={() => handleTabChange('ocr')}
                collections={collections}
                onCreateCollection={(name) => createCollection(name).then(() => undefined)}
                onRenameCollection={renameCollection}
                onDeleteCollection={removeCollection}
              />
            )}
          </div>
        </div>
        <div id="panel-rag" role="tabpanel" aria-hidden={tab !== 'rag'} className={tab !== 'rag' ? 'hidden' : ''}>
          <div key={tab === 'rag' ? activeKey : 0} className={tab === 'rag' ? 'tab-panel-enter' : ''}>
            <RagView documents={documents} chunks={chunks} rag={rag} chatHistory={chatHistory} onEmbedDoc={handleEmbedDoc} onEmbedAll={handleEmbedAll} onNavigateToModels={() => handleTabChange('engines')} />
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
          pinLock={pinLock}
        />
      )}

      {duplicateWarning.length > 0 && (
        <DuplicateWarning
          duplicates={duplicateWarning}
          onOpenDoc={(id) => { setSelectedDocId(id); handleTabChange('documents') }}
          onDismiss={() => setDuplicateWarning([])}
        />
      )}

      <ProfileDrawer
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        themeChoice={themeChoice}
        onThemeChange={setThemeChoice}
        a11y={a11y.prefs}
        onA11yChange={a11y.update}
        onOpenModels={() => { setProfileOpen(false); handleTabChange('engines') }}
        onOpenSecurity={() => { setProfileOpen(false); setSettingsOpen(true) }}
        embedStatus={rag.embedStatus}
        llmStatus={rag.llmStatus}
        rerankerStatus={rag.rerankerStatus}
      />

      <ScannerSheet
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onSelectImage={handleScannerImage}
        onSelectAudio={handleScannerAudio}
      />
    </div>
  )
}
