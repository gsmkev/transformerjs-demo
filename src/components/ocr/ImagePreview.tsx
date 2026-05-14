interface Props {
  dataUrl: string
  onClear: () => void
}

export default function ImagePreview({ dataUrl, onClear }: Props) {
  return (
    <div className="relative rounded-xl overflow-hidden border border-rim">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="Preview" className="w-full max-h-72 object-contain bg-base" />
      <button
        onClick={onClear}
        aria-label="Remove image"
        className="absolute top-2 right-2 bg-surface2/80 hover:bg-err/80 text-ink rounded-full w-7 h-7 flex items-center justify-center text-sm transition-colors"
      >
        ✕
      </button>
    </div>
  )
}
