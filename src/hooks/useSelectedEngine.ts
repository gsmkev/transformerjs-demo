'use client'

import { useState, useEffect, useCallback } from 'react'
import { ENGINES } from '@/config/engines'

const STORAGE_KEY = 'ocr-selected-engine'

function readStoredId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ENGINES[0].id
  } catch {
    return ENGINES[0].id
  }
}

export function useSelectedEngine() {
  const [selectedId, setSelectedIdState] = useState<string>(ENGINES[0].id)

  useEffect(() => {
    setSelectedIdState(readStoredId())
  }, [])

  const setSelectedId = useCallback((id: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // ignore
    }
    setSelectedIdState(id)
  }, [])

  return { selectedId, setSelectedId } as const
}
