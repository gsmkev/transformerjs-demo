'use client'

import { useRef, useState, useCallback } from 'react'

interface Props {
  onFile: (file: File) => void
  disabled?: boolean
}

export default function AudioDropzone({ onFile, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [recording, setRecording] = useState(false)
  const [dragOver, setDragOver]   = useState(false)
  const mediaRef  = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const handleFile = (f: File) => {
    if (!f.type.startsWith('audio/')) return
    onFile(f)
  }

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onFile(new File([blob], 'recording.webm', { type: 'audio/webm' }))
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      mediaRef.current = recorder
      setRecording(true)
    } catch {
      alert('No se pudo acceder al micrófono.')
    }
  }, [onFile])

  const stopRecording = useCallback(() => {
    mediaRef.current?.stop()
    mediaRef.current = null
    setRecording(false)
  }, [])

  return (
    <div className="space-y-2">
      <div
        onClick={() => !disabled && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const f = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('audio/'))
          if (f) handleFile(f)
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => { if (e.key === 'Enter') fileRef.current?.click() }}
        aria-label="Subir archivo de audio"
        className={`cursor-pointer rounded-2xl border-2 border-dashed transition-all p-10 flex flex-col items-center justify-center gap-3 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
          dragOver ? 'border-accent bg-accent/8' : 'border-white/12 hover:border-accent/50 hover:bg-white/3'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <div className="w-12 h-12 rounded-2xl bg-white/5 text-dim flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
        <div>
          <p className="text-sm text-ink/80">Suelta un audio aquí, o <span className="text-accent font-medium">selecciona archivo</span></p>
          <p className="text-xs text-dim/60 mt-1">MP3, WAV, OGG, M4A, WebM</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        disabled={disabled}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-colors ${
          recording
            ? 'border-err/30 bg-err/10 text-err hover:bg-err/15'
            : 'border-white/10 text-dim hover:text-ink hover:bg-white/5'
        } disabled:opacity-50`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={recording ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
        </svg>
        {recording ? 'Detener grabación' : 'Grabar con micrófono'}
      </button>
    </div>
  )
}
