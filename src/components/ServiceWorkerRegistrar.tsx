'use client'

import { useEffect, useState, useCallback } from 'react'

export default function ServiceWorkerRegistrar() {
  const [updateReady, setUpdateReady] = useState(false)
  const [pendingReload, setPendingReload] = useState(false)

  const reload = useCallback(() => window.location.reload(), [])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const prevController = navigator.serviceWorker.controller

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(() => {})

    const onControllerChange = () => {
      // Only show update banner on upgrade (not first install)
      if (prevController) {
        setUpdateReady(true)
        setPendingReload(true)
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
  }, [])

  // Auto-reload when user returns to the tab after an update is pending
  useEffect(() => {
    if (!pendingReload) return
    const onVisibility = () => {
      if (document.visibilityState === 'visible') window.location.reload()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [pendingReload])

  if (!updateReady) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 rounded-xl border border-edge bg-surface px-4 py-3 shadow-lg text-sm text-ink">
      <span>Nueva versión disponible</span>
      <button
        onClick={reload}
        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
      >
        Actualizar
      </button>
    </div>
  )
}
