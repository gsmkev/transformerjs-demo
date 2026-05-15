import type { EngineStateMap, OcrResult } from '@/types/ocr'
import type { RefObject } from 'react'
import EngineSelector from './EngineSelector'
import Dropzone from './Dropzone'
import ImagePreview from './ImagePreview'
import PageStrip from './PageStrip'
import ResultPanel from './ResultPanel'
import Button from '@/components/ui/Button'
import type { useImageLoader } from '@/hooks/useImageLoader'
import type { useBatchOcr } from '@/hooks/useBatchOcr'
import BatchQueue from './BatchQueue'

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
  cameraInputRef?: RefObject<HTMLInputElement>
  batchOcr: ReturnType<typeof useBatchOcr>
  onNavigateToLibrary: () => void
}

export default function OcrView({
  selectedId, engineStates, onSelectEngine, imageLoader,
  ocrResult, ocrError, ocrRunning, onRunOcr, onSave, saving,
  cameraInputRef, batchOcr, onNavigateToLibrary,
}: Props) {
  const { file, dataUrl, pages, isDragOver, fileTypeError, loadFile, addPage, removePage, clearImage, dragHandlers, fileInputRef } = imageLoader
  const engineReady = engineStates[selectedId]?.status === 'ready'
  const isBatchMode = batchOcr.queue.length >= 2

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start gap-6">
        {/* Left column: controls */}
        <div className="flex flex-col gap-4">
          <EngineSelector selectedId={selectedId} engineStates={engineStates} onChange={onSelectEngine} />

          {!engineReady && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-info/8 border border-info/20 text-xs text-info">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Carga el motor en la sección <strong className="text-ink font-medium ml-1">Modelos</strong>&nbsp;primero.
            </div>
          )}

          {isBatchMode ? (
            <>
              <BatchQueue
                queue={batchOcr.queue}
                running={batchOcr.running}
                progress={batchOcr.progress}
                onRemove={batchOcr.removeItem}
                onCancel={batchOcr.cancel}
                onClear={batchOcr.clearQueue}
                onNavigateToLibrary={onNavigateToLibrary}
              />
              <Button
                onClick={batchOcr.startBatch}
                disabled={!engineReady || batchOcr.running || batchOcr.queue.filter((i) => i.status === 'pending').length === 0}
                spinning={batchOcr.running}
                className="w-full py-2.5"
              >
                {batchOcr.running ? 'Procesando…' : 'Ejecutar OCR en lote'}
              </Button>
            </>
          ) : (
            <>
              {pages.length >= 1 ? (
                <>
                  <PageStrip pages={pages} onAdd={addPage} onRemove={removePage} cameraInputRef={cameraInputRef} />
                  {dataUrl && <ImagePreview dataUrl={dataUrl} onClear={clearImage} />}
                </>
              ) : (
                <Dropzone
                  isDragOver={isDragOver}
                  fileTypeError={fileTypeError}
                  onFile={(f) => {
                    batchOcr.addFiles([f])
                    addPage(f)
                  }}
                  dragHandlers={{
                    ...dragHandlers,
                    onDrop: (e) => {
                      e.preventDefault()
                      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
                      batchOcr.addFiles(files)
                      dragHandlers.onDrop(e)
                    },
                  }}
                  fileInputRef={fileInputRef}
                  cameraInputRef={cameraInputRef}
                />
              )}
              <Button onClick={onRunOcr} disabled={pages.length === 0 || !engineReady || ocrRunning} spinning={ocrRunning} className="w-full py-2.5">
                {ocrRunning ? 'Procesando…' : 'Ejecutar OCR'}
              </Button>
              {ocrResult && (
                <Button variant="ghost" onClick={onSave} disabled={saving} spinning={saving} className="w-full py-2.5">
                  {saving ? 'Guardando…' : 'Guardar en biblioteca'}
                </Button>
              )}
            </>
          )}
        </div>

        {/* Right column: result — sticky on desktop */}
        <div className="lg:sticky lg:top-[110px]">
          <ResultPanel result={ocrResult} error={ocrError} />
        </div>
      </div>
    </div>
  )
}
