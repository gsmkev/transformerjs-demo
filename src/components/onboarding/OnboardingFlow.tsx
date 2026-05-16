'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ModelStatus } from '@/hooks/useRag'
import LandingView from '@/components/home/LandingView'

export interface OnboardingPrefs {
  language: 'es' | 'en' | 'both'
  speed: 'fast' | 'precise'
}

type Step = 'install' | 'language' | 'speed' | 'download'

interface Props {
  onComplete: (prefs: OnboardingPrefs) => void
  onStartDownloads: (prefs: OnboardingPrefs) => void
  embedStatus: ModelStatus
  embedProgress: number
  llmStatus: ModelStatus
  llmProgress: number
}

function detectInstalled(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  )
}

function detectBrowser(): 'chrome' | 'safari' | 'firefox' | 'other' {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'safari'
  if (/Chrome/i.test(ua) || /CriOS/i.test(ua)) return 'chrome'
  if (/Firefox/i.test(ua) || /FxiOS/i.test(ua)) return 'firefox'
  return 'other'
}

const ArchivoLogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <rect x="14" y="8" width="26" height="34" rx="2" fill="white" opacity="0.95"/>
    <polygon points="40,8 40,17 49,17" fill="rgba(255,255,255,0.5)"/>
    <line x1="18" y1="21" x2="35" y2="21" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
    <line x1="18" y1="27" x2="35" y2="27" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
    <line x1="18" y1="33" x2="29" y2="33" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
  </svg>
)

