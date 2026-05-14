'use client'

import { useState, useCallback } from 'react'
import type { OcrResult } from '@/types/ocr'
import Button from '@/components/ui/Button'

const COPY_SUCCESS_MS = 1500

interface Props {
  result: OcrResult | null
  error: string | null
}

export default function ResultPanel({ result, error }: Props) {
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'fail'>('idle')

  const copy = useCallback(async () => {
    if (!result?.text) return
    try {
      await navigator.clipboard.writeText(result.text)
      setCopyState('ok')
    } catch {
      setCopyState('fail')
    } finally {
      setTimeout(() => setCopyState('idle'), COPY_SUCCESS_MS)
    }
  }, [result])

  if (error) {
    return (
      <div role="alert" className="card bg-err/10 border-err/30">
        <p className="text-sm text-err">{error}</p>
      </div>
    )
  }

  if (!result) return null

  const copyLabel = copyState === 'ok' ? 'Copied!' : copyState === 'fail' ? 'Failed' : 'Copy'

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">Result</h3>
        <div className="flex items-center gap-3">
          {result.confidence !== null && (
            <span className="text-xs text-dim">Confidence: {result.confidence.toFixed(1)}%</span>
          )}
          <Button
            variant="ghost"
            onClick={copy}
            aria-label="Copy OCR result text to clipboard"
            className="py-1 text-xs"
          >
            {copyLabel}
          </Button>
        </div>
      </div>
      <textarea
        readOnly
        value={result.text}
        rows={8}
        aria-label="OCR result text"
        className="w-full max-h-64 sm:max-h-96 bg-base border border-rim rounded-lg p-3 text-sm text-ink resize-y focus:outline-none focus:ring-2 focus:ring-accent font-mono"
      />
    </div>
  )
}
