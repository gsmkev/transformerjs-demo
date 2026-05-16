'use client'

import { useState, useCallback, useEffect } from 'react'

export interface A11yPrefs {
  textSize: 'normal' | 'large'
  contrast: 'normal' | 'high'
  motion:   'normal' | 'reduced'
}

const STORAGE_KEY = 'archivo_a11y'

const DEFAULTS: A11yPrefs = { textSize: 'normal', contrast: 'normal', motion: 'normal' }

function readPrefs(): A11yPrefs {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const stored = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : null
    if (stored) return stored
    // No stored value — check OS preference for motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return { ...DEFAULTS, motion: prefersReduced ? 'reduced' : 'normal' }
  } catch { return DEFAULTS }
}

function applyPrefs(prefs: A11yPrefs) {
  const cl = document.documentElement.classList
  cl.toggle('a11y-large',    prefs.textSize === 'large')
  cl.toggle('a11y-contrast', prefs.contrast === 'high')
  cl.toggle('a11y-motion',   prefs.motion   === 'reduced')
}

export function useA11y() {
  const [prefs, setPrefs] = useState<A11yPrefs>(readPrefs)

  useEffect(() => {
    applyPrefs(prefs)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // intentional: apply once on mount to sync DOM with persisted state

  const update = useCallback((partial: Partial<A11yPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {}
      applyPrefs(next)
      return next
    })
  }, [])

  return { prefs, update }
}
