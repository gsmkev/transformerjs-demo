'use client'

import { useState } from 'react'

interface Props {
  onOpenScanner?: () => void
  onInstall?: () => void     // Chrome native prompt handler from parent
  installContext?: boolean   // true = render install CTA instead of scanner
}

const features = [
  {
    icon: '📄',
    title: 'Escaneá cualquier papel',
    desc: 'Fotos, PDFs, capturas de pantalla. OCR automático, sin servidores.',
  },
  {
    icon: '🔍',
    title: 'Buscá con lenguaje natural',
    desc: 'Preguntá como hablarías. BM25 + semántico + reranker.',
  },
  {
    icon: '🔒',
    title: '100% privado',
    desc: 'Nada sale de tu dispositivo. Sin cuentas ni telemetría.',
  },
  {
    icon: '✈️',
    title: 'Funciona offline',
    desc: 'Una vez instalada, no necesita internet. Siempre disponible.',
  },
]

const steps = [
  { n: '1', title: 'Escaneá', desc: 'Foto a un documento, factura o contrato.' },
  { n: '2', title: 'Preguntá', desc: '«¿Cuál es el vencimiento de mi seguro?»' },
  { n: '3', title: 'Encontrá', desc: 'El párrafo exacto del documento, en segundos.' },
]

const techDetails = [
  {
    title: 'Arquitectura',
    body: 'PWA offline-first. Todo corre en tu navegador — nada sale de tu dispositivo. Almacenamiento en IndexedDB.',
  },
  {
    title: 'OCR',
    body: 'Tesseract.js — port WASM del motor Tesseract. Soporte para español e inglés sin ningún servidor.',
  },
  {
    title: 'Embeddings',
    body: 'all-MiniLM-L6-v2 · 384 dimensiones via Transformers.js. Eficiente para búsqueda semántica local.',
  },
  {
    title: 'LLM',
    body: 'Llama 3.2 1B / Qwen 0.5B — cuantizados (Q4). Inferencia en WebGPU cuando está disponible, WASM como fallback.',
  },
  {
    title: 'Reranker',
    body: 'ms-marco-MiniLM-L-6-v2 cross-encoder. Reordena resultados por relevancia real, no solo similitud vectorial.',
  },
  {
    title: 'Audio',
    body: 'Whisper Tiny — 39M parámetros. Transcripción local a 16kHz sin subir tu audio a ningún lado.',
  },
  {
    title: 'RAG Pipeline',
    body: 'BM25 + semántico + RRF fusion + reranking. Chunking a ~350 chars para mayor precisión en documentos largos.',
  },
  {
    title: 'Privacidad',
    body: 'Sin analytics, sin telemetría, sin cuentas. Así de simple.',
  },
]

const ArchivoLogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <rect x="14" y="8" width="26" height="34" rx="2" fill="white" opacity="0.95"/>
    <polygon points="40,8 40,17 49,17" fill="rgba(255,255,255,0.5)"/>
    <line x1="18" y1="21" x2="35" y2="21" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
    <line x1="18" y1="27" x2="35" y2="27" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
    <line x1="18" y1="33" x2="29" y2="33" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
  </svg>
)

const LinkedInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
)

