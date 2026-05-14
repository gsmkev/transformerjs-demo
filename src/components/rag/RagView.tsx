'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import type { ScannedDocument } from '@/types/document'
import type { useRag, ResponseLength } from '@/hooks/useRag'
import { LLM_MODELS } from '@/config/llmModels'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'
import ChatMessage from './ChatMessage'

interface Props {
  documents: ScannedDocument[]
  rag: ReturnType<typeof useRag>
  onEmbedDoc: (doc: ScannedDocument) => Promise<void>
  onEmbedAll: () => Promise<void>
}

// ── Reusable model-status row ─────────────────────────────────────────────

function ModelRow({
  label, desc, status, progress, error,
  onLoad, children,
}: {
  label: string; desc: string
  status: ReturnType<typeof useRag>['embedStatus']
  progress: number; error: string | null
  onLoad: () => void; children?: React.ReactNode
}) {
  const pill =
    status === 'ready'   ? 'bg-ok/20 text-ok'     :
    status === 'loading' ? 'bg-info/15 text-info'  :
    status === 'error'   ? 'bg-err/15 text-err'    :
                           'bg-surface2 text-dim'
  const pillLabel =
    status === 'ready' ? 'Ready' : status === 'loading' ? 'Loading…' :
    status === 'error' ? 'Error' : 'Not loaded'

  return (
    <div className="card space-y-2">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink">{label}</p>
          <p className="text-xs text-dim mt-0.5">{desc}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${pill}`}>
          {pillLabel}
        </span>
      </div>

      {children}

      {status === 'loading' && <ProgressBar value={progress} />}
      {error && <p className="text-xs text-err">{error}</p>}

      {(status === 'idle' || status === 'error') && (
        <Button onClick={onLoad} variant="ghost" className="w-full sm:w-auto text-xs py-1.5">
          {status === 'error' ? 'Retry' : 'Load'}
        </Button>
      )}
    </div>
  )
}

// ── Response-length toggle ────────────────────────────────────────────────

const RESPONSE_LENGTH_OPTIONS: { value: ResponseLength; label: string; desc: string }[] = [
  { value: 'concise',  label: 'Concise',  desc: '1-2 sentences · fast' },
  { value: 'normal',   label: 'Normal',   desc: 'Balanced · default' },
  { value: 'detailed', label: 'Detailed', desc: 'Full explanation · more context' },
]

function ResponseLengthPicker({
  value, onChange,
}: {
  value: ResponseLength
  onChange: (v: ResponseLength) => void
}) {
  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Response length</p>
        <p className="text-xs text-dim">affects context window &amp; token budget</p>
      </div>
      <div className="flex gap-1.5">
        {RESPONSE_LENGTH_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            title={opt.desc}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors border ${
              value === opt.value
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-rim text-dim hover:border-accent/40 hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-dim/70">
        {RESPONSE_LENGTH_OPTIONS.find((o) => o.value === value)?.desc}
      </p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function RagView({ documents, rag, onEmbedDoc: _onEmbedDoc, onEmbedAll }: Props) {
  const [input, setInput] = useState('')
  const [indexing, setIndexing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const embeddedCount = documents.filter((d) => d.embedding !== null).length

  // Auto-scroll on new messages / streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [rag.messages, rag.streaming])

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    const q = input.trim()
    if (!q || rag.streaming) return
    setInput('')
    rag.chat(q, documents)
  }

  const handleEmbedAll = async () => {
    setIndexing(true)
    try { await onEmbedAll() } finally { setIndexing(false) }
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">

      {/* ── Model setup ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-dim uppercase tracking-wide">Model Setup</h2>

        {/* Embedding model */}
        <ModelRow
          label="Bi-encoder · Retrieval"
          desc="Xenova/all-MiniLM-L6-v2 · ~23 MB · semantic search"
          status={rag.embedStatus}
          progress={rag.embedProgress}
          error={rag.embedError}
          onLoad={rag.loadEmbedModel}
        />

        {/* Reranker */}
        <ModelRow
          label="Cross-encoder · Reranker"
          desc="Xenova/ms-marco-MiniLM-L-6-v2 · ~22 MB · improves result precision"
          status={rag.rerankerStatus}
          progress={rag.rerankerProgress}
          error={rag.rerankerError}
          onLoad={rag.loadReranker}
        />

        {/* LLM */}
        <ModelRow
          label="Language Model · Generation"
          desc={`WebGPU-accelerated · ${rag.webGpuAvailable === false ? '⚠ WebGPU not available in this browser' : 'requires Chrome 113+ / Edge 113+'}`}
          status={rag.llmStatus}
          progress={rag.llmProgress}
          error={rag.llmError}
          onLoad={rag.loadLlm}
        >
          {/* Model picker */}
          {rag.llmStatus !== 'ready' && rag.webGpuAvailable !== false && (
            <div className="space-y-1.5">
              {LLM_MODELS.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-start gap-2.5 cursor-pointer rounded-lg p-2.5 border transition-colors ${
                    rag.selectedLlmId === m.id ? 'border-accent bg-accent/5' : 'border-rim hover:border-accent/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="llm-model"
                    value={m.id}
                    checked={rag.selectedLlmId === m.id}
                    onChange={() => rag.setSelectedLlmId(m.id)}
                    className="mt-0.5 accent-accent"
                  />
                  <div>
                    <p className="text-xs font-semibold text-ink">{m.label}</p>
                    <p className="text-xs text-dim">{m.size} · {m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
          {rag.llmStatus === 'loading' && rag.llmProgressText && (
            <p className="text-xs text-dim truncate">{rag.llmProgressText}</p>
          )}
        </ModelRow>

        {/* Response length */}
        <ResponseLengthPicker
          value={rag.responseLength}
          onChange={rag.setResponseLength}
        />
      </section>

      {/* ── Document index ── */}
      <section className="card flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-ink">Document Index</p>
          <p className="text-xs text-dim mt-0.5">
            {documents.length === 0
              ? 'No documents — run OCR and save to Library first.'
              : `${embeddedCount} / ${documents.length} indexed for semantic search`}
          </p>
        </div>
        {documents.length > 0 && (
          <Button
            onClick={handleEmbedAll}
            disabled={rag.embedStatus !== 'ready' || indexing || embeddedCount === documents.length}
            spinning={indexing}
            variant="ghost"
            className="text-xs py-1.5"
          >
            {embeddedCount === documents.length && documents.length > 0 ? '✓ All indexed' : 'Index all'}
          </Button>
        )}
      </section>

      {/* ── Chat ── */}
      <section className="flex flex-col gap-3">
        {/* Messages */}
        {rag.messages.length > 0 ? (
          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
            {rag.messages.map((msg, i) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                streaming={rag.streaming && i === rag.messages.length - 1 && msg.role === 'assistant'}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="text-center py-8 text-dim text-sm">
            <p>Ask a question about your scanned documents.</p>
            <p className="text-xs mt-1 text-dim/60">
              BM25 keyword search runs without any model loaded.
            </p>
          </div>
        )}

        {rag.queryError && (
          <p role="alert" className="text-xs text-err">{rag.queryError}</p>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            placeholder="Ask something… (Enter to send, Shift+Enter for newline)"
            rows={2}
            disabled={rag.streaming}
            className="flex-1 bg-surface border border-rim rounded-xl px-3 py-2.5 text-sm text-ink resize-none focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-dim/50 disabled:opacity-60"
          />
          <div className="flex flex-col gap-1.5">
            {rag.streaming ? (
              <Button type="button" variant="ghost" onClick={rag.stopStreaming} className="text-xs py-2">
                Stop
              </Button>
            ) : (
              <Button type="submit" disabled={!input.trim()} className="text-xs py-2">
                Send
              </Button>
            )}
            {rag.messages.length > 0 && !rag.streaming && (
              <Button type="button" variant="ghost" onClick={rag.clearChat} className="text-xs py-2">
                Clear
              </Button>
            )}
          </div>
        </form>
      </section>
    </div>
  )
}
