interface Props {
  value: number
  label?: string
}

export default function ProgressBar({ value, label }: Props) {
  return (
    <div className="space-y-1">
      {label && <p className="text-xs text-dim">{label}</p>}
      <progress
        value={value}
        max={100}
        className="w-full h-1.5 rounded-full overflow-hidden bg-surface2 appearance-none"
      />
    </div>
  )
}
