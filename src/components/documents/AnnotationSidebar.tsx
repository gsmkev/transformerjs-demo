'use client'

import type { Editor } from '@tiptap/react'

interface AnnotationEntry {
  nodePos: number
  text: string
  comment: string
}

function collectAnnotations(editor: Editor): AnnotationEntry[] {
  const entries: AnnotationEntry[] = []
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return
    for (const mark of node.marks) {
      if (mark.type.name === 'comment' && mark.attrs.comment) {
        entries.push({
          nodePos: pos,
          text: node.text?.slice(0, 60) ?? '',
          comment: mark.attrs.comment as string,
        })
      }
    }
  })
  return entries
}

interface Props {
  editor: Editor | null
  onRemove: (pos: number, length: number) => void
}

export default function AnnotationSidebar({ editor, onRemove }: Props) {
  if (!editor) return null

  const annotations = collectAnnotations(editor)

  if (annotations.length === 0) {
    return (
      <div className="px-4 py-3 border-b border-white/5 bg-surface/20">
        <p className="text-xs text-dim/50">Sin anotaciones. Selecciona texto y haz clic en 💬.</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-3 border-b border-white/5 bg-surface/20 space-y-2">
      <p className="section-label">{annotations.length} anotación{annotations.length !== 1 ? 'es' : ''}</p>
      {annotations.map((ann, i) => (
        <div
          key={i}
          className="flex gap-2 group cursor-pointer hover:bg-white/4 rounded-lg px-2 py-1.5 transition-colors"
          onClick={() => {
            editor.commands.setTextSelection({ from: ann.nodePos, to: ann.nodePos + ann.text.length })
            editor.commands.focus()
          }}
        >
          <span className="text-accent/70 flex-shrink-0 mt-0.5">💬</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-dim/70 italic truncate">"{ann.text}{ann.text.length === 60 ? '…' : ''}"</p>
            <p className="text-xs text-ink mt-0.5">{ann.comment}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(ann.nodePos, ann.text.length)
            }}
            className="opacity-0 group-hover:opacity-100 text-dim/40 hover:text-err transition-all text-xs flex-shrink-0"
            aria-label="Eliminar anotación"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
