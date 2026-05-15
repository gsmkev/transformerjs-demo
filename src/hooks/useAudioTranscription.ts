'use client'

import { useState, useCallback } from 'react'
import { loadWhisper, transcribe, isWhisperLoaded } from '@/services/whisperService'
import type { WhisperStatus } from '@/services/whisperService'

export function useAudioTranscription() {
  const [status, setStatus]         = useState<WhisperStatus>('idle')
  const [progress, setProgress]     = useState(0)
  const [error, setError]           = useState<string | null>(null)
  const [running, setRunning]       = useState(false)
  const [transcript, setTranscript] = useState<string | null>(null)

  const loadModel = useCallback(async () => {
    if (status === 'loading' || status === 'ready') return
    setStatus('loading')
    setError(null)
    try {
      await loadWhisper((pct) => setProgress(pct))
      setStatus('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }, [status])

  const run = useCallback(async (file: File): Promise<string | null> => {
    if (!isWhisperLoaded()) {
      setError('Carga el modelo Whisper primero.')
      return null
    }
    setRunning(true)
    setError(null)
    setTranscript(null)
    try {
      const text = await transcribe(file)
      setTranscript(text)
      return text
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return null
    } finally {
      setRunning(false)
    }
  }, [])

  const reset = useCallback(() => {
    setTranscript(null)
    setError(null)
  }, [])

  return { status, progress, error, running, transcript, loadModel, run, reset } as const
}
