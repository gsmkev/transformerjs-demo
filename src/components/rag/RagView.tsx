'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import type { ScannedDocument, DocumentChunk } from '@/types/document'
import type { useRag } from '@/hooks/useRag'
import type { useChatHistory } from '@/hooks/useChatHistory'
import { LLM_MODELS } from '@/config/llmModels'
import Button from '@/components/ui/Button'
import ChatMessage from './ChatMessage'
import ChatHistorySidebar from './ChatHistorySidebar'

interface Props {
  documents: ScannedDocument[]
  chunks: DocumentChunk[]
  rag: ReturnType<typeof useRag>
  chatHistory: ReturnType<typeof useChatHistory>
  onEmbedDoc: (doc: ScannedDocument) => Promise<void>
  onEmbedAll: () => Promise<void>
  onNavigateToModels: () => void
}

export default function RagView({ documents, chunks, rag, chatHistory, onEmbedDoc: _onEmbedDoc, onEmbedAll, onNavigateToModels }: Props) {
  const [input, setInput] = useState('')
  const [indexing, setIndexing] = useState(false)
  const [historySidebarOpen, setHistorySidebarOpen] = useState(false)
  const [showModelConfig, setShowModelConfig] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const embeddedCount = new Set(chunks.map((c) => c.docId)).size
  const activeLlm = LLM_MODELS.find((m) => m.id === rag.selectedLlmId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [rag.messages, rag.streaming])

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault()
    const q = input.trim()
    if (!q || rag.streaming) return
    setInput('')
    await rag.chat(q, documents, chunks)
  }

  const handleEmbedAll = async () => {
    setIndexing(true)
    try { await onEmbedAll() } finally { setIndexing(false) }
  }

  return (
    <div className="lg:grid lg:grid-cols-[220px_1fr] animate-fade-in">
      <ChatHistorySidebar
        histories={chatHistory.histories}
        activeId={chatHistory.activeId}
        onSelect={(id) => {
          const msgs = chatHistory.loadHistory(id)
          if (msgs) rag.loadMessages(msgs)
        }}
        onNew={() => {
          chatHistory.startNew()
          rag.clearChat()
        }}
        onDelete={chatHistory.deleteHistory}
        onRename={chatHistory.renameHistory}
        mobileOpen={historySidebarOpen}
        onMobileOpenChange={setHistorySidebarOpen}
      />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Mobile history button */}
        <div className="flex items-center justify-between gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setHistorySidebarOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 text-xs text-dim hover:text-ink hover:bg-white/5 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Historial
          </button>
          <button
            type="button"
            onClick={() => setShowModelConfig((o) => !o)}
            aria-label="Configuración de modelos"
            aria-expanded={showModelConfig}
            className="p-2 rounded-lg text-dim hover:text-ink hover:bg-surface transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>

        {/* Desktop gear button row */}
        <div className="hidden lg:flex justify-end">
          <button
            type="button"
            onClick={() => setShowModelConfig((o) => !o)}
            aria-label="Configuración de modelos"
            aria-expanded={showModelConfig}
            className="p-2 rounded-lg text-dim hover:text-ink hover:bg-surface transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>

        {/* LLM status: banner when not ready, chip when ready */}
        {showModelConfig && (
          <div className="border-b border-rim animate-fade-in">
            {rag.llmStatus !== 'ready' ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-info/8 border border-info/20 flex-wrap">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-info flex-shrink-0" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-xs text-info flex-1 min-w-0">
                  Para generar respuestas, carga un modelo en la sección <strong className="text-ink font-medium">Modelos</strong>.
                </p>
                <Button variant="ghost" onClick={onNavigateToModels} className="text-xs py-1 px-2.5 flex-shrink-0">
                  Ir a Modelos →
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-ok flex-shrink-0" aria-hidden="true" />
                <span className="text-xs text-dim">{activeLlm?.label ?? 'LLM'} · Listo</span>
              </div>
            )}
          </div>
        )}

        {/* Document index row */}
        <div className="card flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="section-label mb-1">Índice de documentos</p>
            <p className="text-xs text-dim leading-relaxed">
              {documents.length === 0
                ? 'Sin documentos aún.'
                : `${embeddedCount} / ${documents.length} docs · ${chunks.length} fragmentos`}
            </p>
          </div>
          {documents.length > 0 && (
            <Button
              onClick={handleEmbedAll}
              disabled={rag.embedStatus !== 'ready' || indexing || embeddedCount === documents.length}
              spinning={indexing}
              variant="ghost"
              className="text-xs py-1.5 flex-shrink-0"
            >
              {embeddedCount === documents.length && documents.length > 0 ? 'Todo indexado' : 'Indexar todo'}
            </Button>
          )}
        </div>

        {/* Chat — full width, taller now that sidebar is gone */}
        <div className="card flex flex-col gap-4" style={{ minHeight: '520px' }}>
          <div className="flex-1 overflow-y-auto scroll-smooth space-y-4 max-h-[520px] pr-1">
            {rag.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-dim/50" aria-hidden="true">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-dim">Pregunta sobre tus documentos escaneados</p>
                  <p className="text-xs text-dim/60 mt-1">La búsqueda BM25 funciona sin ningún modelo cargado</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-1">
                  {[
                    '¿Qué dice este documento?',
                    '¿Cuál es el importe total?',
                    '¿Quién firma el contrato?',
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/9 text-xs text-dim hover:text-ink hover:bg-white/8 cursor-pointer transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {rag.messages.map((msg, i) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    streaming={rag.streaming && i === rag.messages.length - 1 && msg.role === 'assistant'}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {rag.queryError && <p role="alert" className="text-xs text-err px-1">{rag.queryError}</p>}

          <form onSubmit={handleSubmit} className="flex gap-2 items-end border-t border-white/7 pt-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
              placeholder="Pregunta algo… (Enter para enviar)"
              rows={2}
              disabled={rag.streaming}
              className="flex-1 bg-surface border border-white/9 rounded-xl px-3 py-2.5 text-sm text-ink resize-none focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/40 placeholder:text-dim/40 disabled:opacity-60 transition-colors"
            />
            <div className="flex flex-col gap-1.5">
              {rag.streaming ? (
                <Button type="button" variant="ghost" onClick={rag.stopStreaming} className="text-xs py-2 px-3">Detener</Button>
              ) : (
                <Button type="submit" disabled={!input.trim()} className="text-xs py-2 px-3">Enviar</Button>
              )}
              {rag.messages.length > 0 && !rag.streaming && (
                <Button type="button" variant="ghost" onClick={rag.clearChat} className="text-xs py-2 px-3">Limpiar</Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
