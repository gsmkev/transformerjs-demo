'use client'

import { useState } from 'react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

export default function InstallButton() {
  const { install, dismiss, canInstall, isIos, hasDeferredPrompt } = useInstallPrompt()
  const [showIosHelp, setShowIosHelp] = useState(false)

  if (!canInstall) return null

  const handleClick = () => {
    if (hasDeferredPrompt) { install() }
    else if (isIos) { setShowIosHelp(true) }
  }

  return (
    <>
      <button
        onClick={handleClick}
        aria-label="Install app"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/9 border border-white/9 hover:border-accent/40 text-ink/70 hover:text-accent text-xs font-medium transition-all"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Install
      </button>

      {showIosHelp && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowIosHelp(false); dismiss() } }}
        >
          <div className="card-elevated p-6 max-w-sm w-full space-y-5 animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Add to Home Screen</p>
                <p className="text-xs text-dim mt-0.5">Install Local OCR as a PWA</p>
              </div>
            </div>

            <ol className="space-y-3 list-none">
              {[
                <>Tap the <strong className="text-ink">Share</strong> button in Safari&apos;s toolbar</>,
                <>Scroll down and tap <strong className="text-ink">Add to Home Screen</strong></>,
                <>Tap <strong className="text-ink">Add</strong> — done!</>,
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-dim">
                  <span className="w-5 h-5 rounded-full bg-accent/15 border border-accent/25 text-accent text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <p className="text-xs text-dim/70">Once installed the app works fully offline — models you download stay cached.</p>

            <button
              onClick={() => { setShowIosHelp(false); dismiss() }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-accent to-violet-500 text-white text-sm font-medium shadow-btn-primary hover:opacity-90 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
