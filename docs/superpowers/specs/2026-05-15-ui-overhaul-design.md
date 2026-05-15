# UI Overhaul — Impeccable Mobile + Desktop — Design Spec

**Date:** 2026-05-15  
**Status:** Approved  
**Approach:** Targeted elevation (Option A) — 6 highest-impact changes

---

## 1. Adaptive Navigation

### Mobile (< 640px `sm`)
- Remove top TabBar; render a **fixed bottom bar** instead
- `fixed bottom-0 left-0 right-0 z-50`
- `bg-base/90 backdrop-blur-xl border-t border-white/7`
- `grid grid-cols-5` — equal-width columns for 5 tabs
- Each tab: `flex flex-col items-center gap-0.5 h-14 pt-2 pb-1`
- Icon: 20×20px SVG; active = teal + `scale-110`, inactive = dim + `scale-100`
- Label: `text-[10px] font-medium truncate`; active = `text-accent`, inactive = `text-dim`
- Icon/label transition: `transition-all duration-150`
- Safe area: container gets `pb-[env(safe-area-inset-bottom,0px)]`
- `<main>` gets `mb-20 sm:mb-0` to prevent content hiding behind bar

### Desktop (≥ 640px `sm`)
- Existing sticky top tab bar — no changes to visual design
- `hidden sm:block` on the top tab div; `sm:hidden` on bottom bar

### Files
- `src/components/tabs/TabBar.tsx` — add `variant: 'top' | 'bottom'` prop; bottom variant renders fixed grid
- `src/components/App.tsx` — render both variants with `hidden`/`sm:hidden` classes

---

## 2. Tab Transition Animations

### Keyframe (globals.css)
```css
@keyframes tab-enter {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.tab-panel-enter { animation: tab-enter 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
```

### Mechanism (App.tsx)
- Track `activeKey` state: increments on every tab change
- Each panel wrapper: `<div key={tab === id ? activeKey : 0} className={tab === id ? 'tab-panel-enter' : ''}>`
- Panels are never unmounted (preserves loaded model state)
- Use `aria-hidden={tab !== id}` instead of `hidden` attribute
- `display: none` via Tailwind `hidden` only on non-active panels after first render

### Bottom bar icon
- Active icon: `scale-110` + `text-accent`
- Inactive icon: `scale-100` + `text-dim`
- Transition: `transition-all duration-150`

---

## 3. OCR Two-Column Desktop Layout

### Layout (OcrView.tsx)
```tsx
<div className="p-4 sm:p-6 lg:p-8">
  <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start gap-6">
    {/* Left column: controls */}
    <div className="flex flex-col gap-4">
      <EngineSelector ... />
      {!engineReady && <InfoBanner />}
      {dataUrl ? <ImagePreview /> : <Dropzone />}
      <Button>Run OCR</Button>
      {ocrResult && <Button variant="ghost">Save to Library</Button>}
    </div>
    {/* Right column: result — sticky on desktop */}
    <div className="lg:sticky lg:top-[110px]">
      <ResultPanel ... />
    </div>
  </div>
</div>
```

- Mobile/tablet: single column, vertical stack (unchanged)
- `ResultPanel` textarea: `lg:max-h-none` — no scroll cap on desktop (page scrolls)
- Mobile textarea: `max-h-60 sm:max-h-80`

---

## 4. Touch Targets + Mobile Spacing

### Minimum 44px touch targets
| Element | Before | After |
|---------|--------|-------|
| DocumentCard delete btn | `w-7 h-7` | `w-10 h-10 rounded-xl` |
| ImagePreview clear btn | `w-8 h-8` | `w-10 h-10` |
| Editor toolbar buttons | `px-2 py-1` | `px-2.5 py-1.5 min-w-[36px]` |
| Bottom bar tabs | — | `h-14` fixed height |

### Typography + spacing fixes
- Dashboard stat numbers: `text-2xl` → `text-xl sm:text-2xl` (prevents clip on 320px)
- ChatMessage bubbles: `max-w-[85%]` → `max-w-[88%] sm:max-w-[72%]`
- Main content padding: add `lg:px-8` tier

