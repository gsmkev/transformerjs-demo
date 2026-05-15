# Expiry Dates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional expiry date to documents so users can track contracts, IDs, insurance, and subscriptions that expire. Documents with approaching or past expiry show a colored badge in the library card.

**Architecture:** Add `expiresAt?: number | null` (Unix ms timestamp) to `ScannedDocument`. A date input in `DocumentEditor` lets users set/clear it. `DocumentCard` renders a badge: red if expired, amber if expiring within 30 days, green if >30 days away. `DocumentList` adds an "Expiring soon" filter option. All logic is pure TypeScript — no new stores, no migrations needed (optional field).

**Tech Stack:** TypeScript, React, Tailwind CSS v3

---

## File Map

| File | Action |
|------|--------|
| `src/types/document.ts` | Modify — add `expiresAt?: number \| null` to `ScannedDocument` |
| `src/components/documents/DocumentEditor.tsx` | Modify — add date input in header area |
| `src/components/documents/DocumentCard.tsx` | Modify — add expiry badge |
| `src/components/documents/DocumentList.tsx` | Modify — add "Expiring soon" filter chip |

---

### Task 1: Add `expiresAt` to the type

**Files:**
- Modify: `src/types/document.ts`

- [ ] **Step 1: Add field to ScannedDocument**

In `src/types/document.ts`, add the line after `extractedData`:

```typescript
export interface ScannedDocument {
  id: string
  title: string
  imageDataUrl: string
  rawText: string
  richText: string
  engineId: string
  confidence: number | null
  createdAt: number
  updatedAt: number
  embedding: number[] | null
  category?: string | null
  tags?: string[]
  extractionSchema?: ExtractionField[] | null
  extractedData?: Record<string, string> | null
  expiresAt?: number | null          // Unix ms — optional expiry date
  summary?: string | null            // LLM-generated summary (placeholder for auto-summary feature)
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit type**

```bash
git add src/types/document.ts
git commit -m "feat: add expiresAt and summary fields to ScannedDocument type"
```

---

### Task 2: Date input in DocumentEditor

**Files:**
- Modify: `src/components/documents/DocumentEditor.tsx`

- [ ] **Step 1: Add expiry state and handler**

In `DocumentEditor.tsx`, after the `const [toastMsg, setToastMsg]` state line, add:

```typescript
const [expiresAt, setExpiresAt] = useState<number | null>(doc.expiresAt ?? null)
```

In the `useEffect` that resets state on `doc.id` change, add:
```typescript
setExpiresAt(doc.expiresAt ?? null)
```

Add a handler after `handleDataChange`:
```typescript
const handleExpiryChange = async (dateStr: string) => {
  const ts = dateStr ? new Date(dateStr).getTime() : null
  setExpiresAt(ts)
  await onUpdate(doc.id, { expiresAt: ts })
}
```

- [ ] **Step 2: Add date input to the Tags section**

In `DocumentEditor.tsx`, inside the Tags section div (just after `<TagEditor ... />`), add:

```tsx
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
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit editor**

```bash
git add src/components/documents/DocumentEditor.tsx
git commit -m "feat: expiry date input in DocumentEditor"
```

---

### Task 3: Expiry badge in DocumentCard

**Files:**
- Modify: `src/components/documents/DocumentCard.tsx`

- [ ] **Step 1: Add expiry badge helper and render it**

In `DocumentCard.tsx`, add a helper function before the component:

```typescript
function expiryBadge(expiresAt: number | null | undefined): { label: string; cls: string } | null {
  if (!expiresAt) return null
  const now = Date.now()
  const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0)  return { label: 'Caducado',           cls: 'text-err/90   bg-err/10   border-err/20'   }
  if (daysLeft <= 7) return { label: `Caduca en ${daysLeft}d`, cls: 'text-err/80   bg-err/8    border-err/15'   }
  if (daysLeft <= 30) return { label: `Caduca en ${daysLeft}d`, cls: 'text-warn/90  bg-warn/10  border-warn/20'  }
  const dateStr = new Date(expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return { label: `Caduca ${dateStr}`, cls: 'text-ok/80 bg-ok/8 border-ok/15' }
}
```

