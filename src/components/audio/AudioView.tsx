'use client'

import AudioDropzone from './AudioDropzone'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'
import type { useAudioTranscription } from '@/hooks/useAudioTranscription'

interface Props {
  audio: ReturnType<typeof useAudioTranscription>
  onSave: (text: string) => Promise<void>
  saving: boolean
}

export default function AudioView({ audio, onSave, saving }: Props) {
  const modelReady = audio.status === 'ready'

  return (
    <div className="flex flex-col gap-4">
      {audio.status !== 'ready' && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Modelo Whisper Tiny (~39 MB)</p>
            <Button
              onClick={audio.loadModel}
              spinning={audio.status === 'loading'}
              disabled={audio.status === 'loading'}
              className="py-1 px-3 text-xs"
            >
              {audio.status === 'loading' ? 'Cargando…' : 'Cargar modelo'}
            </Button>
          </div>
          {audio.status === 'loading' && <ProgressBar value={audio.progress} />}
          {audio.error && <p className="text-xs text-err/80">{audio.error}</p>}
        </div>
      )}

      <AudioDropzone
        onFile={(file) => audio.run(file)}
        disabled={!modelReady || audio.running}
      />

      {audio.running && (
        <div className="flex items-center gap-2 text-xs text-info/80">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          Transcribiendo…
        </div>
      )}

      {audio.transcript && (
        <div className="card space-y-3 animate-fade-in">
          <p className="section-label">Transcripción</p>
          <textarea
            readOnly
            value={audio.transcript}
            rows={6}
            className="w-full bg-void border border-white/7 rounded-xl px-4 py-3 text-sm text-ink/85 font-mono resize-y focus:outline-none focus:ring-1 focus:ring-accent/40 leading-relaxed"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => onSave(audio.transcript!)}
              disabled={saving}
              spinning={saving}
              className="py-1.5 px-4 text-xs"
            >
              {saving ? 'Guardando…' : 'Guardar en biblioteca'}
            </Button>
            <Button variant="ghost" onClick={audio.reset} className="py-1.5 px-3 text-xs">
              Limpiar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
