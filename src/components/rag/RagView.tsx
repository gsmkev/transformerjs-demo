'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import type { ScannedDocument, DocumentChunk } from '@/types/document'
import type { useRag, ResponseLength } from '@/hooks/useRag'
import { LLM_MODELS } from '@/config/llmModels'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'
import ChatMessage from './ChatMessage'

interface Props {
  documents: ScannedDocument[]
  chunks: DocumentChunk[]
  rag: ReturnType<typeof useRag>
  onEmbedDoc: (doc: ScannedDocument) => Promise<void>
  onEmbedAll: () => Promise<void>
}

function ModelRow({
  label, desc, status, progress, error, onLoad, children,
}: {
  label: string; desc: string
  status: ReturnType<typeof useRag>['embedStatus']
  progress: number; error: string | null
  onLoad: () => void; children?: React.ReactNode
}) {
  const badgeCls =
    status === 'ready'   ? 'badge-ready'   :
    status === 'loading' ? 'badge-loading' :
    status === 'error'   ? 'badge-error'   : 'badge-idle'
  const badgeLabel =
    status === 'ready' ? 'Ready' : status === 'loading' ? 'Loading' : status === 'error' ? 'Error' : 'Not loaded'
  const dotCls =
    status === 'loading' ? 'bg-info animate-badge-pulse' : status === 'ready' ? 'bg-ok' : undefined

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink leading-snug">{label}</p>
          <p className="text-xs text-dim mt-0.5 leading-relaxed">{desc}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${badgeCls}`}>
          {dotCls && <span className={`w-1.5 h-1.5 rounded-full ${dotCls}`} aria-hidden="true" />}
          {badgeLabel}
        </span>
      </div>
      {children}
      {status === 'loading' && <ProgressBar value={progress} percentage />}
      {error && (
        <div className="flex items-start gap-2 text-xs text-err">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}
      {(status === 'idle' || status === 'error') && (
        <Button onClick={onLoad} variant="ghost" className="w-full sm:w-auto text-xs py-1.5">
          {status === 'error' ? 'Retry' : 'Load'}
        </Button>
      )}
    </div>
  )
}

const RESPONSE_LENGTH_OPTIONS: { value: ResponseLength; label: string; desc: string }[] = [
  { value: 'concise',  label: 'Concise',  desc: '1–2 sentences · fast' },
  { value: 'normal',   label: 'Normal',   desc: 'Balanced · default'   },
  { value: 'detailed', label: 'Detailed', desc: 'Full explanation'      },
]

function ResponseLengthPicker({ value, onChange }: { value: ResponseLength; onChange: (v: ResponseLength) => void }) {
  return (
    <div className="card space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="section-label">Response length</p>
        <p className="text-xs text-dim/60">{RESPONSE_LENGTH_OPTIONS.find((o) => o.value === value)?.desc}</p>
      </div>
      <div className="flex gap-1">
        {RESPONSE_LENGTH_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            title={opt.desc}
            className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-all border ${
              value === opt.value
                ? 'bg-accent/15 border-accent/30 text-accent'
                : 'border-transparent text-dim hover:text-ink hover:bg-white/5'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function RagView({ documents, chunks, rag, onEmbedDoc: _onEmbedDoc, onEmbedAll }: Props) {
  const [input, setInput] = useState('')
  const [indexing, setIndexing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const embeddedCount = documents.filter((d) => d.embedding !== null).length

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [rag.messages, rag.streaming])

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    const q = input.trim()
    if (!q || rag.streaming) return
    setInput('')
    rag.chat(q, documents, chunks)
  }

  const handleEmbedAll = async () => {
    setIndexing(true)
    try { await onEmbedAll() } finally { setIndexing(false) }
  }

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-5">

        {/* Sidebar */}
        <aside className="lg:w-80 lg:flex-shrink-0 space-y-3">
          <p className="section-label">Model Setup</p>

          <ModelRow
            label="Bi-encoder · Retrieval"
            desc="all-MiniLM-L6-v2 · ~23 MB · semantic search"
            status={rag.embedStatus} progress={rag.embedProgress} error={rag.embedError} onLoad={rag.loadEmbedModel}
          />

          <ModelRow
            label="Cross-encoder · Reranker"
            desc="ms-marco-MiniLM-L-6-v2 · ~22 MB · improves precision"
            status={rag.rerankerStatus} progress={rag.rerankerProgress} error={rag.rerankerError} onLoad={rag.loadReranker}
          />

          <ModelRow
            label="Language Model · Generation"
            desc={rag.webGpuAvailable === false ? 'WebGPU unavailable — requires Chrome 113+ / Edge 113+' : 'WebGPU-accelerated · runs on your GPU'}
            status={rag.llmStatus} progress={rag.llmProgress} error={rag.llmError} onLoad={rag.loadLlm}
          >
            {rag.llmStatus !== 'ready' && rag.webGpuAvailable !== false && (
              <div className="space-y-1.5">
                {LLM_MODELS.map((m) => (
                  <label key={m.id} className={`flex items-start gap-2.5 cursor-pointer rounded-xl p-2.5 border transition-all ${
                    rag.selectedLlmId === m.id ? 'border-accent/30 bg-accent/8' : 'border-white/7 hover:border-white/15 hover:bg-white/3'
                  }`}>
                    <input type="radio" name="llm-model" value={m.id} checked={rag.selectedLlmId === m.id} onChange={() => rag.setSelectedLlmId(m.id)} className="mt-0.5 accent-accent" />
                    <div>
                      <p className="text-xs font-semibold text-ink leading-snug">{m.label}</p>
                      <p className="text-xs text-dim mt-0.5">{m.size} · {m.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {rag.llmStatus === 'loading' && rag.llmProgressText && (
              <p className="text-xs text-dim/70 truncate font-mono">{rag.llmProgressText}</p>
            )}
          </ModelRow>

          <ResponseLengthPicker value={rag.responseLength} onChange={rag.setResponseLength} />

          <div className="card flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="section-label mb-1">Document Index</p>
              <p className="text-xs text-dim leading-relaxed">
                {documents.length === 0
                ? 'No documents yet.'
                : `${embeddedCount} / ${documents.length} docs · ${chunks.length} fragments`}
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
                {embeddedCount === documents.length && documents.length > 0 ? 'All indexed' : 'Index all'}
              </Button>
            )}
          </div>
        </aside>

        {/* Chat */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <p className="section-label">Chat</p>
          <div className="card flex flex-col gap-4" style={{ minHeight: '420px' }}>
            <div className="flex-1 overflow-y-auto space-y-4 max-h-[420px] pr-1">
              {rag.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-8 gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-dim/50" aria-hidden="true">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-dim">Ask about your scanned documents</p>
                    <p className="text-xs text-dim/60 mt-1">BM25 search works without any model loaded</p>
                  </div>
                </div>
              ) : (
                <>
                  {rag.messages.map((msg, i) => (
                    <ChatMessage key={msg.id} message={msg} streaming={rag.streaming && i === rag.messages.length - 1 && msg.role === 'assistant'} />
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
                placeholder="Ask something… (Enter to send)"
                rows={2}
                disabled={rag.streaming}
                className="flex-1 bg-surface border border-white/9 rounded-xl px-3 py-2.5 text-sm text-ink resize-none focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/40 placeholder:text-dim/40 disabled:opacity-60 transition-colors"
              />
              <div className="flex flex-col gap-1.5">
                {rag.streaming ? (
                  <Button type="button" variant="ghost" onClick={rag.stopStreaming} className="text-xs py-2 px-3">Stop</Button>
                ) : (
                  <Button type="submit" disabled={!input.trim()} className="text-xs py-2 px-3">Send</Button>
                )}
                {rag.messages.length > 0 && !rag.streaming && (
                  <Button type="button" variant="ghost" onClick={rag.clearChat} className="text-xs py-2 px-3">Clear</Button>
                )}
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}
