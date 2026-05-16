'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ModelStatus } from '@/hooks/useRag'
import LandingView from '@/components/home/LandingView'

export interface OnboardingPrefs {
  language: 'es' | 'en' | 'both'
  speed: 'fast' | 'precise'
  audio: boolean
}

// install   → landing + install CTA (browser)
// installed → "open from home screen" confirmation (browser, after Chrome accept)
// language  → step 1/3
// speed     → step 2/3
// audio     → step 3/3
// download  → all model downloads (embed + reranker + llm + optional whisper)
// biometric → optional WebAuthn setup
type Step = 'install' | 'installed' | 'language' | 'speed' | 'audio' | 'download' | 'biometric'

interface Props {
  onComplete: (prefs: OnboardingPrefs) => void
  onStartDownloads: (prefs: OnboardingPrefs) => void
  embedStatus: ModelStatus
  embedProgress: number
  rerankerStatus: ModelStatus
  rerankerProgress: number
  llmStatus: ModelStatus
  llmProgress: number
  whisperStatus: ModelStatus
  whisperProgress: number
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
  if (/CriOS/i.test(ua) || /Chrome/i.test(ua) || /Edg\//i.test(ua)) return 'chrome'
  if (/Safari/i.test(ua)) return 'safari'
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

function ProgressBar({ label, value, max, done }: { label: string; value: number; max: number; done: boolean }) {
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

export default function OnboardingFlow({
  onComplete, onStartDownloads,
  embedStatus, embedProgress,
  rerankerStatus, rerankerProgress,
  llmStatus, llmProgress,
  whisperStatus, whisperProgress,
}: Props) {
  const [step, setStep] = useState<Step>('install')
  const [prefs, setPrefs] = useState<Partial<OnboardingPrefs>>({})
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const browser = detectBrowser()

  // After hydration: if already in standalone, skip straight to language
  useEffect(() => {
    if (detectInstalled()) setStep('language')
  }, [])

  // Check device biometric / platform authenticator support
  useEffect(() => {
    if (typeof PublicKeyCredential === 'undefined') return
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then(setBiometricAvailable)
      .catch(() => {})
  }, [])

  // Capture Chrome's native install prompt
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler as EventListener)
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener)
  }, [])

  // Listen for install events while on the install step
  useEffect(() => {
    if (step !== 'install') return
    const mq = window.matchMedia('(display-mode: standalone)')
    const onMqChange = (e: MediaQueryListEvent) => { if (e.matches) setStep('language') }
    const onInstalled = () => setStep('installed')
    mq.addEventListener('change', onMqChange)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      mq.removeEventListener('change', onMqChange)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [step])

  const handleInstallClick = useCallback(async () => {
    if (!installPrompt) return
    await (installPrompt as any).prompt()
    const { outcome } = await (installPrompt as any).userChoice
    if (outcome === 'accepted') setStep('installed')
  }, [installPrompt])

  const handleLanguage = (lang: OnboardingPrefs['language']) => {
    setPrefs((p) => ({ ...p, language: lang }))
    setStep('speed')
  }

  const handleSpeed = (speed: OnboardingPrefs['speed']) => {
    setPrefs((p) => ({ ...p, speed }))
    setStep('audio')
  }

  const handleAudio = (wantsAudio: boolean) => {
    const fullPrefs: OnboardingPrefs = {
      language: prefs.language!,
      speed: prefs.speed!,
      audio: wantsAudio,
    }
    setPrefs(fullPrefs)
    setStep('download')
    onStartDownloads(fullPrefs)
  }

  const audioRequired = prefs.audio === true
  const canFinish =
    (embedStatus    === 'ready' || embedStatus    === 'error') &&
    (rerankerStatus === 'ready' || rerankerStatus === 'error') &&
    (llmStatus      === 'ready' || llmStatus      === 'error') &&
    (!audioRequired  || whisperStatus === 'ready' || whisperStatus === 'error')

  const handleFinish = () => {
    if (biometricAvailable) {
      setStep('biometric')
    } else {
      onComplete(prefs as OnboardingPrefs)
    }
  }

  const handleBiometricSetup = useCallback(async () => {
    try {
      const challenge = new Uint8Array(32)
      const userId = new Uint8Array(16)
      crypto.getRandomValues(challenge)
      crypto.getRandomValues(userId)
      const credential = await navigator.credentials.create({
        publicKey: {
          rp: { name: 'Archivo', id: window.location.hostname },
          user: { id: userId, name: 'usuario', displayName: 'Archivo' },
          challenge,
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
          attestation: 'none',
        },
      })
      if (credential) {
        localStorage.setItem('archivo_biometric_id', (credential as PublicKeyCredential).id)
      }
    } catch {
      // cancelled or unsupported — proceed without biometrics
    }
    onComplete(prefs as OnboardingPrefs)
  }, [prefs, onComplete])

  const stepContent: Record<Step, React.ReactNode> = {

    install: (
      <LandingView
        installContext
        onInstall={browser === 'chrome' && installPrompt ? handleInstallClick : undefined}
      />
    ),

    installed: (
      <div className="flex flex-col items-center text-center gap-8 animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-ok/15 flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="text-ok" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink mb-3">¡Archivo instalado!</h1>
          <p className="text-sm text-dim leading-relaxed max-w-xs mx-auto">
            Abrí Archivo desde tu pantalla de inicio para continuar la configuración.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-dim/60">
          <span className="w-2 h-2 rounded-full bg-ok" aria-hidden="true" />
          Instalación completada
        </div>
      </div>
    ),

    language: (
      <div className="flex flex-col items-center text-center gap-8 animate-fade-in">
        <div>
          <p className="text-sm font-medium text-accent mb-3">Paso 1 de 3</p>
          <h1 className="text-2xl font-bold text-ink mb-3">¿En qué idioma están tus documentos?</h1>
          <p className="text-sm text-dim">Así los leemos mejor.</p>
        </div>
        <div className="w-full max-w-xs space-y-3">
          {([
            { value: 'es',   label: 'Español',  emoji: '🇪🇸' },
            { value: 'en',   label: 'Inglés',   emoji: '🇺🇸' },
            { value: 'both', label: 'Los dos',  emoji: '🌐' },
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
          <p className="text-sm font-medium text-accent mb-3">Paso 2 de 3</p>
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
              <p className="text-xs text-dim mt-0.5">Qwen 2.5 0.5B · ~400 MB</p>
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
              <p className="text-xs text-dim mt-0.5">Llama 3.2 1B · ~720 MB</p>
            </div>
          </button>
        </div>
      </div>
    ),

    audio: (
      <div className="flex flex-col items-center text-center gap-8 animate-fade-in">
        <div>
          <p className="text-sm font-medium text-accent mb-3">Paso 3 de 3</p>
          <h1 className="text-2xl font-bold text-ink mb-3">¿Querés transcripción por voz?</h1>
          <p className="text-sm text-dim leading-relaxed max-w-xs mx-auto">
            Dictá notas o consultás usando el micrófono. Whisper corre 100% en tu dispositivo.
          </p>
        </div>
        <div className="w-full max-w-xs space-y-3">
          <button
            type="button"
            onClick={() => handleAudio(true)}
            className="w-full flex items-start gap-4 p-5 rounded-xl border border-rim bg-surface hover:bg-surface2 hover:border-accent/40 active:scale-[0.98] transition-all text-left"
          >
            <span className="text-2xl leading-none mt-0.5" aria-hidden="true">🎤</span>
            <div>
              <p className="text-base font-semibold text-ink">Sí, activar voz</p>
              <p className="text-xs text-dim mt-0.5">Whisper Tiny · ~40 MB extra</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleAudio(false)}
            className="w-full flex items-start gap-4 p-5 rounded-xl border border-rim bg-surface hover:bg-surface2 hover:border-accent/40 active:scale-[0.98] transition-all text-left"
          >
            <span className="text-2xl leading-none mt-0.5" aria-hidden="true">⌨️</span>
            <div>
              <p className="text-base font-semibold text-ink">Solo texto por ahora</p>
              <p className="text-xs text-dim mt-0.5">Podés activarlo después desde ajustes</p>
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
            Esto solo pasa una vez. Todo se descarga directamente en tu dispositivo.
          </p>
        </div>
        <div className="w-full max-w-xs space-y-4">
          <ProgressBar label="Motor de búsqueda"   value={embedProgress}    max={100} done={embedStatus    === 'ready'} />
          <ProgressBar label="Reranker"             value={rerankerProgress} max={100} done={rerankerStatus === 'ready'} />
          <ProgressBar label="Modelo de lenguaje"   value={llmProgress}      max={100} done={llmStatus      === 'ready'} />
          {audioRequired && (
            <ProgressBar label="Audio (Whisper)"    value={whisperProgress}  max={100} done={whisperStatus  === 'ready'} />
          )}
        </div>
        {!canFinish && (
          <p className="text-xs text-dim/60 animate-pulse">Casi listo…</p>
        )}
        <button
          type="button"
          onClick={handleFinish}
          disabled={!canFinish}
          className="w-full max-w-xs py-4 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark active:scale-[0.98] transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {canFinish ? 'Continuar →' : 'Descargando…'}
        </button>
      </div>
    ),

    biometric: (
      <div className="flex flex-col items-center text-center gap-8 animate-fade-in">
        <div>
          <div className="text-5xl mb-2" aria-hidden="true">🔐</div>
          <h1 className="text-2xl font-bold text-ink mb-3">Protegé tu Archivo</h1>
          <p className="text-sm text-dim leading-relaxed max-w-xs mx-auto">
            Usá tu huella digital, Face ID o el PIN del dispositivo para acceder.
            Solo vos podés ver tus documentos.
          </p>
        </div>
        <div className="w-full max-w-xs space-y-3">
          <button
            type="button"
            onClick={handleBiometricSetup}
            className="w-full py-4 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark active:scale-[0.98] transition-all shadow-md"
          >
            Activar acceso seguro
          </button>
          <button
            type="button"
            onClick={() => onComplete(prefs as OnboardingPrefs)}
            className="w-full py-3 rounded-xl text-dim text-sm hover:text-ink transition-colors"
          >
            Ahora no
          </button>
        </div>
      </div>
    ),
  }

  return (
    <div className={`fixed inset-0 z-[90] bg-base flex flex-col ${step === 'install' ? 'overflow-y-auto' : 'items-center justify-center px-6 py-12'}`}>
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
