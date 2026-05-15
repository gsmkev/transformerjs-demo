// src/components/documents/SchemaEditor.tsx
'use client'

import { useState } from 'react'
import type { ExtractionField } from '@/types/document'

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 30) || 'campo'
}

interface Props {
  schema: ExtractionField[]
  onChange: (schema: ExtractionField[]) => void
}

const EMPTY_FIELD = (): Omit<ExtractionField, 'key'> => ({ label: '', type: 'text', description: '' })

export default function SchemaEditor({ schema, onChange }: Props) {
  const [draft, setDraft] = useState<Omit<ExtractionField, 'key'>>(EMPTY_FIELD())

  const updateField = (index: number, patch: Partial<ExtractionField>) => {
    const next = schema.map((f, i) => {
      if (i !== index) return f
      const updated = { ...f, ...patch }
      if (patch.label !== undefined) updated.key = slugify(patch.label)
      return updated
    })
    onChange(next)
  }

  const removeField = (index: number) => onChange(schema.filter((_, i) => i !== index))

  const addField = () => {
    if (!draft.label.trim() || schema.length >= 15) return
    const key = slugify(draft.label)
    if (schema.some((f) => f.key === key)) return
    const newField: ExtractionField = { ...draft, key, label: draft.label.trim() }
    onChange([...schema, newField])
    setDraft(EMPTY_FIELD())
  }

  return (
    <div className="space-y-3">
      {schema.length > 0 && (
        <div className="space-y-2">
          {schema.map((field, i) => (
            <div key={field.key} className="flex gap-2 items-start">
              <input
                value={field.label}
                onChange={(e) => updateField(i, { label: e.target.value })}
                placeholder="Nombre"
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-white/10 bg-surface/60 text-xs text-ink placeholder:text-dim/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
              />
              <select
                value={field.type}
                onChange={(e) => updateField(i, { type: e.target.value as 'text' | 'number' })}
                className="px-2 py-1.5 rounded-lg border border-white/10 bg-surface/60 text-xs text-ink focus:outline-none"
              >
                <option value="text">Texto</option>
                <option value="number">Número</option>
              </select>
              <input
                value={field.description}
                onChange={(e) => updateField(i, { description: e.target.value })}
                placeholder="Descripción / reglas para el LLM"
                className="flex-[2] min-w-0 px-2.5 py-1.5 rounded-lg border border-white/10 bg-surface/60 text-xs text-ink placeholder:text-dim/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
              />
              <button
                type="button"
                onClick={() => removeField(i)}
                className="px-1.5 py-1.5 text-dim/60 hover:text-err transition-colors flex-shrink-0"
                aria-label={`Eliminar campo ${field.label}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {schema.length < 15 && (
        <div className="flex gap-2 items-start">
          <input
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addField() } }}
            placeholder="Nombre del campo"
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-dashed border-white/15 bg-transparent text-xs text-ink placeholder:text-dim/40 focus:outline-none focus:border-accent/40"
          />
          <select
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: e.target.value as 'text' | 'number' })}
            className="px-2 py-1.5 rounded-lg border border-white/10 bg-surface/60 text-xs text-ink focus:outline-none"
          >
            <option value="text">Texto</option>
            <option value="number">Número</option>
          </select>
          <input
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addField() } }}
            placeholder="Descripción / reglas"
            className="flex-[2] min-w-0 px-2.5 py-1.5 rounded-lg border border-dashed border-white/15 bg-transparent text-xs text-ink placeholder:text-dim/40 focus:outline-none focus:border-accent/40"
          />
          <button
            type="button"
            onClick={addField}
            disabled={!draft.label.trim()}
            className="px-2 py-1.5 text-xs rounded-lg border border-white/10 text-dim hover:text-ink hover:bg-white/5 transition-colors disabled:opacity-40 flex-shrink-0"
          >
            + Añadir
          </button>
        </div>
      )}
    </div>
  )
}
