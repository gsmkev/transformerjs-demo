'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ScannedDocument } from '@/types/document'
import { searchDocuments, type SearchResult } from '@/lib/searchIndex'

const CATEGORY_LABELS: Record<string, string> = {
  factura: '🧾 Factura', contrato: '📝 Contrato', médico: '🏥 Médico',
  identidad: '🪪 Identidad', seguro: '🛡️ Seguro', bancario: '🏦 Bancario',
  hogar: '🏠 Hogar', otro: '📄 Otro',
}

interface Props {
  documents: ScannedDocument[]
  onNavigate: (docId: string) => void
  onClose: () => void
}

function highlightMatch(text: string, query: string): React.ReactNode {
  const term = query.trim().split(/\s+/)[0]
  if (!term) return text
  const idx = text.toLowerCase().indexOf(term.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent/20 text-accent rounded px-0.5 not-italic">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  )
}

export default function SearchOverlay({ documents, onNavigate, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    return () => clearTimeout(debounceRef.current)
  }, [])

  const handleChange = useCallback((q: string) => {
    setQuery(q)
    clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(() => {
      setResults(searchDocuments(q, documents))
    }, 200)
  }, [documents])

  const handleSelect = (docId: string) => {
    onClose()
    onNavigate(docId)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="max-w-xl mx-auto mt-16 sm:mt-24 rounded-2xl bg-surface border border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/7">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dim flex-shrink-0" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Buscar en tus documentos…"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-dim/50 focus:outline-none"
            aria-label="Buscar documentos"
          />
          <button
            type="button"
            onClick={onClose}
            className="text-dim hover:text-ink text-xs px-1.5 py-0.5 rounded border border-white/10 transition-colors"
          >
            Esc
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim().length < 2 ? (
            <p className="text-xs text-dim/60 text-center py-8">Escribe para buscar en tus documentos</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-dim/60 text-center py-8">
              No se encontraron documentos para «{query}»
            </p>
          ) : (
            <ul role="listbox">
              {results.map(({ doc, snippet }) => {
                const date = new Date(doc.createdAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
                return (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(doc.id)}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    >
                      <p className="text-sm font-medium text-ink truncate">{doc.title}</p>
                      <p className="text-xs text-dim/70 mt-0.5">
                        {doc.category ? `${CATEGORY_LABELS[doc.category] ?? doc.category} · ` : ''}{date}
                      </p>
                      <p className="text-xs text-dim/70 mt-1 italic line-clamp-2">
                        {highlightMatch(snippet, query)}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
