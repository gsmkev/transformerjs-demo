import type { EngineStatus } from '@/types/ocr'

const CLASS: Record<EngineStatus, string> = {
  idle:    'badge-idle',
  loading: 'badge-loading',
  ready:   'badge-ready',
  error:   'badge-error',
}

const LABEL: Record<EngineStatus, string> = {
  idle:    'Not loaded',
  loading: 'Loading…',
  ready:   'Ready',
  error:   'Error',
}

interface Props {
  status: EngineStatus
}

export default function Badge({ status }: Props) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${CLASS[status]}`}>
      {LABEL[status]}
    </span>
  )
}
