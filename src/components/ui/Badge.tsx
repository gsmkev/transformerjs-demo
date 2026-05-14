import type { EngineStatus } from '@/types/ocr'

const CSS_CLASS: Record<EngineStatus, string> = {
  idle:    'badge-idle',
  loading: 'badge-loading',
  ready:   'badge-ready',
  error:   'badge-error',
}

const LABEL: Record<EngineStatus, string> = {
  idle:    'Not loaded',
  loading: 'Loading',
  ready:   'Ready',
  error:   'Error',
}

const DOT: Partial<Record<EngineStatus, string>> = {
  loading: 'bg-info animate-badge-pulse',
  ready:   'bg-ok',
}

interface Props { status: EngineStatus }

export default function Badge({ status }: Props) {
  const dot = DOT[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${CSS_CLASS[status]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} aria-hidden="true" />}
      {LABEL[status]}
    </span>
  )
}
