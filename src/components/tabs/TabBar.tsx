import type { Tab } from '@/types/ocr'

const TABS: { id: Tab; label: string }[] = [
  { id: 'engines', label: 'Models' },
  { id: 'ocr',     label: 'OCR' },
]

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

export default function TabBar({ active, onChange }: Props) {
  return (
    <nav role="tablist" aria-label="App sections" className="flex border-b border-rim">
      {TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          aria-controls={`panel-${t.id}`}
          onClick={() => onChange(t.id)}
          className={`px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            active === t.id
              ? 'border-accent text-accent'
              : 'border-transparent text-dim hover:text-ink'
          }`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
