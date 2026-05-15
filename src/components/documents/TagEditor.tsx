'use client'

import { useState, useRef, KeyboardEvent } from 'react'

interface Props {
  tags: string[]
  allTags: string[]
  onChange: (tags: string[]) => void
}

export default function TagEditor({ tags, allTags, onChange }: Props) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/,/g, '')
    if (!tag || tags.includes(tag) || tags.length >= 20) return
    onChange([...tags, tag])
    setInput('')
  }

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag))

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const suggestions = input.length > 0
    ? allTags.filter((t) => t.includes(input.toLowerCase()) && !tags.includes(t)).slice(0, 5)
    : []

  return (
    <div className="space-y-1.5">
      <p className="section-label">Etiquetas</p>
      <div
        className="flex flex-wrap gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-xl border border-white/10 bg-surface/60 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs">
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
              aria-label={`Eliminar etiqueta ${tag}`}
              className="text-accent/60 hover:text-accent leading-none"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => { if (input) addTag(input) }}
          placeholder={tags.length === 0 ? 'Añadir etiqueta…' : ''}
          className="flex-1 min-w-[80px] bg-transparent text-xs text-ink placeholder:text-dim/50 focus:outline-none"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { addTag(s); setInput('') }}
              className="px-2 py-0.5 rounded-full text-xs border border-white/10 text-dim hover:text-ink hover:bg-white/5 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
