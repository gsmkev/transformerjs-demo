'use client'

import { useState } from 'react'

interface Props {
  onOpenScanner: () => void
}

const features = [
  { icon: '📄', text: 'Escanea cualquier papel o PDF' },
  { icon: '🔍', text: 'Busca con lenguaje natural' },
  { icon: '🔒', text: 'Todo queda en tu dispositivo. En serio.' },
  { icon: '✈️', text: 'Funciona sin internet' },
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
    body: 'all-MiniLM-L6-v2 · 384 dimensiones via Transformers.js. No es el modelo más grande, pero es el más eficiente para búsqueda semántica local. Cabe en memoria, responde rápido.',
  },
  {
    title: 'LLM',
    body: 'Llama 3.2 1B / Qwen 0.5B — cuantizados (GGUF/Q4). Inferencia en WebGPU cuando está disponible, WASM como fallback.',
  },
  {
    title: 'Reranker',
    body: 'ms-marco-MiniLM-L-6-v2 cross-encoder. Reordena los resultados por relevancia real, no solo por similitud vectorial.',
  },
  {
    title: 'Audio',
    body: 'Whisper Tiny — 39M parámetros, decodificación a 16kHz. Transcripción local sin subir tu audio a ningún lado.',
  },
  {
    title: 'Búsqueda RAG',
    body: 'Pipeline BM25 + semántico + RRF fusion + reranking. Retrieval a nivel de fragmento (~350 chars/chunk) para mayor precisión en documentos largos.',
  },
  {
    title: 'Privacidad',
    body: 'Sin analytics, sin telemetría, sin cuentas. Así de simple.',
  },
]

export default function LandingView({ onOpenScanner }: Props) {
  const [nerdsOpen, setNerdsOpen] = useState(false)

  return (
    <div className="px-4 pt-10 pb-32 max-w-lg mx-auto animate-fade-in">
      {/* Logo + headline */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-5 shadow-md">
          <svg width="32" height="32" viewBox="0 0 64 64" aria-hidden="true">
            <rect x="14" y="8" width="26" height="34" rx="2" fill="white" opacity="0.95"/>
            <polygon points="40,8 40,17 49,17" fill="rgba(255,255,255,0.5)"/>
            <line x1="18" y1="21" x2="35" y2="21" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
            <line x1="18" y1="27" x2="35" y2="27" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
            <line x1="18" y1="33" x2="29" y2="33" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-ink">Tu vault personal de documentos.</h1>
        <p className="text-base text-dim mt-2">Sin nube. Sin suscripción.</p>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8" role="list">
        {features.map((f) => (
          <li key={f.text} className="flex items-start gap-3">
            <span className="text-xl leading-none mt-0.5" aria-hidden="true">{f.icon}</span>
            <span className="text-sm text-ink leading-relaxed">{f.text}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        type="button"
        onClick={onOpenScanner}
        className="w-full py-3.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark active:scale-[0.98] transition-all shadow-md"
      >
        Escanear mi primer documento
      </button>

      {/* Para nerds */}
      <div className="mt-8 border border-rim rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setNerdsOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium text-dim hover:text-ink transition-colors"
          aria-expanded={nerdsOpen}
        >
          <span>Para nerds — cómo funciona por dentro</span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"
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
    </div>
  )
}
