# Annotations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users can highlight any text in the document editor and attach a short comment to it. Highlights appear in a distinct color; clicking a highlight opens a small popover showing the comment. An annotation sidebar lists all comments; clicking one scrolls to the highlight.

**Architecture:** Use `@tiptap/extension-highlight` (already in the npm registry at v3.23.4, matching the installed Tiptap version) for the mark itself. A custom `Comment` mark stores the comment text as an attribute on the span. A floating toolbar button (visible on text selection) opens a small inline form to type the comment. All annotations are stored inside the existing `richText` JSON — no new DB fields needed. A collapsible `AnnotationSidebar` component reads the Tiptap document tree to list all comment marks.

**Tech Stack:** `@tiptap/extension-highlight`, `@tiptap/extension-bubble-menu`, custom Tiptap mark, React, TypeScript, Tailwind CSS v3

---

## File Map

| File | Action |
|------|--------|
| — | Install `@tiptap/extension-highlight` + `@tiptap/extension-bubble-menu` |
| `src/lib/commentMark.ts` | **Create** — custom Tiptap `Comment` mark extension |
| `src/components/documents/AnnotationSidebar.tsx` | **Create** — list of all comments with jump-to |
| `src/components/documents/DocumentEditor.tsx` | Modify — add extensions, bubble menu, sidebar |

---

### Task 1: Install Tiptap extension packages

- [ ] **Step 1: Install packages**

```bash
cd /home/user/transformerjs-demo && npm install @tiptap/extension-highlight @tiptap/extension-bubble-menu
```

Expected: both added to `dependencies` in `package.json`.

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add tiptap highlight + bubble-menu extensions for annotations"
```

---

### Task 2: Custom Comment mark

**Files:**
- Create: `src/lib/commentMark.ts`

The `Comment` mark stores a `comment` attribute (string) on each annotated span. Highlight color comes from a CSS class; the mark name is `comment`.

- [ ] **Step 1: Create the mark extension**

```typescript
// src/lib/commentMark.ts
import { Mark, mergeAttributes } from '@tiptap/core'

export const CommentMark = Mark.create({
  name: 'comment',

  addAttributes() {
    return {
      comment: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-comment'),
        renderHTML: (attrs) => ({ 'data-comment': attrs.comment }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-comment]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'annotation-highlight',
      }),
      0,
    ]
  },
})
```

- [ ] **Step 2: Add CSS for annotation highlights in globals.css**

In `src/app/globals.css`, before the `@media print` block, add:

```css
.annotation-highlight {
  background-color: rgb(var(--color-accent-rgb) / 0.18);
  border-bottom: 2px solid rgb(var(--color-accent-rgb) / 0.6);
  border-radius: 2px;
  cursor: pointer;
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/commentMark.ts src/app/globals.css
git commit -m "feat: CommentMark — custom Tiptap mark with data-comment attribute"
```

---

### Task 3: AnnotationSidebar component

**Files:**
- Create: `src/components/documents/AnnotationSidebar.tsx`

- [ ] **Step 1: Create the sidebar**

```tsx
// src/components/documents/AnnotationSidebar.tsx
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
            // Scroll to and select the annotated text
            editor.commands.setTextSelection({ from: ann.nodePos, to: ann.nodePos + (ann.text.length) })
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/documents/AnnotationSidebar.tsx
git commit -m "feat: AnnotationSidebar — lists all comment marks with jump-to and remove"
```

---

### Task 4: Wire everything into DocumentEditor

**Files:**
- Modify: `src/components/documents/DocumentEditor.tsx`

- [ ] **Step 1: Add imports**

At the top of `src/components/documents/DocumentEditor.tsx`, add:

```typescript
import Highlight from '@tiptap/extension-highlight'
import { BubbleMenu } from '@tiptap/react'
import { CommentMark } from '@/lib/commentMark'
import AnnotationSidebar from './AnnotationSidebar'
```

- [ ] **Step 2: Add annotation state**

Inside the `DocumentEditor` component, after the existing `useState` lines, add:

```typescript
const [showAnnotations, setShowAnnotations] = useState(false)
const [pendingComment, setPendingComment] = useState('')
const [bubbleMode, setBubbleMode] = useState<'toolbar' | 'comment'>('toolbar')
```

- [ ] **Step 3: Add extensions to useEditor**

Change the `useEditor` extensions array from:

```typescript
extensions: [StarterKit],
```

to:

```typescript
extensions: [
  StarterKit,
  Highlight.configure({ multicolor: false }),
  CommentMark,
],
```

- [ ] **Step 4: Add BubbleMenu and AnnotationSidebar to JSX**

In `DocumentEditor.tsx`, inside the non-original view branch (where `<Toolbar>` and `<EditorContent>` are rendered), add the BubbleMenu just before `<Toolbar>`:

```tsx
{editor && (
  <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
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
```

- [ ] **Step 5: Add annotations toggle button and sidebar**

In the Edit/Original toggle bar, add a third button after the existing two modes:

```tsx
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
```

In the content section, just before `<Toolbar>`, add:

```tsx
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
```

- [ ] **Step 6: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Manual test**

1. `npm run dev`
2. Open a document in the editor
3. Select some text — the bubble menu appears with `▐▌` (highlight) and `💬` (comment) buttons
4. Click `▐▌` — text is highlighted in accent color
5. Select different text, click `💬` — input appears; type a note, press Enter
6. The text gets a highlight with underline; click "💬 Notas" tab — the note appears in the sidebar
7. Click the note in the sidebar — the editor scrolls to and selects the annotated text
8. Click ✕ on the note — annotation is removed
9. Save/reload — annotations persist (stored in richText JSON)

- [ ] **Step 8: Commit and push**

```bash
git add src/lib/commentMark.ts src/app/globals.css src/components/documents/AnnotationSidebar.tsx src/components/documents/DocumentEditor.tsx package.json package-lock.json
git commit -m "feat: inline annotations — highlight + comment marks with sidebar via Tiptap BubbleMenu"
git push -u origin claude/local-ocr-webapp-NowwS
```
