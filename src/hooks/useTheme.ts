'use client'

import { useState, useCallback, useEffect } from 'react'

export type ThemeChoice = 'dark' | 'light' | 'system'
export type Theme = 'dark' | 'light'   // resolved

const STORAGE_KEY = 'archivo_theme'

function resolveTheme(choice: ThemeChoice): Theme {
  if (choice === 'system') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark' : 'light'
  }
  return choice
}

function readChoice(): ThemeChoice {
  if (typeof window === 'undefined') return 'system'
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s === 'light' || s === 'dark' || s === 'system') return s
    return 'system'
  } catch { return 'system' }
}

function applyTheme(resolved: Theme) {
  document.documentElement.classList.toggle('light', resolved === 'light')
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readChoice)
  const theme: Theme = resolveTheme(choice)

  useEffect(() => {
    applyTheme(theme)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // intentional: apply once on mount to sync DOM with persisted state

  const setThemeChoice = useCallback((next: ThemeChoice) => {
    setChoice(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}
    applyTheme(resolveTheme(next))
  }, [])

  const toggle = useCallback(() => {
    setThemeChoice(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setThemeChoice])

  return { theme, choice, setThemeChoice, toggle }
}
