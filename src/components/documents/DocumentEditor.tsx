'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { ScannedDocument } from '@/types/document'
import Button from '@/components/ui/Button'

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
      className={`px-2 py-1 rounded-lg text-xs font-mono transition-colors border focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/50 ${
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
  onUpdate: (id: string, patch: Partial<ScannedDocument>) => Promise<void>
  onEmbed: (doc: ScannedDocument) => Promise<void>
  onBack: () => void
  onDelete: (id: string) => Promise<void>
}

type SaveStatus = 'saved' | 'saving' | 'unsaved'

export default function DocumentEditor({ doc, ragModelReady, onUpdate, onEmbed, onBack, onDelete }: Props) {
  const [title, setTitle] = useState(doc.title)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [embedding, setEmbedding] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
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
    extensions: [StarterKit],
    content: doc.richText ? JSON.parse(doc.richText) : rawToHtml(doc.rawText),
    onUpdate: ({ editor }) => scheduleSave(() => editor.getJSON()),
  })

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  const handleTitleBlur = async () => {
    const trimmed = title.trim() || 'Untitled'
    if (trimmed !== doc.title) await onUpdate(doc.id, { title: trimmed })
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
        <Button variant="ghost" onClick={handleDelete} className="py-1 px-2.5 text-xs flex-shrink-0 text-err/80 hover:text-err hover:bg-err/10 hover:border-err/20">
          Delete
        </Button>
      </div>

      {/* Edit / Original toggle */}
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
          <Toolbar editor={editor} />
          <EditorContent editor={editor} className="flex-1 overflow-y-auto tiptap-editor" />
        </>
      )}
    </div>
  )
}