function ProgressBar({ value, max, label, done }: { value: number; max: number; label: string; done: boolean }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-dim">{label}</span>
        {done
          ? <span className="text-xs text-ok font-medium">Listo ✓</span>
          : <span className="text-xs text-dim font-mono">{pct}%</span>
        }
      </div>
      <div className="h-2 bg-surface2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-ok' : 'bg-accent'}`}
          style={{ width: done ? '100%' : `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function OnboardingFlow({ onComplete, onStartDownloads, embedStatus, embedProgress, llmStatus, llmProgress }: Props) {
  // Always start at 'install' for SSR safety; jump to 'language' on mount if already installed
  const [step, setStep] = useState<Step>('install')
  const [prefs, setPrefs] = useState<Partial<OnboardingPrefs>>({})
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const browser = detectBrowser()

  // After hydration: skip install step if app is already running in standalone mode
  useEffect(() => {
    if (detectInstalled()) setStep('language')
  }, [])

  // Capture Chrome install prompt
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler as EventListener)
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener)
  }, [])

  // Detect when PWA gets installed during this session (appinstalled or display-mode change)
  useEffect(() => {
    if (step !== 'install') return
    const mq = window.matchMedia('(display-mode: standalone)')
    const onMqChange = (e: MediaQueryListEvent) => { if (e.matches) setStep('language') }
    const onInstalled = () => setStep('language')
    mq.addEventListener('change', onMqChange)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      mq.removeEventListener('change', onMqChange)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [step])

  const handleInstallClick = useCallback(async () => {
    if (installPrompt) {
      await (installPrompt as any).prompt()
      const result = await (installPrompt as any).userChoice
      if (result.outcome === 'accepted') setStep('language')
    }
  }, [installPrompt])

  const handleLanguage = (lang: OnboardingPrefs['language']) => {
    setPrefs((p) => ({ ...p, language: lang }))
    setStep('speed')
  }

  const handleSpeed = (speed: OnboardingPrefs['speed']) => {
    const fullPrefs: OnboardingPrefs = { language: prefs.language!, speed }
    setPrefs(fullPrefs)
    setStep('download')
    onStartDownloads(fullPrefs)
  }

  const canFinish = (embedStatus === 'ready' || embedStatus === 'error') &&
                   (llmStatus === 'ready' || llmStatus === 'error')

  const handleFinish = () => {
    onComplete(prefs as OnboardingPrefs)
  }

  const stepContent = {
    install: (
      <LandingView
        installContext
        onInstall={browser === 'chrome' && installPrompt ? handleInstallClick : undefined}
      />
    ),

    language: (
      <div className="flex flex-col items-center text-center gap-8 animate-fade-in">
        <div>
          <p className="text-sm font-medium text-accent mb-3">Paso 1 de 2</p>
          <h1 className="text-2xl font-bold text-ink mb-3">¿En qué idioma están tus documentos?</h1>
          <p className="text-sm text-dim">Así los leemos mejor.</p>
        </div>
        <div className="w-full max-w-xs space-y-3">
          {([
            { value: 'es', label: 'Español', emoji: '🇪🇸' },
            { value: 'en', label: 'Inglés',  emoji: '🇺🇸' },
            { value: 'both', label: 'Los dos', emoji: '🌐' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleLanguage(opt.value)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-rim bg-surface hover:bg-surface2 hover:border-accent/40 active:scale-[0.98] transition-all text-left"
            >
              <span className="text-2xl leading-none" aria-hidden="true">{opt.emoji}</span>
              <span className="text-base font-medium text-ink">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    ),

    speed: (
      <div className="flex flex-col items-center text-center gap-8 animate-fade-in">
        <div>
          <p className="text-sm font-medium text-accent mb-3">Paso 2 de 2</p>
          <h1 className="text-2xl font-bold text-ink mb-3">¿Qué preferís para la búsqueda?</h1>
          <p className="text-sm text-dim leading-relaxed">Podés cambiarlo después desde tu perfil.</p>
        </div>
        <div className="w-full max-w-xs space-y-3">
          <button
            type="button"
            onClick={() => handleSpeed('fast')}
            className="w-full flex items-start gap-4 p-5 rounded-xl border border-rim bg-surface hover:bg-surface2 hover:border-accent/40 active:scale-[0.98] transition-all text-left"
          >
            <span className="text-2xl leading-none mt-0.5" aria-hidden="true">⚡</span>
            <div>
              <p className="text-base font-semibold text-ink">Más rápido</p>
              <p className="text-xs text-dim mt-0.5">Respuestas al instante</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleSpeed('precise')}
            className="w-full flex items-start gap-4 p-5 rounded-xl border border-rim bg-surface hover:bg-surface2 hover:border-accent/40 active:scale-[0.98] transition-all text-left"
          >
            <span className="text-2xl leading-none mt-0.5" aria-hidden="true">🎯</span>
            <div>
              <p className="text-base font-semibold text-ink">Más preciso</p>
              <p className="text-xs text-dim mt-0.5">Vale esperar un poco</p>
            </div>
          </button>
        </div>
      </div>
    ),

    download: (
      <div className="flex flex-col items-center text-center gap-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-ink mb-3">Preparando tu Archivo…</h1>
          <p className="text-sm text-dim leading-relaxed max-w-xs mx-auto">
            Esto solo pasa una vez. Descargamos todo lo necesario para que la búsqueda funcione en tu dispositivo.
          </p>
        </div>

        <div className="w-full max-w-xs space-y-5">
          <ProgressBar
            label="Motor de búsqueda"
            value={embedProgress}
            max={100}
            done={embedStatus === 'ready'}
          />
          <ProgressBar
            label="Modelo de lenguaje"
            value={llmProgress}
            max={100}
            done={llmStatus === 'ready'}
          />
        </div>

        {!canFinish && (
          <p className="text-xs text-dim/60 animate-pulse">
            Casi listo…
          </p>
        )}

        <button
          type="button"
          onClick={handleFinish}
          disabled={!canFinish}
          className="w-full max-w-xs py-4 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark active:scale-[0.98] transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {canFinish ? 'Empezar →' : 'Descargando…'}
        </button>
      </div>
    ),
  }

  return (
    <div className={`fixed inset-0 z-[90] bg-base flex flex-col ${step === 'install' ? 'overflow-y-auto' : 'items-center justify-center px-6 py-12'}`}>
      {/* Logo small top */}
      {step !== 'install' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
            <ArchivoLogo size={14} />
          </div>
          <span className="text-sm font-bold text-ink">Archivo</span>
        </div>
      )}

      <div className={step === 'install' ? 'w-full' : 'w-full max-w-sm'}>
        {stepContent[step]}
      </div>
    </div>
  )
}
