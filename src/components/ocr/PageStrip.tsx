'use client'

import { useRef, type RefObject } from 'react'

interface Props {
  pages: string[]
  onAdd: (f: File) => void
  onRemove: (index: number) => void
  cameraInputRef?: RefObject<HTMLInputElement>
}

export default function PageStrip({ pages, onAdd, onRemove, cameraInputRef }: Props) {
  const addInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {pages.map((url, i) => (
          <div key={i} className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-surface group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Página ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label={`Eliminar página ${i + 1}`}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
            <div className="absolute bottom-0.5 left-0.5 px-1 py-0 rounded text-[9px] text-white/80 bg-black/40 leading-tight">
              {i + 1}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => addInputRef.current?.click()}
          className="flex-shrink-0 w-14 h-14 rounded-xl border border-dashed border-white/20 hover:border-accent/40 hover:bg-accent/5 flex flex-col items-center justify-center gap-0.5 transition-colors text-dim hover:text-accent"
          aria-label="Añadir página"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span className="text-[9px] leading-tight">Añadir</span>
        </button>

        <input
          ref={addInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            Array.from(e.target.files ?? []).forEach(onAdd)
            e.target.value = ''
          }}
        />
      </div>

      <p className="text-xs text-dim/60">
        {pages.length} {pages.length === 1 ? 'página' : 'páginas'} · se concatenarán verticalmente
        {cameraInputRef && (
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="sm:hidden ml-2 text-accent/70 hover:text-accent transition-colors"
          >
            + foto con cámara
          </button>
        )}
      </p>
    </div>
  )
}
