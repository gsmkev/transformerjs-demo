import { ENGINES } from '@/config/engines'
import type { EngineStateMap } from '@/types/ocr'

interface Props {
  selectedId: string
  engineStates: EngineStateMap
  onChange: (id: string) => void
}

export default function EngineSelector({ selectedId, engineStates, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="engine-select" className="text-xs text-dim font-medium">
        Active Engine
      </label>
      <select
        id="engine-select"
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface2 border border-rim rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {ENGINES.map((e) => {
          const status = engineStates[e.id]?.status ?? 'idle'
          const suffix = status === 'ready' ? ' ✓' : status === 'loading' ? ' …' : ''
          return (
            <option key={e.id} value={e.id}>
              {e.label}{suffix}
            </option>
          )
        })}
      </select>
    </div>
  )
}
