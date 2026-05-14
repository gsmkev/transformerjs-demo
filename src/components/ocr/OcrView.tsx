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
  selectedId,
  engineStates,
  onSelectEngine,
  imageLoader,
  ocrResult,
  ocrError,
  ocrRunning,
  onRunOcr,
  onSave,
  saving,
}: Props) {
  const { file, dataUrl, isDragOver, fileTypeError, loadFile, clearImage, dragHandlers, fileInputRef } = imageLoader
  const engineReady = engineStates[selectedId]?.status === 'ready'

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <EngineSelector
        selectedId={selectedId}
        engineStates={engineStates}
        onChange={onSelectEngine}
      />

      {dataUrl ? (
        <ImagePreview dataUrl={dataUrl} onClear={clearImage} />
      ) : (
        <Dropzone
          isDragOver={isDragOver}
          fileTypeError={fileTypeError}
          onFile={loadFile}
          dragHandlers={dragHandlers}
          fileInputRef={fileInputRef}
        />
      )}

      {!engineReady && (
        <p className="text-xs text-dim">
          Load the selected engine in the <strong className="text-ink">Models</strong> tab first.
        </p>
      )}

      <Button
        onClick={onRunOcr}
        disabled={!file || !engineReady || ocrRunning}
        spinning={ocrRunning}
        className="w-full"
      >
        {ocrRunning ? 'Running OCR…' : 'Run OCR'}
      </Button>

      <ResultPanel result={ocrResult} error={ocrError} />

      {ocrResult && (
        <Button
          variant="ghost"
          onClick={onSave}
          disabled={saving}
          spinning={saving}
          className="w-full"
        >
          {saving ? 'Saving…' : 'Save to Library'}
        </Button>
      )}
    </div>
  )
}
