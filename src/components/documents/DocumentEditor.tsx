'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { CommentMark } from '@/lib/commentMark'
import type { ScannedDocument, ExportHistoryEntry, Collection } from '@/types/document'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import { shareDocument } from '@/services/exportService'
import ExportMenu from '@/components/ui/ExportMenu'
import PdfExportModal from './PdfExportModal'
import PrintArea from './PrintArea'
import ExportHistoryDrawer from './ExportHistoryDrawer'
import TagEditor from './TagEditor'
import SchemaEditor from './SchemaEditor'
import ExtractionTable from './ExtractionTable'
import { extractStructuredData } from '@/services/extractionService'
import type { ExtractionField } from '@/types/document'
import AnnotationSidebar from './AnnotationSidebar'

const AUTOSAVE_MS = 900

function rawToHtml(text: string): string {
  const paragraphs = text.split(/\n{2,}/).filter(Boolean)
  if (paragraphs.length === 0) return '<p></p>'
  return paragraphs.map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
}

function ToolBtn({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`px-2.5 py-1.5 min-w-[36px] rounded-lg text-xs font-mono transition-colors border focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/50 ${
        active ? 'bg-accent/20 text-accent border-accent/30' : 'text-dim border-transparent hover:bg-white/7 hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null
  const e = editor
  return (
    <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-white/7 bg-surface/60 backdrop-blur-sm">
      <ToolBtn active={e.isActive('bold')}   label="Bold"          onClick={() => e.chain().focus().toggleBold().run()}><strong>B</strong></ToolBtn>
      <ToolBtn active={e.isActive('italic')} label="Italic"        onClick={() => e.chain().focus().toggleItalic().run()}><em>I</em></ToolBtn>
      <ToolBtn active={e.isActive('strike')} label="Strikethrough" onClick={() => e.chain().focus().toggleStrike().run()}>S̶</ToolBtn>
      <span className="w-px bg-white/8 mx-0.5 self-stretch" aria-hidden="true" />
      <ToolBtn active={e.isActive('heading', { level: 1 })} label="H1" onClick={() => e.chain().focus().toggleHeading({ level: 1 }).run()}>H1</ToolBtn>
      <ToolBtn active={e.isActive('heading', { level: 2 })} label="H2" onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolBtn>
      <span className="w-px bg-white/8 mx-0.5 self-stretch" aria-hidden="true" />
      <ToolBtn active={e.isActive('bulletList')}  label="Bullet list"  onClick={() => e.chain().focus().toggleBulletList().run()}>• —</ToolBtn>
      <ToolBtn active={e.isActive('orderedList')} label="Ordered list" onClick={() => e.chain().focus().toggleOrderedList().run()}>1.</ToolBtn>
      <span className="w-px bg-white/8 mx-0.5 self-stretch" aria-hidden="true" />
      <ToolBtn active={e.isActive('code')}       label="Code"       onClick={() => e.chain().focus().toggleCode().run()}>{'</>'}</ToolBtn>
      <ToolBtn active={e.isActive('blockquote')} label="Blockquote" onClick={() => e.chain().focus().toggleBlockquote().run()}>❝</ToolBtn>
    </div>
  )
}

interface Props {
  doc: ScannedDocument
  ragModelReady: boolean
  allTags: string[]
  llmModelId: string
  llmReady: boolean
  onUpdate: (id: string, patch: Partial<ScannedDocument>) => Promise<void>
  onEmbed: (doc: ScannedDocument) => Promise<void>
  onBack: () => void
  onDelete: (id: string) => Promise<void>
  addExportEntry: (id: string, format: ExportHistoryEntry['format']) => Promise<void>
  collections: Collection[]
  onAssignCollection: (collectionId: string | null) => Promise<void>
}

type SaveStatus = 'saved' | 'saving' | 'unsaved'

export default function DocumentEditor({ doc, ragModelReady, allTags, llmModelId, llmReady, onUpdate, onEmbed, onBack, onDelete, addExportEntry, collections, onAssignCollection }: Props) {
  const [title, setTitle] = useState(doc.title)
  const [tags, setTags] = useState<string[]>(doc.tags ?? [])
  const [expiresAt, setExpiresAt] = useState<number | null>(doc.expiresAt ?? null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [embedding, setEmbedding] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  const [editingSchema, setEditingSchema] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [localSchema, setLocalSchema] = useState<ExtractionField[]>(doc.extractionSchema ?? [])
  const [localData, setLocalData] = useState<Record<string, string>>(doc.extractedData ?? {})
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const canShare = typeof navigator !== 'undefined' && !!navigator.share
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [printIncludeImage, setPrintIncludeImage] = useState(true)
  const [showAnnotations, setShowAnnotations] = useState(false)
  const [pendingComment, setPendingComment] = useState('')
  const [bubbleMode, setBubbleMode] = useState<'toolbar' | 'comment'>('toolbar')
  const [showExportHistory, setShowExportHistory] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  const scheduleSave = useCallback(
    (getJson: () => object) => {
      setSaveStatus('unsaved')
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        setSaveStatus('saving')
        await onUpdate(doc.id, { richText: JSON.stringify(getJson()) })
        setSaveStatus('saved')
      }, AUTOSAVE_MS)
    },
    [doc.id, onUpdate],
  )

  const editor = useEditor({
    extensions: [StarterKit, Highlight.configure({ multicolor: false }), CommentMark],
    content: doc.richText ? JSON.parse(doc.richText) : rawToHtml(doc.rawText),
    onUpdate: ({ editor }) => scheduleSave(() => editor.getJSON()),
  })

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  useEffect(() => {
    setTitle(doc.title)
    setTags(doc.tags ?? [])
    setLocalSchema(doc.extractionSchema ?? [])
    setLocalData(doc.extractedData ?? {})
    setEditingSchema(false)
    setExtractionError(null)
    setExpiresAt(doc.expiresAt ?? null)
  }, [doc.id])

  const handleTitleBlur = async () => {
    const trimmed = title.trim() || 'Untitled'
    if (trimmed !== doc.title) await onUpdate(doc.id, { title: trimmed })
  }

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags)
    onUpdate(doc.id, { tags: newTags }).catch((err) => console.error('Tag save failed:', err))
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return
    await onDelete(doc.id)
    onBack()
  }

  const handleEmbed = async () => {
    setEmbedding(true)
    try { await onEmbed(doc) } finally { setEmbedding(false) }
  }

  const handlePrint = (includeImage: boolean) => {
    setPrintIncludeImage(includeImage)
    setShowPdfModal(false)
    addExportEntry(doc.id, 'pdf').catch((err) => console.error('Export history save failed:', err))
    setTimeout(() => window.print(), 50)
  }

  const handleShare = async () => {
    const result = await shareDocument(doc)
    if (result.copied) {
      setToastMsg('Texto copiado al portapapeles')
      await addExportEntry(doc.id, 'copy')
    } else if (result.shared) {
      await addExportEntry(doc.id, 'share')
    }
  }

  const handleSaveSchema = async (schema: ExtractionField[]) => {
    setLocalSchema(schema)
    setEditingSchema(false)
    await onUpdate(doc.id, { extractionSchema: schema })
  }

  const handleExtract = async () => {
    setExtracting(true)
    setExtractionError(null)
    try {
      const data = await extractStructuredData(doc.rawText, localSchema, llmModelId)
      setLocalData(data)
      await onUpdate(doc.id, { extractedData: data })
    } catch (err) {
      setExtractionError(String(err).replace('Error: ', ''))
    } finally {
      setExtracting(false)
    }
  }

  const handleExpiryChange = async (dateStr: string) => {
    const ts = dateStr ? new Date(dateStr).getTime() : null
    setExpiresAt(ts)
    await onUpdate(doc.id, { expiresAt: ts })
  }

  const handleDataChange = (data: Record<string, string>) => {
    setLocalData(data)
    onUpdate(doc.id, { extractedData: data }).catch((err) => console.error('Extraction data save failed:', err))
  }

  const saveStatusDisplay: Record<SaveStatus, { label: string; cls: string }> = {
    saved:   { label: 'Saved',     cls: 'text-ok/80'   },
    saving:  { label: 'Saving…',   cls: 'text-info/80' },
    unsaved: { label: '● Unsaved', cls: 'text-dim'     },
  }
  const { label: saveLabel, cls: saveCls } = saveStatusDisplay[saveStatus]

  return (
    <div className="flex flex-col min-h-0 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/7 bg-surface/40 backdrop-blur-sm flex-wrap">
        <Button variant="ghost" onClick={onBack} className="py-1 px-2.5 text-xs flex-shrink-0 gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Library
        </Button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          aria-label="Document title"
          className="flex-1 min-w-0 bg-transparent text-ink text-sm font-semibold focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 rounded px-1 py-0.5"
        />
        <span className={`text-xs flex-shrink-0 font-mono ${saveCls}`}>{saveLabel}</span>
        {ragModelReady && (
          <Button variant="ghost" onClick={handleEmbed} spinning={embedding} disabled={embedding} className="py-1 px-2.5 text-xs flex-shrink-0">
            {doc.embedding ? 'Re-index' : 'Index for RAG'}
          </Button>
        )}
        <Button variant="ghost" onClick={handleShare} className="py-1 px-2.5 text-xs flex-shrink-0">
          {canShare ? 'Compartir' : 'Copiar texto'}
        </Button>
        <Button variant="ghost" onClick={() => setShowPdfModal(true)} className="py-1 px-2.5 text-xs flex-shrink-0">
          PDF
        </Button>
        <ExportMenu doc={doc} onExport={(fmt) => addExportEntry(doc.id, fmt)} />
        <Button
          variant="ghost"
          onClick={() => setShowExportHistory(true)}
          className="py-1 px-2.5 text-xs flex-shrink-0"
        >
          {doc.exportHistory?.length ? `📤 ${doc.exportHistory.length}` : '📤'}
        </Button>
        <Button variant="ghost" onClick={handleDelete} className="py-1 px-2.5 text-xs flex-shrink-0 text-err/80 hover:text-err hover:bg-err/10 hover:border-err/20">
          Eliminar
        </Button>
      </div>

      {/* Edit / Original / Notas toggle */}
      <div className="flex gap-1 px-4 py-2.5 border-b border-white/5 bg-surface/30">
        {(['edit', 'original'] as const).map((mode) => {
          const isActive = mode === 'edit' ? !showOriginal : showOriginal
          return (
            <button
              key={mode}
              onClick={() => setShowOriginal(mode === 'original')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-accent/15 border border-accent/30 text-accent'
                  : 'text-dim hover:text-ink hover:bg-white/5 border border-transparent'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          )
        })}
        <button
          onClick={() => setShowAnnotations((v) => !v)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            showAnnotations
              ? 'bg-accent/15 border border-accent/30 text-accent'
              : 'text-dim hover:text-ink hover:bg-white/5 border border-transparent'
          }`}
        >
          💬 Notas
        </button>
      </div>

      {/* Tags */}
      <div className="px-4 sm:px-6 py-3 border-b border-white/5 bg-surface/20">
        <TagEditor tags={tags} allTags={allTags} onChange={handleTagsChange} />
        {/* Expiry date */}
        <div className="flex items-center gap-2 mt-2">
          <label className="text-xs text-dim/70 flex-shrink-0">Caduca:</label>
          <input
            type="date"
            value={expiresAt ? new Date(expiresAt).toISOString().slice(0, 10) : ''}
            onChange={(e) => handleExpiryChange(e.target.value)}
            className="text-xs px-2 py-1 rounded-lg border border-white/10 bg-transparent text-ink focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 [color-scheme:dark]"
            aria-label="Fecha de caducidad"
          />
          {expiresAt && (
            <button
              type="button"
              onClick={() => handleExpiryChange('')}
              className="text-xs text-dim/50 hover:text-err transition-colors"
              aria-label="Quitar fecha de caducidad"
            >
              ✕
            </button>
          )}
        </div>
        {/* Collection selector */}
        <div className="flex items-center gap-2 mt-2">
          <label className="text-xs text-dim/70 flex-shrink-0">Colección:</label>
          <select
            value={doc.collectionId ?? ''}
            onChange={(e) => onAssignCollection(e.target.value || null)}
            className="text-xs px-2 py-1 rounded-lg border border-white/10 bg-surface text-ink focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 flex-1 max-w-[200px] [color-scheme:dark]"
            aria-label="Asignar colección"
          >
            <option value="">Sin colección</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>{col.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Datos estructurados */}
      <div className="px-4 sm:px-6 py-3 border-b border-white/5 bg-surface/20 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="section-label">Datos estructurados</p>
          {localSchema.length > 0 && !editingSchema && (
            <button
              type="button"
              onClick={() => setEditingSchema(true)}
              className="text-xs text-dim/60 hover:text-dim transition-colors"
            >
              Editar schema
            </button>
          )}
        </div>

        {editingSchema || localSchema.length === 0 ? (
          <div className="space-y-3">
            <SchemaEditor schema={localSchema} onChange={setLocalSchema} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSaveSchema(localSchema)}
                disabled={localSchema.length === 0}
                className="text-xs px-3 py-1.5 rounded-lg bg-accent/15 border border-accent/30 text-accent disabled:opacity-40 transition-colors hover:bg-accent/20"
              >
                Guardar schema
              </button>
              {editingSchema && (
                <button type="button" onClick={() => setEditingSchema(false)} className="text-xs text-dim hover:text-ink transition-colors">
                  Cancelar
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.keys(localData).length > 0 ? (
              <ExtractionTable schema={localSchema} data={localData} onChange={handleDataChange} />
            ) : (
              !llmReady && (
                <p className="text-xs text-info/80">El LLM no está cargado — cárgalo en la pestaña Modelos.</p>
              )
            )}
            <button
              type="button"
              onClick={handleExtract}
              disabled={extracting || !llmReady}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-dim hover:text-ink hover:bg-white/5 disabled:opacity-40 transition-colors"
            >
              {extracting ? 'Extrayendo…' : Object.keys(localData).length > 0 ? 'Re-extraer' : 'Extraer con IA'}
            </button>
            {extractionError && (
              <p className="text-xs text-err/80">{extractionError}</p>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {showOriginal ? (
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto animate-fade-in">
          {doc.imageDataUrl && (
            <div className="card p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={doc.imageDataUrl} alt="Original scan" className="max-h-72 object-contain rounded-xl bg-surface mx-auto block w-full" />
            </div>
          )}
          <div className="card">
            <pre className="text-xs text-dim whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">{doc.rawText}</pre>
          </div>
        </div>
      ) : (
        <>
          {editor && (
            <BubbleMenu editor={editor}>
              {bubbleMode === 'toolbar' ? (
                <div className="flex gap-1 bg-surface border border-white/15 rounded-xl shadow-lg px-2 py-1.5">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      editor.chain().focus().toggleHighlight().run()
                    }}
                    className={`px-2 py-1 text-xs rounded-lg transition-colors ${editor.isActive('highlight') ? 'bg-accent/20 text-accent' : 'text-dim hover:text-ink hover:bg-white/8'}`}
                    aria-label="Resaltar"
                  >
                    ▐▌
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setBubbleMode('comment')
                      setPendingComment('')
                    }}
                    className="px-2 py-1 text-xs rounded-lg text-dim hover:text-ink hover:bg-white/8 transition-colors"
                    aria-label="Añadir comentario"
                  >
                    💬
                  </button>
                </div>
              ) : (
                <div className="flex gap-1 items-center bg-surface border border-white/15 rounded-xl shadow-lg px-2 py-1.5">
                  <input
                    autoFocus
                    value={pendingComment}
                    onChange={(e) => setPendingComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && pendingComment.trim()) {
                        editor.chain().focus().setMark('comment', { comment: pendingComment.trim() }).run()
                        setBubbleMode('toolbar')
                        setPendingComment('')
                      }
                      if (e.key === 'Escape') { setBubbleMode('toolbar'); setPendingComment('') }
                    }}
                    placeholder="Escribe tu nota…"
                    className="w-44 px-2 py-0.5 text-xs bg-transparent text-ink placeholder:text-dim/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      if (pendingComment.trim()) {
                        editor.chain().focus().setMark('comment', { comment: pendingComment.trim() }).run()
                      }
                      setBubbleMode('toolbar')
                      setPendingComment('')
                    }}
                    disabled={!pendingComment.trim()}
                    className="text-xs px-2 py-1 rounded-lg bg-accent/15 border border-accent/30 text-accent disabled:opacity-40"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setBubbleMode('toolbar'); setPendingComment('') }}
                    className="text-xs text-dim/40 hover:text-dim"
                  >
                    ✕
                  </button>
                </div>
              )}
            </BubbleMenu>
          )}
          {showAnnotations && (
            <AnnotationSidebar
              editor={editor}
              onRemove={(pos, length) => {
                editor?.chain().focus()
                  .setTextSelection({ from: pos, to: pos + length })
                  .unsetMark('comment')
                  .run()
              }}
            />
          )}
          <Toolbar editor={editor} />
          <EditorContent editor={editor} className="flex-1 overflow-y-auto tiptap-editor" />
        </>
      )}
      {toastMsg && <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />}
      {showPdfModal && (
        <PdfExportModal
          hasImage={!!doc.imageDataUrl}
          onConfirm={handlePrint}
          onClose={() => setShowPdfModal(false)}
        />
      )}
      {showExportHistory && (
        <ExportHistoryDrawer
          history={doc.exportHistory ?? []}
          onClose={() => setShowExportHistory(false)}
        />
      )}
      <PrintArea doc={doc} includeImage={printIncludeImage} />
    </div>
  )
}
