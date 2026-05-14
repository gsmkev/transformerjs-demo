'use client'

import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled]       = useState(false)
  const [isIos, setIsIos]                   = useState(false)
  const [dismissed, setDismissed]           = useState(false)

  useEffect(() => {
    // Already in standalone mode → installed
    const mq = window.matchMedia('(display-mode: standalone)')
    setIsInstalled(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsInstalled(e.matches)
    mq.addEventListener('change', onChange)

    // iOS: no beforeinstallprompt API, user must use Share → Add to Home Screen
    const ua = navigator.userAgent
    setIsIos(/iphone|ipad|ipod/i.test(ua) && !('MSStream' in window))

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    return () => {
      mq.removeEventListener('change', onChange)
      window.removeEventListener('beforeinstallprompt', onPrompt)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
  }, [deferredPrompt])

  const dismiss = useCallback(() => setDismissed(true), [])

  const canInstall =
    !isInstalled &&
    !dismissed &&
    (deferredPrompt !== null || isIos)

  return { install, dismiss, canInstall, isIos, hasDeferredPrompt: deferredPrompt !== null }
}
