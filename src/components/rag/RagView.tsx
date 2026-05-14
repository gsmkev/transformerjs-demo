'use client'

import { useState } from 'react'
import type { ScannedDocument } from '@/types/document'
import type { useRag } from '@/hooks/useRag'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'

interface Props {
  documents: ScannedDocument[]
  rag: ReturnType<typeof useRag>
  onEmbedDoc: (doc: ScannedDocument) => Promise<void>
  onEmbedAll: () => Promise<void>
}

export default function RagView({ documents, rag, onEmbedDoc: _onEmbedDoc, onEmbedAll }: Props) {
  const [query, setQuery] = useState('')
  const [indexing, setIndexing] = useState(false)

  const embeddedCount = documents.filter((d) => d.embedding !== null).length
  const totalCount = documents.length

  const handleEmbedAll = async () => {
    setIndexing(true)
    try { await onEmbedAll() } finally { setIndexing(false) }
  }

  const handleQuery = () => {
    if (query.trim()) rag.query(query.trim(), documents)
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* Embedding model card */}
      <div className="card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-ink text-sm">Embedding Model</p>
            <p className="text-xs text-dim mt-0.5">Xenova/all-MiniLM-L6-v2 · 384-dim · ~23 MB · downloads once</p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
            rag.modelStatus === 'ready'   ? 'bg-ok/20 text-ok'    :
            rag.modelStatus === 'loading' ? 'bg-info/15 text-info' :
            rag.modelStatus === 'error'   ? 'bg-err/15 text-err'   :
            'bg-surface2 text-dim'
          }`}>
            {rag.modelStatus === 'ready' ? 'Ready' : rag.modelStatus === 'loading' ? 'Loading…' : rag.modelStatus === 'error' ? 'Error' : 'Not loaded'}
          </span>
        </div>

        {rag.modelStatus === 'loading' && (
          <ProgressBar value={rag.modelProgress} label="Downloading model…" />
        )}
        {rag.modelError && <p className="text-xs text-err">{rag.modelError}</p>}

        {(rag.modelStatus === 'idle' || rag.modelStatus === 'error') && (
          <Button onClick={rag.loadModel} className="w-full sm:w-auto">
            Load Embedding Model
          </Button>
        )}
      </div>

      {/* Index documents */}
      <div className="card flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-ink">Document Index</p>
          <p className="text-xs text-dim mt-0.5">
            {totalCount === 0
              ? 'No documents in library yet.'
              : `${embeddedCount} of ${totalCount} document${totalCount !== 1 ? 's' : ''} indexed`}
          </p>
        </div>
        <Button
          onClick={handleEmbedAll}
          disabled={rag.modelStatus !== 'ready' || totalCount === 0 || indexing || embeddedCount === totalCount}
          spinning={indexing}
          variant="ghost"
        >
          {embeddedCount === totalCount && totalCount > 0 ? 'All indexed' : 'Index all'}
        </Button>
      </div>

      {/* Query */}
      <div className="space-y-3">
        <label htmlFor="rag-query" className="text-xs text-dim font-medium block">Search query</label>
        <textarea
          id="rag-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleQuery() }}
          placeholder="Ask something about your scanned documents…"
          rows={3}
          className="w-full bg-surface border border-rim rounded-lg p-3 text-sm text-ink resize-none focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-dim/50"
        />
        <div className="flex items-center gap-2">
          <Button
            onClick={handleQuery}
            disabled={!query.trim() || rag.modelStatus !== 'ready' || rag.querying}
            spinning={rag.querying}
            className="flex-1 sm:flex-none"
          >
            {rag.querying ? 'Searching…' : 'Search'}
          </Button>
          <p className="text-xs text-dim hidden sm:block">or Cmd+Enter</p>
        </div>
        {rag.queryError && <p role="alert" className="text-xs text-err">{rag.queryError}</p>}
      </div>

      {/* Results */}
      {rag.results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-dim font-medium">Top {rag.results.length} results</p>
          {rag.results.map((r, i) => (
            <div key={r.doc.id + i} className="card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-ink text-sm">{r.doc.title}</p>
                <span className="text-xs text-ok flex-shrink-0 font-mono">
                  {(r.score * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-dim leading-relaxed">{r.excerpt}{r.doc.rawText.length > 280 ? '…' : ''}</p>
              <p className="text-xs text-dim/60">
                {new Date(r.doc.createdAt).toLocaleDateString()} · {r.doc.engineId}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
