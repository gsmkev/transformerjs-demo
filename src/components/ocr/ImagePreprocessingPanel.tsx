'use client'

import { useState, useEffect, useCallback } from 'react'
import { preprocessImage, DEFAULT_PREPROCESS, isDefaultPreprocess } from '@/lib/imagePreprocessing'
import type { PreprocessOptions } from '@/lib/imagePreprocessing'

interface Props {
  originalDataUrl: string
  onProcessed: (dataUrl: string) => void
}

function Slider({
  label, value, min, max, defaultVal, onChange,
}: {
  label: string; value: number; min: number; max: number; defaultVal: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-dim w-20 flex-shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-accent"
      />
      <span className="text-xs font-mono text-dim/70 w-10 text-right">{value}</span>
      {value !== defaultVal && (
        <button
          type="button"
          onClick={() => onChange(defaultVal)}
          className="text-xs text-dim/40 hover:text-accent transition-colors"
          aria-label={`Reset ${label}`}
        >
          ↺
        </button>
      )}
    </div>
  )
}

export default function ImagePreprocessingPanel({ originalDataUrl, onProcessed }: Props) {
  const [opts, setOpts] = useState<PreprocessOptions>(DEFAULT_PREPROCESS)
  const [processing, setProcessing] = useState(false)

  const apply = useCallback(async (o: PreprocessOptions) => {
    if (isDefaultPreprocess(o)) {
      onProcessed(originalDataUrl)
      return
    }
    setProcessing(true)
    try {
      const result = await preprocessImage(originalDataUrl, o)
      onProcessed(result)
    } finally {
      setProcessing(false)
    }
  }, [originalDataUrl, onProcessed])

  useEffect(() => {
    const id = setTimeout(() => apply(opts), 200)
    return () => clearTimeout(id)
  }, [opts, apply])

  const update = (key: keyof PreprocessOptions) => (v: number) =>
    setOpts((prev) => ({ ...prev, [key]: v }))

  const reset = () => setOpts(DEFAULT_PREPROCESS)
  const isDefault = isDefaultPreprocess(opts)

  return (
    <div className="space-y-2 px-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-dim/70 font-medium">Ajuste de imagen</p>
        {!isDefault && (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-dim/50 hover:text-accent transition-colors"
          >
            Restablecer
          </button>
        )}
        {processing && (
          <span className="text-xs text-info/70">Procesando…</span>
        )}
      </div>
      <Slider label="Brillo"    value={opts.brightness} min={0}    max={200} defaultVal={100} onChange={update('brightness')} />
      <Slider label="Contraste" value={opts.contrast}   min={0}    max={200} defaultVal={100} onChange={update('contrast')}   />
      <Slider label="Rotación"  value={opts.rotation}   min={-180} max={180} defaultVal={0}   onChange={update('rotation')}   />
    </div>
  )
}
