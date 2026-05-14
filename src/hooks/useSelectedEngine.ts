'use client'

import { useState, useEffect, useCallback } from 'react'
import { ENGINES } from '@/config/engines'

const STORAGE_KEY = 'ocr-selected-engine'
const VALID_IDS = new Set(ENGINES.map((e) => e.id))

function readStoredId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    // Reject stored values that no longer correspond to a known engine
    if (stored && VALID_IDS.has(stored)) return stored
  } catch {
    // SSR or storage blocked
  }
  return ENGINES[0].id
}

export function useSelectedEngine() {
  // Start with default; replaced on mount from localStorage to avoid SSR mismatch
  const [selectedId, setSelectedIdState] = useState<string>(ENGINES[0].id)

  useEffect(() => {
    setSelectedIdState(readStoredId())
  }, [])

  const setSelectedId = useCallback((id: string) => {
    if (!VALID_IDS.has(id)) return // guard against invalid IDs
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // storage blocked (private mode, etc.)
    }
    setSelectedIdState(id)
  }, [])

  return { selectedId, setSelectedId } as const
}
