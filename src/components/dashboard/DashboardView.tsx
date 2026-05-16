'use client'

import type { ScannedDocument, Collection } from '@/types/document'
import LandingView from '@/components/home/LandingView'
import OnboardingBanner from '@/components/home/OnboardingBanner'

const CATEGORY_LABELS: Record<string, string> = {
  factura: 'Factura',
  contrato: 'Contrato',
  médico: 'Médico',
  identidad: 'Identidad',
  seguro: 'Seguro',
  bancario: 'Bancario',
  hogar: 'Hogar',
  otro: 'Otro',
}

interface Props {
  documents: ScannedDocument[]
  collections: Collection[]
  onOpenScanner: () => void
  onOpenDoc: (id: string) => void
  onOpenSecurity: () => void
  onOpenModels: () => void
  onNavigateRag: () => void
}

function RecentCard({ doc, onOpen }: { doc: ScannedDocument; onOpen: () => void }) {
  const date = new Date(doc.createdAt).toLocaleDateString('es', { month: 'short', day: 'numeric' })
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex-shrink-0 w-32 text-left rounded-xl border border-rim bg-surface p-3 active:scale-[0.97] transition-transform"
    >
      {doc.imageDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={doc.imageDataUrl} alt="" aria-hidden="true" className="w-full h-20 object-cover rounded-lg mb-2 bg-surface2" />
      )}
      <p className="text-xs font-medium text-ink truncate leading-snug">{doc.title}</p>
      <p className="text-[10px] text-dim mt-0.5">{date}</p>
    </button>
  )
}

export default function DashboardView({ documents, collections, onOpenScanner, onOpenDoc, onOpenSecurity, onOpenModels, onNavigateRag }: Props) {
  if (documents.length === 0) {
    return (
      <>
        <OnboardingBanner
          onOpenSecurity={onOpenSecurity}
          onOpenModels={onOpenModels}
          onOpenScanner={onOpenScanner}
          hasDocuments={false}
        />
        <LandingView onOpenScanner={onOpenScanner} />
      </>
    )
  }

  const recent = [...documents].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8)
  const categoryCounts: Record<string, number> = {}
  for (const doc of documents) {
    const cat = doc.category ?? 'otro'
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1
  }

  return (
    <div className="pb-32 animate-fade-in">
      <OnboardingBanner
        onOpenSecurity={onOpenSecurity}
        onOpenModels={onOpenModels}
        onOpenScanner={onOpenScanner}
        hasDocuments
      />

      {/* Recientes */}
      <div className="mt-5 px-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-dim mb-3">Recientes</p>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 [&::-webkit-scrollbar]:hidden">
          {recent.map((doc) => (
            <RecentCard key={doc.id} doc={doc} onOpen={() => onOpenDoc(doc.id)} />
          ))}
        </div>
      </div>

      {/* Colecciones */}
      {collections.length > 0 && (
        <div className="mt-6 px-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-dim mb-3">Colecciones</p>
          <div className="flex flex-wrap gap-2">
            {collections.map((col) => (
              <span
                key={col.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
                style={{
                  backgroundColor: `${col.color}12`,
                  borderColor: `${col.color}35`,
                  color: col.color,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} aria-hidden="true" />
                {col.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {Object.keys(categoryCounts).length > 0 && (
        <div className="mt-6 px-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-dim mb-3">Por categoría</p>
          <div className="space-y-2">
            {Object.entries(categoryCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs text-dim w-24 flex-shrink-0 truncate">{CATEGORY_LABELS[cat] ?? cat}</span>
                  <div className="flex-1 bg-surface2 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${(count / documents.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-dim w-4 text-right font-mono">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-6 px-4 flex gap-3">
        <button
          type="button"
          onClick={onNavigateRag}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-rim bg-surface text-sm font-medium text-ink hover:bg-surface2 active:scale-[0.98] transition-all"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Buscar con IA
        </button>
      </div>
    </div>
  )
}
