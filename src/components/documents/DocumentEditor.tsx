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

// ── Toolbar ─────────────────────────────────────────────────────────────────

function ToolBtn({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`px-2 py-1 rounded text-xs font-mono transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
        active ? 'bg-accent text-white' : 'text-dim hover:bg-rim hover:text-ink'
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
    <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-rim bg-surface">
      <ToolBtn active={e.isActive('bold')} label="Bold" onClick={() => e.chain().focus().toggleBold().run()}>
        <strong>B</strong>
      </ToolBtn>
      <ToolBtn active={e.isActive('italic')} label="Italic" onClick={() => e.chain().focus().toggleItalic().run()}>
        <em>I</em>
      </ToolBtn>
      <ToolBtn active={e.isActive('strike')} label="Strikethrough" onClick={() => e.chain().focus().toggleStrike().run()}>
        S̶
      </ToolBtn>
      <span className="w-px bg-rim mx-1" aria-hidden="true" />
      <ToolBtn active={e.isActive('heading', { level: 1 })} label="Heading 1" onClick={() => e.chain().focus().toggleHeading({ level: 1 }).run()}>
        H1
      </ToolBtn>
      <ToolBtn active={e.isActive('heading', { level: 2 })} label="Heading 2" onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()}>
        H2
      </ToolBtn>
      <span className="w-px bg-rim mx-1" aria-hidden="true" />
      <ToolBtn active={e.isActive('bulletList')} label="Bullet list" onClick={() => e.chain().focus().toggleBulletList().run()}>
        • —
      </ToolBtn>
      <ToolBtn active={e.isActive('orderedList')} label="Ordered list" onClick={() => e.chain().focus().toggleOrderedList().run()}>
        1.
      </ToolBtn>
      <span className="w-px bg-rim mx-1" aria-hidden="true" />
      <ToolBtn active={e.isActive('code')} label="Inline code" onClick={() => e.chain().focus().toggleCode().run()}>
        {'</>'}
      </ToolBtn>
      <ToolBtn active={e.isActive('blockquote')} label="Blockquote" onClick={() => e.chain().focus().toggleBlockquote().run()}>
        ❝
      </ToolBtn>
    </div>
  )
}

// ── Editor ───────────────────────────────────────────────────────────────────

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
    try {
      await onEmbed(doc)
    } finally {
      setEmbedding(false)
    }
  }

  const statusColor: Record<SaveStatus, string> = {
    saved: 'text-ok', saving: 'text-info', unsaved: 'text-dim',
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-rim flex-wrap">
        <Button variant="ghost" onClick={onBack} className="py-1 px-2 text-xs flex-shrink-0">
          ← Library
        </Button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          aria-label="Document title"
          className="flex-1 min-w-0 bg-transparent text-ink font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded px-1 py-0.5"
        />
        <span className={`text-xs flex-shrink-0 ${statusColor[saveStatus]}`}>
          {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : '● Unsaved'}
        </span>
        {ragModelReady && (
          <Button
            variant="ghost"
            onClick={handleEmbed}
            spinning={embedding}
            disabled={embedding}
            className="py-1 px-2 text-xs flex-shrink-0"
          >
            {doc.embedding ? 'Re-index' : 'Index for RAG'}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={handleDelete}
          className="py-1 px-2 text-xs flex-shrink-0 text-err hover:bg-err/10"
        >
          Delete
        </Button>
      </div>

      {/* Toggle: Edit / Original */}
      <div className="flex border-b border-rim text-xs">
        <button
          onClick={() => setShowOriginal(false)}
          className={`px-4 py-2 font-semibold transition-colors ${!showOriginal ? 'text-accent border-b-2 border-accent -mb-px' : 'text-dim hover:text-ink'}`}
        >
          Edit
        </button>
        <button
          onClick={() => setShowOriginal(true)}
          className={`px-4 py-2 font-semibold transition-colors ${showOriginal ? 'text-accent border-b-2 border-accent -mb-px' : 'text-dim hover:text-ink'}`}
        >
          Original
        </button>
      </div>

      {showOriginal ? (
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {doc.imageDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doc.imageDataUrl} alt="Original scan" className="max-h-72 object-contain rounded-lg border border-rim bg-base mx-auto block" />
          )}
          <pre className="text-xs text-dim whitespace-pre-wrap font-mono bg-surface2 rounded-lg p-4 overflow-x-auto">
            {doc.rawText}
          </pre>
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
