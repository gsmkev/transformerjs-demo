import { ENGINES } from '@/config/engines'
import type { EngineStateMap } from '@/types/ocr'

interface Props { selectedId: string; engineStates: EngineStateMap; onChange: (id: string) => void }

export default function EngineSelector({ selectedId, engineStates, onChange }: Props) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="engine-select" className="section-label">Active Engine</label>
      <select
        id="engine-select"
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface border border-white/9 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/40 transition-colors appearance-none"
      >
        {ENGINES.map((e) => {
          const status = engineStates[e.id]?.status ?? 'idle'
          const suffix = status === 'ready' ? ' · Ready' : status === 'loading' ? ' · Loading' : ''
          return <option key={e.id} value={e.id}>{e.label}{suffix}</option>
        })}
      </select>
    </div>
  )
}
