# Language Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After OCR completes, detect the language of the extracted text and show a suggestion banner in the result panel recommending the best matching Tesseract engine. The user can accept the suggestion with one click, which calls `onSelectEngine`.

**Architecture:** A lightweight heuristic detector in `src/services/languageDetectionService.ts` counts character script frequencies (Latin with accents = Spanish/French, mostly ASCII = English) plus keyword matching. No external library is needed — the app supports only English and Spanish engines, so a 30-line heuristic outperforms a 100 kB `franc` bundle. The suggestion appears inside `ResultPanel` via two new props. OcrView passes `selectedId` and `onSelectEngine` down to `ResultPanel`.

**Tech Stack:** TypeScript, React, Tailwind CSS v3

---

## File Map

| File | Action |
|------|--------|
| `src/services/languageDetectionService.ts` | **Create** — `detectLanguage(text)` heuristic |
| `src/components/ocr/ResultPanel.tsx` | Modify — show language suggestion banner |
| `src/components/ocr/OcrView.tsx` | Modify — pass `selectedId` + `onSelectEngine` to `ResultPanel` |

---

### Task 1: languageDetectionService

**Files:**
- Create: `src/services/languageDetectionService.ts`

The service maps detected language to the best available engine ID from `src/config/engines.ts`.

- [ ] **Step 1: Create the service**

```typescript
// src/services/languageDetectionService.ts
import { ENGINES } from '@/config/engines'

export type DetectedLang = 'eng' | 'spa' | 'unknown'

export interface LangSuggestion {
  lang: DetectedLang
  label: string
  engineId: string | null  // null if no matching engine
  engineLabel: string | null
}

// Spanish-specific characters: á é í ó ú ü ñ ¿ ¡ and their uppercase forms
const SPA_PATTERN = /[áéíóúüñÁÉÍÓÚÜÑ¿¡]/g

// High-frequency Spanish words (short, unambiguous)
const SPA_WORDS = new Set(['que', 'con', 'una', 'los', 'las', 'por', 'del', 'para', 'más', 'como', 'pero', 'sus', 'también', 'está', 'son'])
const ENG_WORDS = new Set(['the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'been', 'they', 'their', 'what', 'which', 'when', 'were'])

export function detectLanguage(text: string): LangSuggestion {
  if (text.trim().length < 30) {
    return { lang: 'unknown', label: 'Desconocido', engineId: null, engineLabel: null }
  }

  const lower = text.toLowerCase()
  const words = lower.match(/\b[a-záéíóúüñ]{3,}\b/g) ?? []

  const spaCharMatches = (text.match(SPA_PATTERN) ?? []).length
  const spaWordCount   = words.filter((w) => SPA_WORDS.has(w)).length
  const engWordCount   = words.filter((w) => ENG_WORDS.has(w)).length

  // Spanish score: weighted by accented chars (strong signal) + common words
  const spaScore = spaCharMatches * 3 + spaWordCount * 2
  const engScore = engWordCount * 2

  let lang: DetectedLang = 'unknown'
  if (spaScore > engScore && spaScore >= 3) lang = 'spa'
  else if (engScore > spaScore && engScore >= 3) lang = 'eng'

  if (lang === 'unknown') {
    return { lang, label: 'Desconocido', engineId: null, engineLabel: null }
  }

  // Find best engine: prefer 'best' accuracy, fall back to 'fast'
  const candidates = ENGINES.filter((e) => e.langs === lang || e.langs.startsWith(lang))
  const best = candidates.find((e) => e.id.endsWith('-best')) ?? candidates[0] ?? null

  return {
    lang,
    label: lang === 'spa' ? 'Español' : 'English',
    engineId: best?.id ?? null,
    engineLabel: best?.label ?? null,
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit service**

```bash
git add src/services/languageDetectionService.ts
git commit -m "feat: languageDetectionService — heuristic eng/spa detection from OCR text"
```

---

### Task 2: Language suggestion banner in ResultPanel

**Files:**
- Modify: `src/components/ocr/ResultPanel.tsx`

- [ ] **Step 1: Update ResultPanel props and add suggestion banner**

Replace the full content of `src/components/ocr/ResultPanel.tsx` with:

```tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import type { OcrResult } from '@/types/ocr'
import Button from '@/components/ui/Button'
import { detectLanguage } from '@/services/languageDetectionService'
import type { LangSuggestion } from '@/services/languageDetectionService'

interface Props {
  result: OcrResult | null
  error: string | null
  selectedEngineId?: string
  onSelectEngine?: (id: string) => void
}

