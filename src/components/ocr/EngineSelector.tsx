import { ENGINES } from '@/config/engines'
import type { EngineStateMap } from '@/types/ocr'

interface Props { selectedId: string; engineStates: EngineStateMap; onChange: (id: string) => void }

export default function EngineSelector({ selectedId, engineStates, onChange }: Props) {
  const readyEngines = ENGINES.filter((e) => engineStates[e.id]?.status === 'ready')

  return (
    <div className="space-y-1.5">
      <label htmlFor="engine-select" className="section-label">Motor activo</label>
      {readyEngines.length === 0 ? (
        <p className="text-xs text-dim py-2">
          Carga un motor en la sección <strong className="text-ink font-medium">Modelos</strong> primero.
        </p>
      ) : (
        <select
          id="engine-select"
          value={readyEngines.some((e) => e.id === selectedId) ? selectedId : readyEngines[0].id}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-surface border border-white/9 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/40 transition-colors appearance-none"
        >
          {readyEngines.map((e) => (
            <option key={e.id} value={e.id}>{e.label}</option>
          ))}
        </select>
      )}
    </div>
  )
}
