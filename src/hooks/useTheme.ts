'use client'

import { useState, useCallback } from 'react'

export type Theme = 'dark' | 'light'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  try {
    const stored = localStorage.getItem('papeleo_theme')
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'dark'
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('papeleo_theme', next)
      document.documentElement.classList.toggle('light', next === 'light')
      return next
    })
  }, [])

  return { theme, toggle }
}
