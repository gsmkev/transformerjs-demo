import type { ScannedDocument } from '@/types/document'
import type { Tab } from '@/types/ocr'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'

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

const PAPERLESS_TARGET = 20

interface StatCardProps { label: string; value: number | string; sub?: string }

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="card flex flex-col gap-1">
      <p className="section-label">{label}</p>
      <p className="text-xl sm:text-2xl font-bold text-ink tabular-nums">{value}</p>
      {sub && <p className="text-xs text-dim/70">{sub}</p>}
    </div>
  )
}

interface Props {
  documents: ScannedDocument[]
  onNavigate: (tab: Tab) => void
  onCameraCapture: () => void
}

export default function DashboardView({ documents, onNavigate, onCameraCapture }: Props) {
  const total = documents.length
  const indexed = documents.filter((d) => d.embedding !== null).length
  const categoryCounts: Record<string, number> = {}
  for (const doc of documents) {
    const cat = doc.category ?? 'otro'
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1
  }
  const distinctCategories = Object.keys(categoryCounts).length
  const progressValue = Math.min((total / PAPERLESS_TARGET) * 100, 100)

  const recent = [...documents]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3)

  if (total === 0) {
    return (
      <div className="p-6 sm:p-8 flex flex-col items-center gap-6 text-center animate-fade-in">
        <div className="mt-8 w-20 h-20 rounded-3xl bg-gradient-to-br from-accent/20 to-accent-light/10 border border-accent/20 flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="text-accent" aria-hidden="true">
            <rect x="14" y="10" width="28" height="36" rx="2" fill="currentColor" opacity="0.3"/>
            <polygon points="42,10 42,20 52,20" fill="currentColor" opacity="0.5"/>
            <line x1="18" y1="24" x2="36" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="18" y1="30" x2="36" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="18" y1="36" x2="30" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-ink">Bienvenido a Papeleo</h2>
          <p className="text-sm text-dim mt-2 max-w-xs leading-relaxed">
            Digitaliza tus documentos físicos y deja de depender del papel. Empieza escaneando tu primer documento.
          </p>
        </div>
        <Button onClick={() => onNavigate('ocr')} className="px-6">
          Escanear primer documento
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Documentos" value={total} />
        <StatCard label="Indexados" value={indexed} sub="para búsqueda IA" />
        <StatCard label="Categorías" value={distinctCategories} />
      </div>

      {/* Paperless progress */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="section-label">Progreso paperless</p>
          <p className="text-xs text-dim/70 font-mono tabular-nums">{total}/{PAPERLESS_TARGET}</p>
        </div>
        <ProgressBar value={progressValue} percentage />
        <p className="text-xs text-dim/60">
          {total >= PAPERLESS_TARGET
            ? '¡Objetivo alcanzado! Eres prácticamente paperless.'
            : `${PAPERLESS_TARGET - total} documento${PAPERLESS_TARGET - total !== 1 ? 's' : ''} más para alcanzar el objetivo`}
        </p>
      </div>

      {/* Category breakdown */}
      {Object.keys(categoryCounts).length > 0 && (
        <div className="card space-y-3">
          <p className="section-label">Por categoría</p>
          <div className="space-y-2.5">
            {Object.entries(categoryCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs text-dim w-28 flex-shrink-0 truncate">{CATEGORY_LABELS[cat] ?? cat}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-500"
                      style={{ width: `${(count / total) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-dim/70 font-mono w-5 text-right flex-shrink-0">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent documents */}
      {recent.length > 0 && (
        <div className="space-y-2">
          <p className="section-label">Recientes</p>
          <div className="space-y-2">
            {recent.map((doc) => {
              const date = new Date(doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              return (
                <div key={doc.id} className="card flex items-center gap-3">
                  {doc.imageDataUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={doc.imageDataUrl} alt="" aria-hidden="true" className="w-10 h-10 object-cover rounded-lg flex-shrink-0 bg-surface border border-white/7" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{doc.title}</p>
                    <p className="text-xs text-dim/70 mt-0.5">{date}</p>
                  </div>
                  {doc.category && (
                    <span className="text-xs text-dim/60 flex-shrink-0">{CATEGORY_LABELS[doc.category] ?? doc.category}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={() => onNavigate('ocr')} className="flex-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
            <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
            <rect x="7" y="7" width="10" height="10" rx="1"/>
          </svg>
          Escanear
        </Button>
        <Button variant="ghost" onClick={onCameraCapture} className="sm:hidden flex-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          Cámara
        </Button>
        <Button variant="ghost" onClick={() => onNavigate('rag')} className="flex-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          Buscar con IA
        </Button>
      </div>
    </div>
  )
}