### Scroll improvements
- Top TabBar: add `scrollbar-none` (`[&::-webkit-scrollbar]:hidden`)
- Chat messages: `scroll-behavior: smooth` on the overflow container

---

## 5. Empty States + Loading

### Empty state pattern (each tab)
```
[SVG illustration ~64px]
[Title — font-semibold text-ink]
[Subtitle — text-sm text-dim/70 max-w-xs]
[CTA button — navigates to relevant tab]
```

| Tab | Illustration | CTA |
|-----|-------------|-----|
| Dashboard | Document with upload arrow | "Escanear ahora" → OCR tab |
| Library | Open empty folder | "Ir a OCR" → OCR tab |
| RAG chat | Chat bubble with star | 3 example question chips |

### RAG example question chips
- `flex flex-wrap gap-2` row below the empty state
- Each chip: `px-3 py-1.5 rounded-xl bg-white/5 border border-white/9 text-xs text-dim hover:text-ink hover:bg-white/8 cursor-pointer`
- On click: sets the textarea input value

### Shimmer skeleton (DocumentList)
Replace `animate-pulse` blocks with shimmer sweep:
```css
@keyframes shimmer {
  from { background-position: 200% center; }
  to   { background-position: -200% center; }
}
```
```tsx
// SkeletonCard blocks use:
className="bg-gradient-to-r from-white/4 via-white/8 to-white/4 
           bg-[length:200%_100%] animate-shimmer rounded-lg"
```
Add `shimmer` to `tailwind.config.ts` animation + keyframe to `globals.css`.

---

## 6. Chat Markdown Rendering

### New file: `src/lib/renderMarkdown.tsx`
Pure function, no deps, returns `ReactNode[]`.

**Patterns handled:**
| Input | Output |
|-------|--------|
| `**text**` | `<strong className="font-semibold text-ink">` |
| `*text*` | `<em className="italic text-ink/90">` |
| `` `code` `` | `<code className="font-mono text-xs bg-white/8 px-1 py-0.5 rounded text-accent-light">` |
| `[1]`, `[2]` | `<sup className="text-accent font-bold text-[10px] ml-0.5">` |
| `> text` | `<blockquote className="border-l-2 border-accent/40 pl-3 text-dim/80 italic my-1">` |
| `- item` / `* item` | `<ul><li>` with `before:content-['•'] before:text-accent` |
| `\n\n` | `<p className="mb-2 last:mb-0">` paragraph break |

**Only applied to `role === 'assistant'` messages.**  
User messages: keep `whitespace-pre-wrap` plain text.  
Streaming cursor: `animate-badge-pulse` span appended to last text node while `streaming === true`.

### File changes
- `src/lib/renderMarkdown.tsx` — new parser
- `src/components/rag/ChatMessage.tsx` — use `renderMarkdown(content)` for AI messages

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/tabs/TabBar.tsx` | Add `variant` prop, bottom bar variant |
| `src/components/App.tsx` | Dual TabBar render, tab-enter animation, `mb-20 sm:mb-0` on main |
| `src/components/ocr/OcrView.tsx` | Two-column desktop grid |
| `src/components/ocr/ResultPanel.tsx` | `lg:max-h-none` on textarea |
| `src/components/documents/DocumentCard.tsx` | Larger delete button |
| `src/components/documents/DocumentList.tsx` | Shimmer skeletons + empty state |
| `src/components/documents/DocumentEditor.tsx` | Larger toolbar buttons |
| `src/components/ocr/ImagePreview.tsx` | Larger clear button |
| `src/components/rag/RagView.tsx` | Example question chips in empty state |
| `src/components/rag/ChatMessage.tsx` | Markdown rendering for AI |
| `src/components/dashboard/DashboardView.tsx` | Empty state + stat size fix |
| `src/lib/renderMarkdown.tsx` | New — markdown parser |
| `src/app/globals.css` | `tab-enter` + `shimmer` keyframes, `.tab-panel-enter` class, scrollbar-none |
| `tailwind.config.ts` | `shimmer` animation entry |

---

## Non-goals
- No changes to RAG retrieval pipeline
- No changes to color palette or design tokens
- No new npm dependencies
- No changes to IndexedDB schema