Then in the `<div className="flex items-center gap-2.5 mt-2.5 flex-wrap">` section, after the `{doc.category && ...}` span, add:

```tsx
{(() => {
  const badge = expiryBadge(doc.expiresAt)
  return badge ? (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.cls}`}>
      {badge.label}
    </span>
  ) : null
})()}
```

Note: you need `text-warn` color. Check `globals.css` — if `--color-warn-rgb` isn't defined, use `text-yellow-400/90 bg-yellow-400/10 border-yellow-400/20` instead for the 1-30 day range.

Actually, use safe Tailwind colors that are already in the project:
- Expired: `text-err/90 bg-err/10 border-err/20`
- 1-7 days: `text-err/70 bg-err/8 border-err/15`
- 8-30 days: `text-yellow-400/80 bg-yellow-400/8 border-yellow-400/15`
- >30 days: `text-ok/70 bg-ok/8 border-ok/15`

Updated helper:
```typescript
function expiryBadge(expiresAt: number | null | undefined): { label: string; cls: string } | null {
  if (!expiresAt) return null
  const now = Date.now()
  const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0)   return { label: 'Caducado',                cls: 'text-err/90 bg-err/10 border-err/20' }
  if (daysLeft <= 7)  return { label: `Caduca en ${daysLeft}d`,  cls: 'text-err/70 bg-err/8 border-err/15' }
  if (daysLeft <= 30) return { label: `Caduca en ${daysLeft}d`,  cls: 'text-yellow-400/80 bg-yellow-400/8 border-yellow-400/15' }
  const dateStr = new Date(expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return { label: `Caduca ${dateStr}`, cls: 'text-ok/70 bg-ok/8 border-ok/15' }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit card**

```bash
git add src/components/documents/DocumentCard.tsx
git commit -m "feat: expiry badge in DocumentCard (red/amber/green by days remaining)"
```

---

### Task 4: "Expiring soon" filter in DocumentList

**Files:**
- Modify: `src/components/documents/DocumentList.tsx`

- [ ] **Step 1: Add expiry filter toggle**

In `DocumentList.tsx`, add a state variable after the existing `filter` state:

```typescript
const [showExpiringSoon, setShowExpiringSoon] = useState(false)
```

Update the `filtered` array computation to also filter by expiry:

```typescript
const filtered = documents.filter((doc) => {
  if (q) {
    const inTitle = doc.title.toLowerCase().includes(q)
    const inCat   = (doc.category ?? '').toLowerCase().includes(q)
    const inTags  = (doc.tags ?? []).some((t) => t.includes(q))
    if (!inTitle && !inCat && !inTags) return false
  }
  if (filter.category && doc.category !== filter.category) return false
  if (filter.tags.length > 0) {
    const docTags = doc.tags ?? []
    if (!filter.tags.some((t) => docTags.includes(t))) return false
  }
  if (showExpiringSoon) {
    if (!doc.expiresAt) return false
    const daysLeft = Math.ceil((doc.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysLeft > 30) return false
  }
  return true
})
```

Add the toggle button in the filter row, after the `FilterDropdown`:

```tsx
{documents.some((d) => d.expiresAt) && (
  <button
    onClick={() => setShowExpiringSoon((v) => !v)}
    className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all ${
      showExpiringSoon
        ? 'bg-yellow-400/15 border-yellow-400/30 text-yellow-400'
        : 'border-white/10 text-dim hover:text-ink hover:bg-white/5'
    }`}
    aria-pressed={showExpiringSoon}
  >
    ⏰ Próximos a caducar
  </button>
)}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit and push**

```bash
git add src/components/documents/DocumentList.tsx
git commit -m "feat: expiring-soon filter in DocumentList"
git push -u origin claude/local-ocr-webapp-NowwS
```
