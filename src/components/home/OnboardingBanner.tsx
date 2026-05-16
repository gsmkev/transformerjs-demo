'use client'

import { useState, useCallback } from 'react'

const STORAGE_KEY = 'archivo_onboarding'

interface OnboardingState {
  dismissed: boolean
  completedSteps: number[]
}

function readState(): OnboardingState {
  if (typeof window === 'undefined') return { dismissed: false, completedSteps: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { dismissed: false, completedSteps: [] }
    return JSON.parse(raw)
  } catch { return { dismissed: false, completedSteps: [] } }
}

function saveState(s: OnboardingState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}

export function markOnboardingStep(step: number) {
  const s = readState()
  if (!s.completedSteps.includes(step)) {
    s.completedSteps = [...s.completedSteps, step]
    saveState(s)
  }
}

const STEPS = [
  { id: 0, label: 'Instala la app',         hint: 'Añade Archivo a tu pantalla de inicio para acceso rápido.' },
  { id: 1, label: 'Crea tu PIN',             hint: 'Solo tú podrás abrir Archivo.' },
  { id: 2, label: 'Elige tus modelos',       hint: 'Descarga los modelos de IA que quieras usar.' },
  { id: 3, label: 'Escanea tu primer doc',   hint: 'Prueba el escáner — verás lo fácil que es.' },
]

interface Props {
  onOpenSecurity: () => void
  onOpenModels: () => void
  onOpenScanner: () => void
  hasDocuments: boolean
}

export default function OnboardingBanner({ onOpenSecurity, onOpenModels, onOpenScanner, hasDocuments }: Props) {
  const [state, setState] = useState<OnboardingState>(readState)
  const [expanded, setExpanded] = useState(false)

  const complete = useCallback((step: number) => {
    setState((prev) => {
      const next = { ...prev, completedSteps: [...new Set([...prev.completedSteps, step])] }
      saveState(next)
      return next
    })
  }, [])

  const dismiss = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, dismissed: true }
      saveState(next)
      return next
    })
  }, [])

  if (hasDocuments) complete(3)

  const allDone = STEPS.every((s) => state.completedSteps.includes(s.id))
  if (state.dismissed || allDone) return null

  const nextStep = STEPS.find((s) => !state.completedSteps.includes(s.id))
  if (!nextStep) return null

  const completedCount = state.completedSteps.length
  const progressPct = (completedCount / STEPS.length) * 100

  const handleStepAction = (stepId: number) => {
    if (stepId === 1) { onOpenSecurity(); complete(1) }
    else if (stepId === 2) { onOpenModels(); complete(2) }
    else if (stepId === 3) { onOpenScanner() }
    else {
      // PWA install — mark as done (user will handle it)
      complete(0)
    }
  }

  return (
    <div className="mx-4 mt-4 rounded-xl border border-accent/25 bg-accent/5 overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-accent">Configura Archivo</p>
          <p className="text-xs text-dim mt-0.5 truncate">{nextStep.label}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-xs font-medium text-accent hover:text-accent-dark transition-colors"
            aria-expanded={expanded}
          >
            {expanded ? 'Ocultar' : 'Ver'}
          </button>
          <button type="button" onClick={dismiss} aria-label="Cerrar onboarding" className="text-dim hover:text-ink transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-accent/10">
        <div
          className="h-full bg-accent transition-all duration-500"
          style={{ width: `${progressPct}%` }}
          role="progressbar"
          aria-valuenow={completedCount}
          aria-valuemax={STEPS.length}
        />
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-2 border-t border-accent/15 animate-fade-in">
          {STEPS.map((step) => {
            const done = state.completedSteps.includes(step.id)
            return (
              <button
                key={step.id}
                type="button"
                disabled={done}
                onClick={() => handleStepAction(step.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                  done ? 'opacity-50 cursor-default' : 'hover:bg-accent/8 active:scale-[0.99]'
                }`}
              >
                <span className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  done ? 'bg-accent border-accent' : 'border-rim'
                }`}>
                  {done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? 'text-dim line-through' : 'text-ink'}`}>{step.label}</p>
                  {!done && <p className="text-xs text-dim mt-0.5">{step.hint}</p>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
