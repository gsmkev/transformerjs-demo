'use client'

import { useState, useCallback } from 'react'
import type { OcrResult } from '@/types/ocr'
import Button from '@/components/ui/Button'

interface Props {
  result: OcrResult | null
  error: string | null
}

export default function ResultPanel({ result, error }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async () => {
    if (!result?.text) return
    await navigator.clipboard.writeText(result.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [result])

  if (error) {
    return (
      <div className="card bg-err/10 border-err/30">
        <p className="text-sm text-err">{error}</p>
      </div>
    )
  }

  if (!result) return null

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">Result</h3>
        <div className="flex items-center gap-3">
          {result.confidence !== null && (
            <span className="text-xs text-dim">Confidence: {result.confidence.toFixed(1)}%</span>
          )}
          <Button variant="ghost" onClick={copy} className="py-1 text-xs">
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </div>
      <textarea
        readOnly
        value={result.text}
        rows={8}
        className="w-full bg-base border border-rim rounded-lg p-3 text-sm text-ink resize-y focus:outline-none focus:ring-2 focus:ring-accent font-mono"
      />
    </div>
  )
}
