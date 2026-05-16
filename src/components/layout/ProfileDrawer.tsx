'use client'

import { useEffect, useRef } from 'react'
import type { ThemeChoice } from '@/hooks/useTheme'
import type { A11yPrefs } from '@/hooks/useA11y'
import type { ModelStatus } from '@/hooks/useRag'

interface Props {
  open: boolean
  onClose: () => void
  themeChoice: ThemeChoice
  onThemeChange: (c: ThemeChoice) => void
  a11y: A11yPrefs
  onA11yChange: (p: Partial<A11yPrefs>) => void
  onOpenModels: () => void
  onOpenSecurity: () => void
  embedStatus: ModelStatus
  llmStatus: ModelStatus
  rerankerStatus: ModelStatus
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-widest text-dim mb-2 mt-5 first:mt-0">{children}</p>
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-rim last:border-0">
      <span className="text-sm text-ink">{label}</span>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function SegmentedControl<T extends string>({
  value, options, onChange,
}: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg border border-rim overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            value === opt.value
              ? 'bg-accent text-white'
              : 'text-dim hover:text-ink hover:bg-surface2'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

const statusDot = (s: ModelStatus) => {
  if (s === 'ready')   return '🟢'
  if (s === 'loading') return '🟡'
  if (s === 'error')   return '🔴'
  return '⚪'
}

export default function ProfileDrawer({
  open, onClose, themeChoice, onThemeChange, a11y, onA11yChange,
  onOpenModels, onOpenSecurity, embedStatus, llmStatus, rerankerStatus,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Perfil"
        className="relative w-full max-w-xs bg-base border-l border-rim h-full overflow-y-auto animate-slide-in-right"
      >
        <div className="flex items-center justify-between p-4 border-b border-rim sticky top-0 bg-base z-10">
          <p className="font-semibold text-ink">Perfil</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-dim hover:text-ink hover:bg-surface transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-4">
          <SectionLabel>Apariencia</SectionLabel>

          <OptionRow label="Tema">
            <SegmentedControl
              value={themeChoice}
              onChange={onThemeChange}
              options={[
                { value: 'light',  label: 'Claro'   },
                { value: 'dark',   label: 'Oscuro'  },
                { value: 'system', label: 'Sistema' },
              ]}
            />
          </OptionRow>

          <OptionRow label="Tamaño">
            <SegmentedControl
              value={a11y.textSize}
              onChange={(v) => onA11yChange({ textSize: v })}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'large',  label: 'Grande' },
              ]}
            />
          </OptionRow>

          <OptionRow label="Contraste">
            <SegmentedControl
              value={a11y.contrast}
              onChange={(v) => onA11yChange({ contrast: v })}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'high',   label: 'Alto'   },
              ]}
            />
          </OptionRow>

          <OptionRow label="Movimiento">
            <SegmentedControl
              value={a11y.motion}
              onChange={(v) => onA11yChange({ motion: v })}
              options={[
                { value: 'normal',  label: 'Normal'   },
                { value: 'reduced', label: 'Reducido' },
              ]}
            />
          </OptionRow>

          <SectionLabel>Seguridad</SectionLabel>
          <button
            type="button"
            onClick={() => { onClose(); onOpenSecurity() }}
            className="w-full flex items-center justify-between py-2.5 border-b border-rim text-sm text-ink hover:text-accent transition-colors"
          >
            <span>PIN y biometría</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          <SectionLabel>Modelos de IA</SectionLabel>
          <button
            type="button"
            onClick={() => { onClose(); onOpenModels() }}
            className="w-full flex items-center justify-between py-2.5 border-b border-rim text-sm text-ink hover:text-accent transition-colors"
          >
            <span>Gestionar modelos</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-dim">{statusDot(embedStatus)} {statusDot(llmStatus)} {statusDot(rerankerStatus)}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </button>

          <SectionLabel>Sobre Archivo</SectionLabel>
          <div className="space-y-1.5 text-sm text-dim">
            <p>Versión 1.0 · 100% local</p>
            <p className="text-xs leading-relaxed">
              Tu vault personal de documentos. Sin nube, sin suscripción, sin servidor.
              Todo corre en tu dispositivo.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
