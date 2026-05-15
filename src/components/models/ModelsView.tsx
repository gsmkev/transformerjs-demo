import { useState } from 'react'
import { ENGINES } from '@/config/engines'
import { LLM_MODELS } from '@/config/llmModels'
import type { EngineStateMap } from '@/types/ocr'
import type { ModelStatus, ResponseLength } from '@/hooks/useRag'
import EngineCard from '@/components/engines/EngineCard'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'

// ── Shared sub-components ────────────────────────────────────────────────────

function ModelRow({
  label, desc, status, progress, error, onLoad, children,
}: {
  label: string
  desc: string
  status: ModelStatus
  progress: number
  error: string | null
  onLoad: () => void
  children?: React.ReactNode
}) {
  const badgeCls =
    status === 'ready'   ? 'badge-ready'   :
    status === 'loading' ? 'badge-loading' :
    status === 'error'   ? 'badge-error'   : 'badge-idle'
  const badgeLabel =
    status === 'ready' ? 'Ready' : status === 'loading' ? 'Loading' :
    status === 'error' ? 'Error' : 'Not loaded'
  const dotCls =
    status === 'loading' ? 'bg-info animate-badge-pulse' :
    status === 'ready'   ? 'bg-ok' : undefined

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

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  // OCR engines
  engineStates: EngineStateMap
  selectedId: string
  onLoad: (id: string) => void
  onRetry: (id: string) => void
  onSelect: (id: string) => void
  // Embedding model
  embedStatus: ModelStatus
  embedProgress: number
  embedError: string | null
  loadEmbedModel: () => void
  // Reranker
  rerankerStatus: ModelStatus
  rerankerProgress: number
  rerankerError: string | null
  loadReranker: () => void
  // LLM
  llmStatus: ModelStatus
  llmProgress: number
  llmProgressText: string
  llmError: string | null
  loadLlm: () => void
  selectedLlmId: string
  setSelectedLlmId: (id: string) => void
  webGpuAvailable: boolean | null
  // Response settings
  responseLength: ResponseLength
  setResponseLength: (v: ResponseLength) => void
}

type Section = 'ocr' | 'ai'

const SECTION_TABS: { id: Section; label: string }[] = [
  { id: 'ocr', label: 'Motores OCR' },
  { id: 'ai',  label: 'Modelos de IA' },
]

export default function ModelsView({
  engineStates, selectedId, onLoad, onRetry, onSelect,
  embedStatus, embedProgress, embedError, loadEmbedModel,
  rerankerStatus, rerankerProgress, rerankerError, loadReranker,
  llmStatus, llmProgress, llmProgressText, llmError, loadLlm,
  selectedLlmId, setSelectedLlmId, webGpuAvailable,
  responseLength, setResponseLength,
}: Props) {
  const [section, setSection] = useState<Section>('ocr')

  return (
    <div className="animate-fade-in">

      {/* Inner tab bar */}
      <nav className="flex gap-1 px-4 sm:px-6 py-3 border-b border-white/5">
        {SECTION_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
              section === t.id
                ? 'bg-accent/15 border-accent/30 text-accent'
                : 'text-dim hover:text-ink hover:bg-white/5 border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* OCR Engines */}
      {section === 'ocr' && (
        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-xs text-dim leading-relaxed flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ok flex-shrink-0" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Los modelos corren en tu navegador. Ningún dato sale de tu dispositivo.
          </p>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ENGINES.map((engine) => (
              <EngineCard
                key={engine.id}
                engine={engine}
                state={engineStates[engine.id]}
                isSelected={selectedId === engine.id}
                onLoad={() => onLoad(engine.id)}
                onRetry={() => onRetry(engine.id)}
                onSelect={() => onSelect(engine.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* AI Models */}
      {section === 'ai' && (
        <div className="p-4 sm:p-6 space-y-3">
          <ModelRow
            label="Bi-encoder · Recuperación semántica"
            desc="all-MiniLM-L6-v2 · ~23 MB · búsqueda semántica por fragmentos"
            status={embedStatus} progress={embedProgress} error={embedError} onLoad={loadEmbedModel}
          />

          <ModelRow
            label="Cross-encoder · Reranker"
            desc="ms-marco-MiniLM-L-6-v2 · ~22 MB · mejora la precisión del ranking"
            status={rerankerStatus} progress={rerankerProgress} error={rerankerError} onLoad={loadReranker}
          />

          <ModelRow
            label="Modelo de lenguaje · Generación"
            desc={
              webGpuAvailable === false
                ? 'WebGPU no disponible — requiere Chrome 113+ / Edge 113+'
                : 'Acelerado por WebGPU · corre en tu GPU'
            }
            status={llmStatus} progress={llmProgress} error={llmError} onLoad={loadLlm}
          >
            {llmStatus !== 'ready' && webGpuAvailable !== false && (
              <div className="space-y-1.5">
                {LLM_MODELS.map((m) => (
                  <label key={m.id} className={`flex items-start gap-2.5 cursor-pointer rounded-xl p-2.5 border transition-all ${
                    selectedLlmId === m.id ? 'border-accent/30 bg-accent/8' : 'border-white/7 hover:border-white/15 hover:bg-white/3'
                  }`}>
                    <input
                      type="radio"
                      name="llm-model"
                      value={m.id}
                      checked={selectedLlmId === m.id}
                      onChange={() => setSelectedLlmId(m.id)}
                      className="mt-0.5 accent-accent"
                    />
                    <div>
                      <p className="text-xs font-semibold text-ink leading-snug">{m.label}</p>
                      <p className="text-xs text-dim mt-0.5">{m.size} · {m.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {llmStatus === 'loading' && llmProgressText && (
              <p className="text-xs text-dim/70 truncate font-mono">{llmProgressText}</p>
            )}
          </ModelRow>

          <ResponseLengthPicker value={responseLength} onChange={setResponseLength} />
        </div>
      )}

    </div>
  )
}
