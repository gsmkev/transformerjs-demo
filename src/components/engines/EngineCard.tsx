import type { EngineConfig, EngineState } from '@/types/ocr'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'

interface Props {
  engine: EngineConfig
  state: EngineState
  isSelected: boolean
  onLoad: () => void
  onSelect: () => void
}

export default function EngineCard({ engine, state, isSelected, onLoad, onSelect }: Props) {
  const { status, progress, stepLabel, errorMsg } = state

  return (
    <div className={`card flex flex-col gap-3 ${isSelected ? 'ring-2 ring-accent' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">{engine.label}</p>
          <p className="text-xs text-dim mt-0.5">{engine.size}</p>
        </div>
        <Badge status={status} />
      </div>

      <p className="text-xs text-dim leading-relaxed">{engine.desc}</p>

      {status === 'loading' && (
        <ProgressBar value={progress} label={stepLabel} />
      )}

      {status === 'error' && (
        <p className="text-xs text-err break-words">{errorMsg}</p>
      )}

      <div className="flex gap-2 mt-auto pt-1">
        <Button
          variant="ghost"
          onClick={onLoad}
          disabled={status === 'loading' || status === 'ready'}
          spinning={status === 'loading'}
          className="flex-1"
        >
          {status === 'loading' ? 'Loading' : status === 'ready' ? 'Loaded' : 'Load'}
        </Button>
        <Button
          onClick={onSelect}
          disabled={status !== 'ready'}
          className="flex-1"
        >
          {isSelected ? 'Selected' : 'Select'}
        </Button>
      </div>
    </div>
  )
}