function detectPlatform(): { browser: 'chrome' | 'safari' | 'samsung' | 'firefox' | 'other'; isMobile: boolean } {
  if (typeof navigator === 'undefined') return { browser: 'other', isMobile: false }
  const ua = navigator.userAgent
  const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(ua)
  if (/CriOS/i.test(ua)) return { browser: 'chrome', isMobile: true }
  if (/SamsungBrowser/i.test(ua)) return { browser: 'samsung', isMobile }
  if (/Firefox|FxiOS/i.test(ua)) return { browser: 'firefox', isMobile }
  if (/Edg\/|Chrome\/|Chromium\//i.test(ua)) return { browser: 'chrome', isMobile }
  if (/Safari\//i.test(ua)) return { browser: 'safari', isMobile }
  return { browser: 'other', isMobile }
}

function InstallInstructions() {
  const { browser, isMobile } = detectPlatform()

  const card = (children: React.ReactNode) => (
    <div className="bg-surface border border-rim rounded-xl p-4 text-sm text-left">
      {children}
    </div>
  )

  const title = (t: string) => (
    <p className="font-semibold text-ink mb-3">{t}</p>
  )

  const step = (n: number, content: React.ReactNode) => (
    <li key={n} className="flex items-start gap-3 text-dim">
      <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {n}
      </span>
      <span className="leading-relaxed">{content}</span>
    </li>
  )

  const kbd = (t: string) => (
    <span className="inline-block bg-surface2 border border-rim rounded px-1.5 py-0.5 font-mono text-xs">{t}</span>
  )

  if (browser === 'chrome') {
    return card(
      <>
        {title(isMobile ? 'Para instalar en Chrome:' : 'Para instalar en Chrome (escritorio):')}
        <p className="text-dim leading-relaxed">
          {isMobile ? 'Tocá' : 'Hacé click en'} el ícono {kbd('⊕')} en la barra de
          direcciones y luego <strong className="text-ink">Instalar</strong>.
        </p>
      </>
    )
  }

  if (browser === 'safari' && isMobile) {
    return card(
      <>
        {title('Para instalar en iPhone / iPad:')}
        <ol className="space-y-2.5">
          {step(1, <>Tocá el botón de compartir {kbd('□↑')} en la barra inferior</>)}
          {step(2, <>Deslizá y tocá <strong className="text-ink">«Agregar a pantalla de inicio»</strong></>)}
          {step(3, <>Tocá <strong className="text-ink">«Agregar»</strong> en la esquina superior derecha</>)}
        </ol>
      </>
    )
  }

  if (browser === 'safari' && !isMobile) {
    return card(
      <>
        {title('Para instalar en Safari (macOS):')}
        <p className="text-dim leading-relaxed">
          Menú <strong className="text-ink">Archivo</strong> →{' '}
          <strong className="text-ink">Agregar al Dock</strong>
        </p>
        <p className="text-xs text-dim/60 mt-1.5">Disponible en macOS Sonoma o posterior</p>
      </>
    )
  }

  if (browser === 'samsung') {
    return card(
      <>
        {title('Para instalar en Samsung Internet:')}
        <p className="text-dim leading-relaxed">
          Menú {kbd('☰')} →{' '}
          <strong className="text-ink">Añadir página a</strong> →{' '}
          <strong className="text-ink">Pantalla de inicio</strong>
        </p>
      </>
    )
  }

  if (browser === 'firefox') {
    return card(
      <>
        {title('Para instalar en Firefox:')}
        <p className="text-dim leading-relaxed">
          Menú {kbd('⋮')} → <strong className="text-ink">Instalar</strong>
        </p>
      </>
    )
  }

  return card(
    <p className="text-dim text-center leading-relaxed">
      Para la mejor experiencia, abrí esta página en{' '}
      <strong className="text-ink">Chrome</strong> o{' '}
      <strong className="text-ink">Safari</strong>.
    </p>
  )
}

export default function LandingView({ onOpenScanner, onInstall, installContext }: Props) {
  const [nerdsOpen, setNerdsOpen] = useState(false)

  return (
    <div className="px-4 pt-12 pb-16 max-w-lg mx-auto animate-fade-in">

      {/* ── Hero ── */}
      <div className="text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-6 shadow-md">
          <ArchivoLogo size={32} />
        </div>
        <h1 className="text-3xl font-bold text-ink leading-tight mb-3">
          Tu vault personal<br />de documentos.
        </h1>
        <p className="text-base text-dim leading-relaxed max-w-sm mx-auto">
          Buscá cualquier papel o contrato en segundos.<br />
          Sin nube. Sin suscripción. Todo en tu dispositivo.
        </p>
      </div>

      {/* ── Features 2×2 ── */}
      <div className="grid grid-cols-2 gap-3 mb-10">
        {features.map((f) => (
          <div key={f.title} className="bg-surface border border-rim rounded-xl p-4">
            <span className="text-2xl leading-none mb-2 block" aria-hidden="true">{f.icon}</span>
            <p className="text-sm font-semibold text-ink mb-1">{f.title}</p>
            <p className="text-xs text-dim leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* ── How it works ── */}
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent text-center mb-5">
          Cómo funciona
        </p>
        <div className="space-y-4">
          {steps.map((s) => (
            <div key={s.n} className="flex items-start gap-4">
              <span className="w-8 h-8 rounded-full bg-accent/10 text-accent text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {s.n}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{s.title}</p>
                <p className="text-sm text-dim">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="mb-10 space-y-3">
        {installContext ? (
          onInstall ? (
            <>
              <button
                type="button"
                onClick={onInstall}
                className="w-full py-4 rounded-xl bg-accent text-white font-semibold hover:bg-accent-dark active:scale-[0.98] transition-all shadow-lg"
              >
                Instalar Archivo →
              </button>
              <p className="text-xs text-center text-dim">Gratis · Sin registro · 100% local</p>
            </>
          ) : (
            <>
              <InstallInstructions />
              <div className="flex items-center justify-center gap-2 text-xs text-dim/60 pt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent/50 animate-pulse" aria-hidden="true" />
                Esperando instalación…
              </div>
            </>
          )
        ) : (
          <button
            type="button"
            onClick={onOpenScanner}
            className="w-full py-4 rounded-xl bg-accent text-white font-semibold hover:bg-accent-dark active:scale-[0.98] transition-all shadow-md"
          >
            Escanear mi primer documento
          </button>
        )}
      </div>

      {/* ── Para nerds ── */}
      <div className="border border-rim rounded-xl overflow-hidden mb-12">
        <button
          type="button"
          onClick={() => setNerdsOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium text-dim hover:text-ink transition-colors"
          aria-expanded={nerdsOpen}
        >
          <span>Para nerds — cómo funciona por dentro</span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"
            className={`transition-transform duration-200 ${nerdsOpen ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {nerdsOpen && (
          <div className="px-4 pb-4 border-t border-rim space-y-4 animate-fade-in">
            {techDetails.map((d) => (
              <div key={d.title}>
                <p className="text-xs font-semibold uppercase tracking-widest text-accent mt-4 mb-1">{d.title}</p>
                <p className="text-sm text-dim leading-relaxed">{d.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer / Social ── */}
      <div className="text-center">
        <p className="text-xs text-dim/50 mb-4">Hecho con ♥ por</p>
        <div className="flex items-center justify-center gap-6">
          <a
            href="https://linkedin.com/in/gsmkev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-dim hover:text-accent transition-colors"
            aria-label="LinkedIn de gsmkev"
          >
            <LinkedInIcon />
            <span>gsmkev</span>
          </a>
          <span className="text-dim/30" aria-hidden="true">·</span>
          <a
            href="https://github.com/gsmkev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-dim hover:text-ink transition-colors"
            aria-label="GitHub de gsmkev"
          >
            <GitHubIcon />
            <span>gsmkev</span>
          </a>
        </div>
      </div>

    </div>
  )
}
