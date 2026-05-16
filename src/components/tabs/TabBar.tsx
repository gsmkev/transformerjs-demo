import type { Tab } from '@/types/ocr'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
  onFab?: () => void
  variant?: 'top' | 'bottom'
  fabPulse?: boolean
}

const DocsIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
)

const SearchIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const NAV_TABS: { id: Tab; label: string; Icon: typeof DocsIcon }[] = [
  { id: 'documents', label: 'Documentos', Icon: DocsIcon },
  { id: 'rag',       label: 'Buscar',     Icon: SearchIcon },
]

export default function TabBar({ active, onChange, onFab, variant = 'top', fabPulse = false }: Props) {
  if (variant === 'bottom') {
    return (
      <nav
        role="tablist"
        aria-label="Secciones de la app"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-rim bg-base grid grid-cols-3 pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* Left tab — Documents */}
        <button
          role="tab"
          aria-selected={active === 'documents'}
          aria-controls="panel-documents"
          onClick={() => onChange('documents')}
          className={`flex flex-col items-center justify-center gap-0.5 h-14 pt-2 pb-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors ${
            active === 'documents' ? 'text-accent' : 'text-dim'
          }`}
        >
          <span className={`transition-transform duration-150 ${active === 'documents' ? 'scale-110' : 'scale-100'}`}>
            <DocsIcon />
          </span>
          <span className={`text-[10px] font-medium ${active === 'documents' ? 'text-accent' : 'text-dim'}`}>
            Documentos
          </span>
        </button>

        {/* Center FAB */}
        <div className="flex items-center justify-center">
          <button
            onClick={onFab}
            disabled={!onFab}
            aria-label="Añadir documento"
            className={`w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center shadow-md active:scale-95 transition-transform duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${fabPulse ? 'fab-pulse' : ''}`}
          >
            <PlusIcon />
          </button>
        </div>

        {/* Right tab — Buscar */}
        <button
          role="tab"
          aria-selected={active === 'rag'}
          aria-controls="panel-rag"
          onClick={() => onChange('rag')}
          className={`flex flex-col items-center justify-center gap-0.5 h-14 pt-2 pb-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors ${
            active === 'rag' ? 'text-accent' : 'text-dim'
          }`}
        >
          <span className={`transition-transform duration-150 ${active === 'rag' ? 'scale-110' : 'scale-100'}`}>
            <SearchIcon />
          </span>
          <span className={`text-[10px] font-medium ${active === 'rag' ? 'text-accent' : 'text-dim'}`}>
            Buscar
          </span>
        </button>
      </nav>
    )
  }

  /* Desktop top variant — simplified 2-tab bar */
  return (
    <nav role="tablist" aria-label="Secciones de la app" className="flex items-center gap-1 px-4 sm:px-6 py-2.5">
      {NAV_TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          aria-controls={`panel-${t.id}`}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
            active === t.id
              ? 'bg-accent/10 border border-accent/25 text-accent'
              : 'text-dim hover:text-ink hover:bg-surface border border-transparent'
          }`}
        >
          <t.Icon size={14} />
          {t.label}
        </button>
      ))}
    </nav>
  )
}