export default function ResultPanel({ result, error, selectedEngineId, onSelectEngine }: Props) {
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'fail'>('idle')
  const [suggestion, setSuggestion] = useState<LangSuggestion | null>(null)
  const [suggestionDismissed, setSuggestionDismissed] = useState(false)

  useEffect(() => {
    setSuggestionDismissed(false)
    if (!result?.text) { setSuggestion(null); return }
    const s = detectLanguage(result.text)
    // Only suggest if there's a matching engine AND it differs from the currently selected one
    if (s.engineId && s.engineId !== selectedEngineId) {
      setSuggestion(s)
    } else {
      setSuggestion(null)
    }
  }, [result?.text, selectedEngineId])

  const copy = useCallback(async () => {
    if (!result?.text) return
    try {
      await navigator.clipboard.writeText(result.text)
      setCopyState('ok')
    } catch {
      setCopyState('fail')
    } finally {
      setTimeout(() => setCopyState('idle'), 1500)
    }
  }, [result])

  if (error) {
    return (
      <div role="alert" className="flex gap-2.5 px-4 py-3.5 rounded-xl bg-err/8 border border-err/20">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-err flex-shrink-0 mt-0.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-sm text-err">{error}</p>
      </div>
    )
  }

  if (!result) return null

  return (
    <div className="space-y-3 animate-slide-up">
      {/* Language suggestion */}
      {suggestion && !suggestionDismissed && onSelectEngine && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-info/8 border border-info/20 text-xs">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-info flex-shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span className="flex-1 text-info/90">
            Texto en <strong>{suggestion.label}</strong> detectado. ¿Cambiar al motor <strong>{suggestion.engineLabel}</strong>?
          </span>
          <button
            onClick={() => { onSelectEngine(suggestion.engineId!); setSuggestionDismissed(true) }}
            className="text-xs px-2.5 py-1 rounded-lg bg-info/15 border border-info/30 text-info hover:bg-info/20 transition-colors flex-shrink-0"
          >
            Cambiar
          </button>
          <button
            onClick={() => setSuggestionDismissed(true)}
            className="text-dim/40 hover:text-dim transition-colors"
            aria-label="Ignorar sugerencia"
          >
            ✕
          </button>
        </div>
      )}

      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="section-label">Resultado</p>
          <div className="flex items-center gap-2">
            {result.confidence !== null && (
              <span className="text-xs font-mono text-dim/70 tabular-nums">{result.confidence.toFixed(1)}% conf.</span>
            )}
            <Button variant="ghost" onClick={copy} aria-label="Copy result" className="py-1 px-2.5 text-xs h-auto">
              {copyState === 'ok' ? <span className="text-ok">¡Copiado!</span>
               : copyState === 'fail' ? <span className="text-err">Error</span>
               : 'Copiar'}
            </Button>
          </div>
        </div>
        <textarea
          readOnly
          value={result.text}
          rows={8}
          aria-label="OCR result text"
          className="w-full max-h-60 sm:max-h-80 lg:max-h-none bg-void border border-white/7 rounded-xl px-4 py-3 text-sm text-ink/85 font-mono resize-y focus:outline-none focus:ring-1 focus:ring-accent/40 leading-relaxed"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit ResultPanel**

```bash
git add src/components/ocr/ResultPanel.tsx
git commit -m "feat: language detection banner in ResultPanel with one-click engine switch"
```

---

### Task 3: Pass engine props from OcrView to ResultPanel

**Files:**
- Modify: `src/components/ocr/OcrView.tsx`

- [ ] **Step 1: Update ResultPanel usage in OcrView**

In `src/components/ocr/OcrView.tsx`, find the line:

```tsx
<ResultPanel result={ocrResult} error={ocrError} />
```

Replace with:

```tsx
<ResultPanel
  result={ocrResult}
  error={ocrError}
  selectedEngineId={selectedId}
  onSelectEngine={onSelectEngine}
/>
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/user/transformerjs-demo && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual test**

1. `npm run dev`
2. Load a Spanish document image and run OCR with the English engine
3. After OCR, a blue info banner appears: "Texto en Español detectado. ¿Cambiar al motor Español — Alta Precisión?"
4. Click "Cambiar" — engine selector switches to `spa-best`, banner disappears
5. Load an English document with the Spanish engine selected — banner suggests English engine
6. Click ✕ — banner dismisses without changing engine

- [ ] **Step 4: Commit and push**

```bash
git add src/components/ocr/OcrView.tsx
git commit -m "feat: pass engine props to ResultPanel for language suggestion"
git push -u origin claude/local-ocr-webapp-NowwS
```
