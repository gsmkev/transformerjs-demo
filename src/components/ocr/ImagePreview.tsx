interface Props { dataUrl: string; onClear: () => void }

export default function ImagePreview({ dataUrl, onClear }: Props) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-glass">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="Preview of uploaded image" className="w-full max-h-80 object-contain bg-surface" />
      <button
        onClick={onClear}
        aria-label="Remove image"
        className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/12 hover:bg-err/70 hover:border-err/50 text-ink/80 hover:text-white flex items-center justify-center transition-all"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}
