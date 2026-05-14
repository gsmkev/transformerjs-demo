interface Props {
  value: number
  label?: string
  percentage?: boolean
}

export default function ProgressBar({ value, label, percentage = false }: Props) {
  return (
    <div className="space-y-1.5">
      {(label || percentage) && (
        <div className="flex items-center justify-between gap-2">
          {label && <p className="text-xs text-dim">{label}</p>}
          {percentage && (
            <p className="text-xs text-dim font-mono tabular-nums">{Math.round(value)}%</p>
          )}
        </div>
      )}
      <progress value={value} max={100} aria-label={label ?? 'Progress'} />
    </div>
  )
}
