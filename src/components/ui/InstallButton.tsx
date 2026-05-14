'use client'

import { useState } from 'react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

export default function InstallButton() {
  const { install, dismiss, canInstall, isIos, hasDeferredPrompt } = useInstallPrompt()
  const [showIosHelp, setShowIosHelp] = useState(false)

  if (!canInstall) return null

  const handleClick = () => {
    if (hasDeferredPrompt) {
      install()
    } else if (isIos) {
      setShowIosHelp(true)
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-accent/40 text-accent text-xs font-semibold hover:bg-accent/10 transition-colors"
        aria-label="Install app"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
          aria-label="Install instructions for iOS"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowIosHelp(false); dismiss() } }}
        >
          <div className="bg-surface border border-rim rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <p className="text-sm font-semibold text-ink">Install on iOS</p>
            <ol className="text-sm text-dim space-y-2 list-none">
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold">1.</span>
                Tap the <strong className="text-ink">Share</strong> button
                <svg className="inline-block w-4 h-4 mb-0.5 ml-0.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold">2.</span>
                Scroll down and tap <strong className="text-ink">Add to Home Screen</strong>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold">3.</span>
                Tap <strong className="text-ink">Add</strong> — done!
              </li>
            </ol>
            <p className="text-xs text-dim/70">
              Once installed, the app works fully offline — models you download stay cached on your device.
            </p>
            <button
              onClick={() => { setShowIosHelp(false); dismiss() }}
              className="w-full py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
