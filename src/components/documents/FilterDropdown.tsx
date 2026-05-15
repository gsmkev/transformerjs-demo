'use client'

import { useState, useRef, useEffect } from 'react'

const CATEGORY_LABELS: Record<string, string> = {
  factura: '🧾 Factura',
  contrato: '📝 Contrato',
  médico: '🏥 Médico',
  identidad: '🪪 Identidad',
  seguro: '🛡️ Seguro',
  bancario: '🏦 Bancario',
  hogar: '🏠 Hogar',
  otro: '📄 Otro',
}

export interface FilterState {
  category: string | null
  tags: string[]
}

interface Props {
  categories: string[]
  availableTags: string[]
  filter: FilterState
  onChange: (f: FilterState) => void
}

export default function FilterDropdown({ categories, availableTags, filter, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  const activeCount = (filter.category ? 1 : 0) + filter.tags.length

  const toggleTag = (tag: string) => {
    const next = filter.tags.includes(tag)
      ? filter.tags.filter((t) => t !== tag)
      : [...filter.tags, tag]
    onChange({ ...filter, tags: next })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-dim hover:text-ink hover:bg-white/5 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>
        Filtrar
        {activeCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-medium leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-20 w-56 bg-surface border border-white/10 rounded-2xl shadow-xl p-3 space-y-3">
          {categories.length > 0 && (
            <div>
              <p className="section-label mb-1.5">Categoría</p>
              <div className="space-y-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="cat-filter" checked={filter.category === null} onChange={() => onChange({ ...filter, category: null })} className="accent-accent" />
                  <span className="text-xs text-dim">Todas</span>
                </label>
                {categories.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="cat-filter" checked={filter.category === cat} onChange={() => onChange({ ...filter, category: cat })} className="accent-accent" />
                    <span className="text-xs text-dim">{CATEGORY_LABELS[cat] ?? cat}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {availableTags.length > 0 && (
            <div>
              <p className="section-label mb-1.5">Etiquetas</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {availableTags.map((tag) => (
                  <label key={tag} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filter.tags.includes(tag)} onChange={() => toggleTag(tag)} className="accent-accent" />
                    <span className="text-xs text-dim">{tag}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeCount > 0 && (
            <button type="button" onClick={() => onChange({ category: null, tags: [] })} className="text-xs text-err/70 hover:text-err transition-colors">
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  )
}
