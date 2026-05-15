'use client'

import { useState, useCallback } from 'react'
import type { OcrResult } from '@/types/ocr'
import Button from '@/components/ui/Button'

interface Props { result: OcrResult | null; error: string | null }

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
      setTimeout(() => setCopyState('idle'), 1500)
    }
  }, [result])

  if (error) {
    return (
      <div role="alert" className="flex gap-2.5 px-4 py-3.5 rounded-xl bg-err/8 border border-err/20">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-err flex-shrink-0 mt-0.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-sm text-err">{error}</p>
      </div>
    )
  }

  if (!result) return null

  return (
    <div className="card space-y-3 animate-slide-up">
      <div className="flex items-center justify-between gap-2">
        <p className="section-label">Result</p>
        <div className="flex items-center gap-2">
          {result.confidence !== null && (
            <span className="text-xs font-mono text-dim/70 tabular-nums">{result.confidence.toFixed(1)}% conf.</span>
          )}
          <Button variant="ghost" onClick={copy} aria-label="Copy result" className="py-1 px-2.5 text-xs h-auto">
            {copyState === 'ok' ? <span className="text-ok">Copied!</span>
             : copyState === 'fail' ? <span className="text-err">Failed</span>
             : 'Copy'}
          </Button>
        </div>
      </div>
      <textarea
        readOnly
        value={result.text}
        rows={8}
        aria-label="OCR result text"
        className="w-full max-h-60 sm:max-h-80 lg:max-h-none bg-void border border-white/7 rounded-xl px-4 py-3 text-sm text-ink/85 font-mono resize-y focus:outline-none focus:ring-1 focus:ring-accent/40 leading-relaxed"
      />
    </div>
  )
}
