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
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in">
      <div>
        <p className="section-label">OCR Engines</p>
        <p className="text-xs text-dim mt-2 leading-relaxed flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ok flex-shrink-0" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Models run entirely in your browser. No data leaves your device.
        </p>
      </div>
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
  )
}
