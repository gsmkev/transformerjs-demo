import type { EngineConfig, EngineState } from '@/types/ocr'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'

interface Props {
  engine: EngineConfig
  state: EngineState
  isSelected: boolean
  onLoad: () => void
  onRetry: () => void
  onSelect: () => void
}

export default function EngineCard({ engine, state, isSelected, onLoad, onRetry, onSelect }: Props) {
  const { status, progress, stepLabel, errorMsg } = state

  return (
    <div className={`card flex flex-col gap-4 transition-all duration-200 ${
      isSelected ? 'ring-2 ring-accent/30 shadow-accent-glow-sm' : 'hover:border-white/13'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink leading-snug">{engine.label}</p>
          <p className="text-xs text-dim mt-0.5 font-mono">{engine.size}</p>
        </div>
        <Badge status={status} />
      </div>

      <p className="text-xs text-dim leading-relaxed -mt-1">{engine.desc}</p>

      {status === 'loading' && <ProgressBar value={progress} label={stepLabel} />}

      {status === 'error' && (
        <div className="flex gap-2 rounded-lg bg-err/8 border border-err/20 px-3 py-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-err mt-0.5 flex-shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p role="alert" className="text-xs text-err break-words">{errorMsg}</p>
        </div>
      )}

      <div className="border-t border-white/5 pt-3 flex gap-2 mt-auto">
        {status === 'error' ? (
          <Button variant="ghost" onClick={onRetry} className="flex-1 text-xs py-1.5">Retry</Button>
        ) : (
          <Button
            variant="ghost"
            onClick={onLoad}
            disabled={status === 'loading' || status === 'ready'}
            spinning={status === 'loading'}
            className="flex-1 text-xs py-1.5"
          >
            {status === 'loading' ? 'Loading' : status === 'ready' ? 'Loaded' : 'Load'}
          </Button>
        )}
        <Button onClick={onSelect} disabled={status !== 'ready'} className="flex-1 text-xs py-1.5">
          {isSelected ? 'Selected' : 'Select'}
        </Button>
      </div>
    </div>
  )
}
