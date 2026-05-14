import { ENGINES } from '@/config/engines'
import type { EngineStateMap } from '@/types/ocr'
import EngineCard from './EngineCard'

interface Props {
  engineStates: EngineStateMap
  selectedId: string
  onLoad: (id: string) => void
  onRetry: (id: string) => void
  onSelect: (id: string) => void
}

export default function EngineGrid({ engineStates, selectedId, onLoad, onRetry, onSelect }: Props) {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <p className="text-xs text-dim">
        Models run entirely in your browser. Data never leaves your device.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
  )
}
