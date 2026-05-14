import type { EngineStateMap, OcrResult } from '@/types/ocr'
import EngineSelector from './EngineSelector'
import Dropzone from './Dropzone'
import ImagePreview from './ImagePreview'
import ResultPanel from './ResultPanel'
import Button from '@/components/ui/Button'
import type { useImageLoader } from '@/hooks/useImageLoader'

interface Props {
  selectedId: string
  engineStates: EngineStateMap
  onSelectEngine: (id: string) => void
  imageLoader: ReturnType<typeof useImageLoader>
  ocrResult: OcrResult | null
  ocrError: string | null
  ocrRunning: boolean
  onRunOcr: () => void
  onSave: () => Promise<void>
  saving: boolean
}

export default function OcrView({
  selectedId, engineStates, onSelectEngine, imageLoader,
  ocrResult, ocrError, ocrRunning, onRunOcr, onSave, saving,
}: Props) {
  const { file, dataUrl, isDragOver, fileTypeError, loadFile, clearImage, dragHandlers, fileInputRef } = imageLoader
  const engineReady = engineStates[selectedId]?.status === 'ready'

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
      <section>
        <EngineSelector selectedId={selectedId} engineStates={engineStates} onChange={onSelectEngine} />
      </section>

      <section className="space-y-1.5">
        <p className="section-label">Image</p>
        {dataUrl ? (
          <ImagePreview dataUrl={dataUrl} onClear={clearImage} />
        ) : (
          <Dropzone isDragOver={isDragOver} fileTypeError={fileTypeError} onFile={loadFile} dragHandlers={dragHandlers} fileInputRef={fileInputRef} />
        )}
      </section>

      {!engineReady && (
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-info/8 border border-info/20 text-xs text-info">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Load the selected engine in the <strong className="text-ink font-medium ml-1">Models</strong>&nbsp;tab first.
        </div>
      )}

      <Button onClick={onRunOcr} disabled={!file || !engineReady || ocrRunning} spinning={ocrRunning} className="w-full py-2.5">
        {ocrRunning ? 'Running OCR…' : 'Run OCR'}
      </Button>

      <ResultPanel result={ocrResult} error={ocrError} />

      {ocrResult && (
        <Button variant="ghost" onClick={onSave} disabled={saving} spinning={saving} className="w-full py-2.5">
          {saving ? 'Saving…' : 'Save to Library'}
        </Button>
      )}
    </div>
  )
}
