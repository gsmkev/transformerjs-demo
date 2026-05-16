# Archivo — Rebranding & UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand Papeleo → Archivo with a light-mode minimalist design, indigo accent, 3-tab navigation with central FAB, accessibility modes, adaptive landing home, and simplified screens.

**Architecture:** CSS token swap via `globals.css` + Tailwind + `html` class-based a11y modes. Navigation collapses to 2 tabs + FAB (documents, buscar, ⊕). Settings, models, and security move to a `ProfileDrawer`. Home becomes adaptive (landing when 0 docs, dashboard when docs exist).

**Tech Stack:** Next.js 15, Tailwind CSS v3, React hooks, Inter font, Lucide-style inline SVG icons, IndexedDB (idb), Tiptap.

**Run after each task:** `npx tsc --noEmit` — expect 0 errors.

---

## Task 1: Design Tokens — globals.css

**Files:**
- Modify: `src/app/globals.css`

Replace the entire token block and base styles. This is the single biggest visual change — everything else cascades from here.

- [ ] **Step 1: Replace CSS custom properties**

Open `src/app/globals.css`. Replace lines 1–108 (`:root`, `html.light`, `@tailwind`, `@layer base { html { ... } body { ... } body::before { ... } }`) with:

```css
/* ── Theme tokens ───────────────────────────────────────────────────── */
:root {
  /* Dark mode (sobrio) — default */
  --color-void:     #07070a;
  --color-base:     #0f0f11;
  --color-surface:  #1c1c1e;
  --color-surface2: #242426;
  --color-rim:      #2c2c2e;

  --color-accent:       #818cf8;
  --color-accent-light: #a5b4fc;
  --color-accent-dark:  #6366f1;
  --color-accent-glow:  rgba(99,102,241,0.20);
  --color-accent-muted: rgba(99,102,241,0.10);

  --color-ink:   #f5f5f5;
  --color-dim:   #98989e;
  --color-muted: #636366;

  --color-ok:   #22c55e;
  --color-err:  #f43f5e;
  --color-warn: #f59e0b;
  --color-info: #38bdf8;

  --glass-bg:     rgba(255,255,255,0.04);
  --glass-border: rgba(255,255,255,0.08);

  --color-ink-rgb:    245 245 245;
  --color-dim-rgb:    152 152 158;
  --color-accent-rgb: 129 140 248;
  --color-ok-rgb:     34 197 94;
  --color-err-rgb:    244 63 94;
  --color-warn-rgb:   245 158 11;
  --color-info-rgb:   56 189 248;
}

html.light {
  --color-void:     #f0f0f4;
  --color-base:     #ffffff;
  --color-surface:  #f7f7f8;
  --color-surface2: #ededf0;
  --color-rim:      #e4e4e7;

  --color-accent:       #4f46e5;
  --color-accent-light: #6366f1;
  --color-accent-dark:  #4338ca;
  --color-accent-glow:  rgba(79,70,229,0.12);
  --color-accent-muted: rgba(79,70,229,0.08);

  --color-ink:   #18181b;
  --color-dim:   #71717a;
  --color-muted: #a1a1aa;

  --color-ok:   #16a34a;
  --color-err:  #dc2626;
  --color-warn: #d97706;
  --color-info: #0284c7;

  --glass-bg:     rgba(0,0,0,0.02);
  --glass-border: rgba(0,0,0,0.07);

  --color-ink-rgb:    24 24 27;
  --color-dim-rgb:    113 113 122;
  --color-accent-rgb: 79 70 229;
  --color-ok-rgb:     22 163 74;
  --color-err-rgb:    220 38 38;
  --color-warn-rgb:   217 119 6;
  --color-info-rgb:   2 132 199;
}

/* ── Accessibility: Large text ─────────────────────────────────────── */
html.a11y-large { font-size: 118.75%; }   /* 16px → 19px */

/* ── Accessibility: High contrast ─────────────────────────────────── */
html.a11y-contrast {
  --color-surface:  var(--color-base);
  --color-surface2: var(--color-base);
  --color-rim:      var(--color-ink);
  --glass-border:   var(--color-ink);
}
html.a11y-contrast .card,
html.a11y-contrast .card-interactive {
  border-width: 2px !important;
  backdrop-filter: none !important;
}

/* ── Accessibility: Reduced motion ─────────────────────────────────── */
html.a11y-motion *,
html.a11y-motion *::before,
html.a11y-motion *::after {
  transition-duration: 0.01ms !important;
  animation-duration:  0.01ms !important;
  animation-delay:     0.01ms !important;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration:  0.01ms !important;
  }
}

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── Base ───────────────────────────────────────────────────────────── */
@layer base {
  *, *::before, *::after { box-sizing: border-box; }

  html {
    @apply antialiased;
    -webkit-tap-highlight-color: transparent;
  }

  body {
    @apply bg-base text-ink;
    min-height: 100dvh;
  }
}
```

- [ ] **Step 2: Update card components in globals.css**

Find the `@layer components {` block. Replace the `.card`, `.card-interactive`, `.card-elevated` rules with:

```css
  /* ── Cards ── */
  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-rim);
    border-radius: 12px;
    padding: theme('spacing.4');
    position: relative;
  }
  @media (min-width: 640px) {
    .card { border-radius: 14px; }
  }

  .card-interactive {
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, transform 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .card-interactive:hover {
    background: var(--color-surface2);
  }
  .card-interactive:active {
    transform: scale(0.98);
    transition-duration: 0.1s;
  }

  .card-elevated {
    background: var(--color-surface);
    border: 1px solid var(--color-rim);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  }
```

- [ ] **Step 3: Update badge and button styles**

In the same `@layer components` block, update badge classes:

```css
  /* ── Status Badges ── */
  .badge-idle    { @apply bg-surface2 text-dim border border-rim; }
  .badge-loading { @apply text-info border animate-badge-pulse; background-color: color-mix(in srgb, var(--color-info) 10%, transparent); border-color: color-mix(in srgb, var(--color-info) 25%, transparent); }
  .badge-ready   { @apply text-ok border; background-color: color-mix(in srgb, var(--color-ok) 10%, transparent); border-color: color-mix(in srgb, var(--color-ok) 25%, transparent); }
  .badge-error   { @apply text-err border; background-color: color-mix(in srgb, var(--color-err) 10%, transparent); border-color: color-mix(in srgb, var(--color-err) 25%, transparent); }
```

And update `.gradient-text`:
```css
  .gradient-text {
    background: linear-gradient(130deg, var(--color-ink) 0%, var(--color-accent-light) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
```

And add the FAB pulse animation at end of `@layer components`:
```css
  /* ── FAB idle pulse ── */
  @keyframes fab-pulse {
    0%, 100% { box-shadow: 0 0 0 0 var(--color-accent-glow); }
    50%       { box-shadow: 0 0 0 8px transparent; }
  }
  .fab-pulse { animation: fab-pulse 2s ease-in-out infinite; }
  html.a11y-motion .fab-pulse { animation: none; }
```

- [ ] **Step 4: Add entrance animations to `@layer utilities`**

After the `@layer components` block, ensure this exists (add if missing):

```css
@layer utilities {
  .animate-fade-in { animation: fade-in 0.2s ease-out both; }
  .animate-slide-up { animation: slide-up 0.28s cubic-bezier(0.32,0.72,0,1) both; }
  .tab-panel-enter { animation: fade-in 0.18s ease-out both; }
}
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "style: redesign CSS tokens for Archivo — indigo accent, light/dark sobrio, a11y modes"
```

---

## Task 2: Tailwind Config

**Files:**
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Update accent color tokens**

Open `tailwind.config.ts`. In `theme.extend.colors`, change the `accent` object to use the new indigo values that match the CSS vars:

```typescript
accent: {
  DEFAULT: 'var(--color-accent)',
  light:   'var(--color-accent-light)',
  dark:    'var(--color-accent-dark)',
  glow:    'var(--color-accent-glow)',
  muted:   'var(--color-accent-muted)',
},
```

The rest of the color tokens (void, base, surface, rim, ink, dim, muted, ok, err, warn, info) reference CSS vars and need no change — they already use `var(--color-*)` references.

- [ ] **Step 2: Add `surface2` and `rim` if missing**

Verify these entries exist in `theme.extend.colors`:
```typescript
surface2: 'var(--color-surface2)',
rim:      'var(--color-rim)',
```

Add them if missing.

- [ ] **Step 3: Verify Tailwind compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts
git commit -m "style: update Tailwind accent tokens to indigo"
```

---

## Task 3: App Identity — Manifest + Layout

**Files:**
- Modify: `public/manifest.json`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update manifest.json**

Replace full `public/manifest.json`:

```json
{
  "name": "Archivo",
  "short_name": "Archivo",
  "description": "Tu vault personal de documentos — 100% privado, funciona sin internet.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0f0f11",
  "theme_color": "#4f46e5",
  "lang": "es",
  "categories": ["productivity", "utilities"],
  "icons": [
    { "src": "/icons/icon.svg", "type": "image/svg+xml", "sizes": "any", "purpose": "any" },
    { "src": "/icons/icon.svg", "type": "image/svg+xml", "sizes": "any", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/icons/icon.svg", "sizes": "512x512", "type": "image/svg+xml", "form_factor": "narrow" }
  ]
}
```

- [ ] **Step 2: Update layout.tsx**

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Archivo',
  description: 'Tu vault personal de documentos — 100% privado, funciona sin internet.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Archivo',
  },
  other: { 'mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#4f46e5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var s=localStorage.getItem('archivo_theme');var sys=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='light'||(!s&&!sys)){document.documentElement.classList.add('light');}var a=localStorage.getItem('archivo_a11y');if(a){try{var p=JSON.parse(a);if(p.textSize==='large')document.documentElement.classList.add('a11y-large');if(p.contrast==='high')document.documentElement.classList.add('a11y-contrast');if(p.motion==='reduced')document.documentElement.classList.add('a11y-motion');}catch(e){}}}catch(e){}})();` }} />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  )
}
```

Note: the inline script now reads from `archivo_theme` and `archivo_a11y` keys (not `papeleo_theme`). It applies a11y classes before first paint to avoid flicker.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add public/manifest.json src/app/layout.tsx
git commit -m "feat: rebrand to Archivo — manifest, Inter font, indigo theme color"
```

---

## Task 4: useA11y Hook

**Files:**
- Create: `src/hooks/useA11y.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useA11y.ts`:

```typescript
'use client'

import { useState, useCallback } from 'react'

export interface A11yPrefs {
  textSize: 'normal' | 'large'
  contrast: 'normal' | 'high'
  motion:   'normal' | 'reduced'
}

const STORAGE_KEY = 'archivo_a11y'

const DEFAULTS: A11yPrefs = { textSize: 'normal', contrast: 'normal', motion: 'normal' }

function readPrefs(): A11yPrefs {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { return DEFAULTS }
}

function applyPrefs(prefs: A11yPrefs) {
  const cl = document.documentElement.classList
  cl.toggle('a11y-large',    prefs.textSize === 'large')
  cl.toggle('a11y-contrast', prefs.contrast === 'high')
  cl.toggle('a11y-motion',   prefs.motion   === 'reduced')
}

export function useA11y() {
  const [prefs, setPrefs] = useState<A11yPrefs>(readPrefs)

  const update = useCallback((partial: Partial<A11yPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {}
      applyPrefs(next)
      return next
    })
  }, [])

  return { prefs, update }
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useA11y.ts
git commit -m "feat: add useA11y hook — textSize, contrast, motion preferences"
```

---

## Task 5: useTheme — Add System Mode

**Files:**
- Modify: `src/hooks/useTheme.ts`

- [ ] **Step 1: Replace useTheme.ts**

```typescript
'use client'

import { useState, useCallback } from 'react'

export type ThemeChoice = 'dark' | 'light' | 'system'
export type Theme = 'dark' | 'light'   // resolved

const STORAGE_KEY = 'archivo_theme'

function resolveTheme(choice: ThemeChoice): Theme {
  if (choice === 'system') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark' : 'light'
  }
  return choice
}

function readChoice(): ThemeChoice {
  if (typeof window === 'undefined') return 'system'
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s === 'light' || s === 'dark' || s === 'system') return s
    return 'system'
  } catch { return 'system' }
}

function applyTheme(resolved: Theme) {
  document.documentElement.classList.toggle('light', resolved === 'light')
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readChoice)
  const theme: Theme = resolveTheme(choice)

  const setThemeChoice = useCallback((next: ThemeChoice) => {
    setChoice(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}
    applyTheme(resolveTheme(next))
  }, [])

  const toggle = useCallback(() => {
    setThemeChoice(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setThemeChoice])

  return { theme, choice, setThemeChoice, toggle }
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors. (App.tsx uses `{ theme, toggle }` — both still exported.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTheme.ts
git commit -m "feat: useTheme — add system mode and archivo_theme storage key"
```

---

## Task 6: New Bottom Navigation with FAB

**Files:**
- Modify: `src/components/tabs/TabBar.tsx`

The new bottom nav shows 2 tabs (Documents, Buscar) + a central FAB button that opens the scanner. The FAB is NOT a tab — it fires `onFab` callback.

- [ ] **Step 1: Replace TabBar.tsx**

```tsx
import type { ReactElement } from 'react'
import type { Tab } from '@/types/ocr'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
  onFab?: () => void
  variant?: 'top' | 'bottom'
  fabPulse?: boolean
}

const DocsIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
)

const SearchIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const NAV_TABS: { id: Tab; label: string; Icon: typeof DocsIcon }[] = [
  { id: 'documents', label: 'Documentos', Icon: DocsIcon },
  { id: 'rag',       label: 'Buscar',     Icon: SearchIcon },
]

export default function TabBar({ active, onChange, onFab, variant = 'top', fabPulse = false }: Props) {
  if (variant === 'bottom') {
    return (
      <nav
        role="tablist"
        aria-label="Secciones de la app"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-rim bg-base grid grid-cols-3 pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* Left tab — Documents */}
        <button
          role="tab"
          aria-selected={active === 'documents'}
          aria-controls="panel-documents"
          onClick={() => onChange('documents')}
          className={`flex flex-col items-center justify-center gap-0.5 h-14 pt-2 pb-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors ${
            active === 'documents' ? 'text-accent' : 'text-dim'
          }`}
        >
          <span className={`transition-transform duration-150 ${active === 'documents' ? 'scale-110' : 'scale-100'}`}>
            <DocsIcon />
          </span>
          <span className={`text-[10px] font-medium ${active === 'documents' ? 'text-accent' : 'text-dim'}`}>
            Documentos
          </span>
        </button>

        {/* Center FAB */}
        <div className="flex items-center justify-center">
          <button
            onClick={onFab}
            aria-label="Añadir documento"
            className={`w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center shadow-md active:scale-95 transition-transform duration-150 ${fabPulse ? 'fab-pulse' : ''}`}
          >
            <PlusIcon />
          </button>
        </div>

        {/* Right tab — Buscar */}
        <button
          role="tab"
          aria-selected={active === 'rag'}
          aria-controls="panel-rag"
          onClick={() => onChange('rag')}
          className={`flex flex-col items-center justify-center gap-0.5 h-14 pt-2 pb-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-colors ${
            active === 'rag' ? 'text-accent' : 'text-dim'
          }`}
        >
          <span className={`transition-transform duration-150 ${active === 'rag' ? 'scale-110' : 'scale-100'}`}>
            <SearchIcon />
          </span>
          <span className={`text-[10px] font-medium ${active === 'rag' ? 'text-accent' : 'text-dim'}`}>
            Buscar
          </span>
        </button>
      </nav>
    )
  }

  /* Desktop top variant — simplified 2-tab bar */
  return (
    <nav role="tablist" aria-label="Secciones de la app" className="flex items-center gap-1 px-4 sm:px-6 py-2.5">
      {NAV_TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          aria-controls={`panel-${t.id}`}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
            active === t.id
              ? 'bg-accent/10 border border-accent/25 text-accent'
              : 'text-dim hover:text-ink hover:bg-surface border border-transparent'
          }`}
        >
          <t.Icon size={14} />
          {t.label}
        </button>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tabs/TabBar.tsx
git commit -m "feat: new 2-tab + FAB bottom navigation for Archivo"
```

---

## Task 7: ScannerSheet Component

**Files:**
- Create: `src/components/scanner/ScannerSheet.tsx`

Bottom sheet with 3 source options: image, PDF, audio. Fires callbacks — no internal state.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  onSelectImage: () => void
  onSelectAudio: () => void
}

const ImageIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
)

const AudioIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
)

export default function ScannerSheet({ open, onClose, onSelectImage, onSelectAudio }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleImage = () => { onClose(); onSelectImage() }
  const handleAudio = () => { onClose(); onSelectAudio() }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative bg-base border-t border-rim rounded-t-2xl pb-[env(safe-area-inset-bottom,16px)] animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-rim" aria-hidden="true" />
        </div>

        <div className="px-4 pb-2 pt-1">
          <p className="text-sm font-semibold text-ink mb-4">Añadir documento</p>

          <div className="space-y-2">
            <button
              onClick={handleImage}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface border border-rim hover:bg-surface2 active:scale-[0.98] transition-all text-left"
            >
              <span className="text-accent"><ImageIcon /></span>
              <div>
                <p className="text-sm font-medium text-ink">Imagen o PDF</p>
                <p className="text-xs text-dim mt-0.5">Desde archivos o cámara</p>
              </div>
            </button>

            <button
              onClick={handleAudio}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface border border-rim hover:bg-surface2 active:scale-[0.98] transition-all text-left"
            >
              <span className="text-accent"><AudioIcon /></span>
              <div>
                <p className="text-sm font-medium text-ink">Audio</p>
                <p className="text-xs text-dim mt-0.5">Transcripción con Whisper</p>
              </div>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-3 py-3 text-sm text-dim hover:text-ink transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/scanner/ScannerSheet.tsx
git commit -m "feat: add ScannerSheet — FAB source picker bottom sheet"
```

---

## Task 8: ProfileDrawer Component

**Files:**
- Create: `src/components/layout/ProfileDrawer.tsx`

Drawer from the right. Contains: Apariencia (theme + a11y), Seguridad (PIN), Modelos (embedded link to engines tab), Sobre Archivo.

- [ ] **Step 1: Create directory and component**

```bash
mkdir -p src/components/layout
```

Create `src/components/layout/ProfileDrawer.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import type { ThemeChoice } from '@/hooks/useTheme'
import type { A11yPrefs } from '@/hooks/useA11y'
import type { EngineStateMap } from '@/types/ocr'

interface Props {
  open: boolean
  onClose: () => void
  themeChoice: ThemeChoice
  onThemeChange: (c: ThemeChoice) => void
  a11y: A11yPrefs
  onA11yChange: (p: Partial<A11yPrefs>) => void
  onOpenModels: () => void
  onOpenSecurity: () => void
  embedStatus: string
  llmStatus: string
  rerankerStatus: string
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-widest text-dim mb-2 mt-5 first:mt-0">{children}</p>
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-rim last:border-0">
      <span className="text-sm text-ink">{label}</span>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function SegmentedControl<T extends string>({
  value, options, onChange,
}: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg border border-rim overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            value === opt.value
              ? 'bg-accent text-white'
              : 'text-dim hover:text-ink hover:bg-surface2'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

const statusDot = (s: string) => s === 'ready' ? '🟢' : s === 'loading' ? '🟡' : '⚪'

export default function ProfileDrawer({
  open, onClose, themeChoice, onThemeChange, a11y, onA11yChange,
  onOpenModels, onOpenSecurity, embedStatus, llmStatus, rerankerStatus,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-xs bg-base border-l border-rim h-full overflow-y-auto animate-slide-in-right">
        <div className="flex items-center justify-between p-4 border-b border-rim sticky top-0 bg-base z-10">
          <p className="font-semibold text-ink">Perfil</p>
          <button
            onClick={onClose}
            aria-label="Cerrar panel"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-dim hover:text-ink hover:bg-surface transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-4">
          <SectionLabel>Apariencia</SectionLabel>

          <OptionRow label="Tema">
            <SegmentedControl
              value={themeChoice}
              onChange={onThemeChange}
              options={[
                { value: 'light',  label: 'Claro'   },
                { value: 'dark',   label: 'Oscuro'  },
                { value: 'system', label: 'Sistema' },
              ]}
            />
          </OptionRow>

          <OptionRow label="Tamaño">
            <SegmentedControl
              value={a11y.textSize}
              onChange={(v) => onA11yChange({ textSize: v })}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'large',  label: 'Grande' },
              ]}
            />
          </OptionRow>

          <OptionRow label="Contraste">
            <SegmentedControl
              value={a11y.contrast}
              onChange={(v) => onA11yChange({ contrast: v })}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'high',   label: 'Alto'   },
              ]}
            />
          </OptionRow>

          <OptionRow label="Movimiento">
            <SegmentedControl
              value={a11y.motion}
              onChange={(v) => onA11yChange({ motion: v })}
              options={[
                { value: 'normal',  label: 'Normal'   },
                { value: 'reduced', label: 'Reducido' },
              ]}
            />
          </OptionRow>

          <SectionLabel>Seguridad</SectionLabel>
          <button
            onClick={() => { onClose(); onOpenSecurity() }}
            className="w-full flex items-center justify-between py-2.5 border-b border-rim text-sm text-ink hover:text-accent transition-colors"
          >
            <span>PIN y biometría</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          <SectionLabel>Modelos de IA</SectionLabel>
          <button
            onClick={() => { onClose(); onOpenModels() }}
            className="w-full flex items-center justify-between py-2.5 border-b border-rim text-sm text-ink hover:text-accent transition-colors"
          >
            <span>Gestionar modelos</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-dim">{statusDot(embedStatus)} {statusDot(llmStatus)} {statusDot(rerankerStatus)}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </button>

          <SectionLabel>Sobre Archivo</SectionLabel>
          <div className="space-y-1.5 text-sm text-dim">
            <p>Versión 1.0 · 100% local</p>
            <p className="text-xs leading-relaxed">
              Tu vault personal de documentos. Sin nube, sin suscripción, sin servidor.
              Todo corre en tu dispositivo.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add slide-in animation to globals.css**

In `src/app/globals.css`, in `@layer utilities`, add:
```css
  .animate-slide-in-right { animation: slide-in-right 0.25s cubic-bezier(0.32,0.72,0,1) both; }
```

And in the `@keyframes` section (or inside `@layer utilities`):
```css
  @keyframes slide-in-right {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/ProfileDrawer.tsx src/app/globals.css
git commit -m "feat: add ProfileDrawer — appearance, security, models, about"
```

---

## Task 9: Landing View

**Files:**
- Create: `src/components/home/LandingView.tsx`

Shown when `documents.length === 0`. Two-layer content: simple pitch + collapsible "Para nerds".

- [ ] **Step 1: Create home directory and component**

```bash
mkdir -p src/components/home
```

Create `src/components/home/LandingView.tsx`:

```tsx
'use client'

import { useState } from 'react'

interface Props {
  onOpenScanner: () => void
}

const features = [
  { icon: '📄', text: 'Escanea cualquier papel o PDF' },
  { icon: '🔍', text: 'Busca con lenguaje natural' },
  { icon: '🔒', text: 'Todo queda en tu dispositivo. En serio.' },
  { icon: '✈️', text: 'Funciona sin internet' },
]

const techDetails = [
  {
    title: 'Arquitectura',
    body: 'PWA offline-first. Todo corre en tu navegador — nada sale de tu dispositivo. Almacenamiento en IndexedDB.',
  },
  {
    title: 'OCR',
    body: 'Tesseract.js — port WASM del motor Tesseract. Soporte para español e inglés sin ningún servidor.',
  },
  {
    title: 'Embeddings',
    body: 'all-MiniLM-L6-v2 · 384 dimensiones via Transformers.js. No es el modelo más grande, pero es el más eficiente para búsqueda semántica local. Cabe en memoria, responde rápido.',
  },
  {
    title: 'LLM',
    body: 'Llama 3.2 1B / Qwen 0.5B — cuantizados (GGUF/Q4). Inferencia en WebGPU cuando está disponible, WASM como fallback.',
  },
  {
    title: 'Reranker',
    body: 'ms-marco-MiniLM-L-6-v2 cross-encoder. Reordena los resultados por relevancia real, no solo por similitud vectorial.',
  },
  {
    title: 'Audio',
    body: 'Whisper Tiny — 39M parámetros, decodificación a 16kHz. Transcripción local sin subir tu audio a ningún lado.',
  },
  {
    title: 'Búsqueda RAG',
    body: 'Pipeline BM25 + semántico + RRF fusion + reranking. Retrieval a nivel de fragmento (~350 chars/chunk) para mayor precisión en documentos largos.',
  },
  {
    title: 'Privacidad',
    body: 'Sin analytics, sin telemetría, sin cuentas. Así de simple.',
  },
]

export default function LandingView({ onOpenScanner }: Props) {
  const [nerdsOpen, setNerdsOpen] = useState(false)

  return (
    <div className="px-4 pt-10 pb-32 max-w-lg mx-auto animate-fade-in">
      {/* Logo + headline */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-5 shadow-md">
          <svg width="32" height="32" viewBox="0 0 64 64" aria-hidden="true">
            <rect x="14" y="8" width="26" height="34" rx="2" fill="white" opacity="0.95"/>
            <polygon points="40,8 40,17 49,17" fill="rgba(255,255,255,0.5)"/>
            <line x1="18" y1="21" x2="35" y2="21" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
            <line x1="18" y1="27" x2="35" y2="27" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
            <line x1="18" y1="33" x2="29" y2="33" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-ink">Tu vault personal de documentos.</h1>
        <p className="text-base text-dim mt-2">Sin nube. Sin suscripción.</p>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8" role="list">
        {features.map((f) => (
          <li key={f.text} className="flex items-start gap-3">
            <span className="text-xl leading-none mt-0.5" aria-hidden="true">{f.icon}</span>
            <span className="text-sm text-ink leading-relaxed">{f.text}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        onClick={onOpenScanner}
        className="w-full py-3.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark active:scale-[0.98] transition-all shadow-md"
      >
        Escanear mi primer documento
      </button>

      {/* Para nerds */}
      <div className="mt-8 border border-rim rounded-xl overflow-hidden">
        <button
          onClick={() => setNerdsOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium text-dim hover:text-ink transition-colors"
          aria-expanded={nerdsOpen}
        >
          <span>Para nerds — cómo funciona por dentro</span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"
            className={`transition-transform duration-200 ${nerdsOpen ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {nerdsOpen && (
          <div className="px-4 pb-4 border-t border-rim space-y-4 animate-fade-in">
            {techDetails.map((d) => (
              <div key={d.title}>
                <p className="text-xs font-semibold uppercase tracking-widest text-accent mt-4 mb-1">{d.title}</p>
                <p className="text-sm text-dim leading-relaxed">{d.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/LandingView.tsx
git commit -m "feat: add LandingView — pitch + Para nerds collapsible section"
```

---

## Task 10: OnboardingBanner

**Files:**
- Create: `src/components/home/OnboardingBanner.tsx`

Non-blocking progress banner shown at top of home when setup is incomplete. 4 steps: PWA install, PIN, Models, First scan. Persists state in localStorage.

- [ ] **Step 1: Create the component**

Create `src/components/home/OnboardingBanner.tsx`:

```tsx
'use client'

import { useState, useCallback } from 'react'

const STORAGE_KEY = 'archivo_onboarding'

interface OnboardingState {
  dismissed: boolean
  completedSteps: number[]
}

function readState(): OnboardingState {
  if (typeof window === 'undefined') return { dismissed: false, completedSteps: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { dismissed: false, completedSteps: [] }
    return JSON.parse(raw)
  } catch { return { dismissed: false, completedSteps: [] } }
}

function saveState(s: OnboardingState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}

export function markOnboardingStep(step: number) {
  const s = readState()
  if (!s.completedSteps.includes(step)) {
    s.completedSteps = [...s.completedSteps, step]
    saveState(s)
  }
}

const STEPS = [
  { id: 0, label: 'Instala la app',         hint: 'Añade Archivo a tu pantalla de inicio para acceso rápido.' },
  { id: 1, label: 'Crea tu PIN',             hint: 'Solo tú podrás abrir Archivo.' },
  { id: 2, label: 'Elige tus modelos',       hint: 'Descarga los modelos de IA que quieras usar.' },
  { id: 3, label: 'Escanea tu primer doc',   hint: 'Prueba el escáner — verás lo fácil que es.' },
]

interface Props {
  onOpenSecurity: () => void
  onOpenModels: () => void
  onOpenScanner: () => void
  hasDocuments: boolean
}

export default function OnboardingBanner({ onOpenSecurity, onOpenModels, onOpenScanner, hasDocuments }: Props) {
  const [state, setState] = useState<OnboardingState>(readState)
  const [expanded, setExpanded] = useState(false)

  const complete = useCallback((step: number) => {
    setState((prev) => {
      const next = { ...prev, completedSteps: [...new Set([...prev.completedSteps, step])] }
      saveState(next)
      return next
    })
  }, [])

  const dismiss = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, dismissed: true }
      saveState(next)
      return next
    })
  }, [])

  if (hasDocuments) complete(3)

  const allDone = STEPS.every((s) => state.completedSteps.includes(s.id))
  if (state.dismissed || allDone) return null

  const nextStep = STEPS.find((s) => !state.completedSteps.includes(s.id))
  if (!nextStep) return null

  const completedCount = state.completedSteps.length
  const progressPct = (completedCount / STEPS.length) * 100

  const handleStepAction = (stepId: number) => {
    if (stepId === 1) { onOpenSecurity(); complete(1) }
    else if (stepId === 2) { onOpenModels(); complete(2) }
    else if (stepId === 3) { onOpenScanner() }
    else {
      // PWA install — mark as done (user will handle it)
      complete(0)
    }
  }

  return (
    <div className="mx-4 mt-4 rounded-xl border border-accent/25 bg-accent/5 overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-accent">Configura Archivo</p>
          <p className="text-xs text-dim mt-0.5 truncate">{nextStep.label}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs font-medium text-accent hover:text-accent-dark transition-colors"
            aria-expanded={expanded}
          >
            {expanded ? 'Ocultar' : 'Ver'}
          </button>
          <button onClick={dismiss} aria-label="Cerrar onboarding" className="text-dim hover:text-ink transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-accent/10">
        <div
          className="h-full bg-accent transition-all duration-500"
          style={{ width: `${progressPct}%` }}
          role="progressbar"
          aria-valuenow={completedCount}
          aria-valuemax={STEPS.length}
        />
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-2 border-t border-accent/15 animate-fade-in">
          {STEPS.map((step) => {
            const done = state.completedSteps.includes(step.id)
            return (
              <button
                key={step.id}
                disabled={done}
                onClick={() => handleStepAction(step.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                  done ? 'opacity-50 cursor-default' : 'hover:bg-accent/8 active:scale-[0.99]'
                }`}
              >
                <span className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  done ? 'bg-accent border-accent' : 'border-rim'
                }`}>
                  {done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? 'text-dim line-through' : 'text-ink'}`}>{step.label}</p>
                  {!done && <p className="text-xs text-dim mt-0.5">{step.hint}</p>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/OnboardingBanner.tsx
git commit -m "feat: add OnboardingBanner — 4-step non-blocking setup guide"
```

---

## Task 11: Update DashboardView

**Files:**
- Modify: `src/components/dashboard/DashboardView.tsx`

Make it adaptive: when 0 docs it renders `LandingView`; when docs exist it shows the new dashboard layout (recientes + colecciones + list). Remove the reference to `'ocr'` tab — use `onOpenScanner` callback instead.

- [ ] **Step 1: Replace DashboardView.tsx**

```tsx
'use client'

import type { ScannedDocument, Collection } from '@/types/document'
import LandingView from '@/components/home/LandingView'
import OnboardingBanner from '@/components/home/OnboardingBanner'

const CATEGORY_LABELS: Record<string, string> = {
  factura: 'Factura',
  contrato: 'Contrato',
  médico: 'Médico',
  identidad: 'Identidad',
  seguro: 'Seguro',
  bancario: 'Bancario',
  hogar: 'Hogar',
  otro: 'Otro',
}

interface Props {
  documents: ScannedDocument[]
  collections: Collection[]
  onOpenScanner: () => void
  onOpenDoc: (id: string) => void
  onOpenSecurity: () => void
  onOpenModels: () => void
  onNavigateRag: () => void
}

function RecentCard({ doc, onOpen }: { doc: ScannedDocument; onOpen: () => void }) {
  const date = new Date(doc.createdAt).toLocaleDateString('es', { month: 'short', day: 'numeric' })
  return (
    <button
      onClick={onOpen}
      className="flex-shrink-0 w-32 text-left rounded-xl border border-rim bg-surface p-3 active:scale-[0.97] transition-transform"
    >
      {doc.imageDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={doc.imageDataUrl} alt="" aria-hidden="true" className="w-full h-20 object-cover rounded-lg mb-2 bg-surface2" />
      )}
      <p className="text-xs font-medium text-ink truncate leading-snug">{doc.title}</p>
      <p className="text-[10px] text-dim mt-0.5">{date}</p>
    </button>
  )
}

export default function DashboardView({ documents, collections, onOpenScanner, onOpenDoc, onOpenSecurity, onOpenModels, onNavigateRag }: Props) {
  if (documents.length === 0) {
    return (
      <>
        <OnboardingBanner
          onOpenSecurity={onOpenSecurity}
          onOpenModels={onOpenModels}
          onOpenScanner={onOpenScanner}
          hasDocuments={false}
        />
        <LandingView onOpenScanner={onOpenScanner} />
      </>
    )
  }

  const recent = [...documents].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8)
  const categoryCounts: Record<string, number> = {}
  for (const doc of documents) {
    const cat = doc.category ?? 'otro'
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1
  }

  return (
    <div className="pb-32 animate-fade-in">
      <OnboardingBanner
        onOpenSecurity={onOpenSecurity}
        onOpenModels={onOpenModels}
        onOpenScanner={onOpenScanner}
        hasDocuments
      />

      {/* Recientes */}
      <div className="mt-5 px-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-dim mb-3">Recientes</p>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 [&::-webkit-scrollbar]:hidden">
          {recent.map((doc) => (
            <RecentCard key={doc.id} doc={doc} onOpen={() => onOpenDoc(doc.id)} />
          ))}
        </div>
      </div>

      {/* Colecciones */}
      {collections.length > 0 && (
        <div className="mt-6 px-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-dim mb-3">Colecciones</p>
          <div className="flex flex-wrap gap-2">
            {collections.map((col) => (
              <span
                key={col.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
                style={{
                  backgroundColor: `${col.color}12`,
                  borderColor: `${col.color}35`,
                  color: col.color,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} aria-hidden="true" />
                {col.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {Object.keys(categoryCounts).length > 0 && (
        <div className="mt-6 px-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-dim mb-3">Por categoría</p>
          <div className="space-y-2">
            {Object.entries(categoryCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs text-dim w-24 flex-shrink-0 truncate">{CATEGORY_LABELS[cat] ?? cat}</span>
                  <div className="flex-1 bg-surface2 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${(count / documents.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-dim w-4 text-right font-mono">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-6 px-4 flex gap-3">
        <button
          onClick={onNavigateRag}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-rim bg-surface text-sm font-medium text-ink hover:bg-surface2 active:scale-[0.98] transition-all"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Buscar con IA
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardView.tsx
git commit -m "feat: DashboardView — adaptive landing/dashboard, collections, recientes"
```

---

## Task 12: Update DocumentCard

**Files:**
- Modify: `src/components/documents/DocumentCard.tsx`

Remove glassmorphism. Use new surface/rim token style. Add press animation.

- [ ] **Step 1: Update card className**

In `DocumentCard.tsx`, change line 39's `className`:

Old:
```tsx
className="card card-interactive flex gap-4 group relative"
```

New:
```tsx
className="flex gap-4 group relative rounded-xl border border-rim bg-surface active:scale-[0.99] transition-transform cursor-pointer p-4"
```

Also update the delete button hover classes (line 105) from:
```tsx
className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 focus:opacity-100 w-10 h-10 rounded-xl bg-white/5 hover:bg-err/15 hover:border-err/30 border border-transparent text-dim hover:text-err flex items-center justify-center transition-all"
```
to:
```tsx
className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 focus:opacity-100 w-8 h-8 rounded-lg bg-surface2 hover:bg-err/10 hover:border-err/20 border border-transparent text-dim hover:text-err flex items-center justify-center transition-all"
```

And update the thumbnail border (line 60) from `border-white/7` to `border-rim`.

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/documents/DocumentCard.tsx
git commit -m "style: DocumentCard — remove glassmorphism, use surface/rim tokens"
```

---

## Task 13: App.tsx — Full Rewire

**Files:**
- Modify: `src/components/App.tsx`

Wire: ProfileDrawer, ScannerSheet, useA11y, new DashboardView props, new TabBar props, remove SettingsModal (merged into ProfileDrawer). Keep existing logic — only change wiring.

- [ ] **Step 1: Add imports**

At the top of `App.tsx`, add:

```tsx
import { useA11y } from '@/hooks/useA11y'
import ProfileDrawer from '@/components/layout/ProfileDrawer'
import ScannerSheet from '@/components/scanner/ScannerSheet'
```

Remove the `SettingsModal` import (its functionality moves to ProfileDrawer).

- [ ] **Step 2: Add state and hooks inside App()**

After the existing hooks, add:

```tsx
const a11y = useA11y()
const [profileOpen, setProfileOpen] = useState(false)
const [scannerOpen, setScannerOpen] = useState(false)
const { choice: themeChoice, setThemeChoice } = useTheme()
```

Remove `const [settingsOpen, setSettingsOpen] = useState(false)`.

- [ ] **Step 3: Update handleTabChange to handle removed tabs**

The `home` and `rag` tabs remain. When `engines` is called (from ProfileDrawer), it still works as before.

Add a handler for the FAB:
```tsx
const handleFab = useCallback(() => setScannerOpen(true), [])

const handleScannerImage = useCallback(() => {
  setScannerOpen(false)
  handleTabChange('ocr')
}, [handleTabChange])

const handleScannerAudio = useCallback(() => {
  setScannerOpen(false)
  handleTabChange('ocr')
  // audio mode is triggered within OcrView — navigate there and let user select audio tab
}, [handleTabChange])
```

- [ ] **Step 4: Update header JSX**

Replace the current `<header>` content with:

```tsx
<header className="sticky top-0 z-40 border-b border-rim bg-base/95 backdrop-blur-sm">
  <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center flex-shrink-0" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 64 64">
          <rect x="14" y="8" width="26" height="34" rx="2" fill="white" opacity="0.95"/>
          <polygon points="40,8 40,17 49,17" fill="rgba(255,255,255,0.5)"/>
          <line x1="18" y1="21" x2="35" y2="21" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
          <line x1="18" y1="27" x2="35" y2="27" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
          <line x1="18" y1="33" x2="29" y2="33" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
        </svg>
      </div>
      <h1 className="text-base font-bold text-ink">Archivo</h1>
    </div>
    <div className="flex items-center gap-1">
      <button
        onClick={() => setSearchOpen(true)}
        aria-label="Buscar documentos (Cmd+K)"
        className="p-2 rounded-lg hover:bg-surface transition-colors text-dim hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </button>
      <button
        onClick={() => setProfileOpen(true)}
        aria-label="Perfil y ajustes"
        className="p-2 rounded-lg hover:bg-surface transition-colors text-dim hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </button>
    </div>
  </div>
</header>
```

- [ ] **Step 5: Update TabBar usage**

Update the bottom TabBar call:
```tsx
<TabBar variant="bottom" active={tab} onChange={handleTabChange} onFab={handleFab} fabPulse={documents.length === 0} />
```

Update the top TabBar call (desktop):
```tsx
<TabBar active={tab} onChange={handleTabChange} />
```

- [ ] **Step 6: Update DashboardView props in the home panel**

```tsx
<DashboardView
  documents={documents}
  collections={collections}
  onOpenScanner={handleFab}
  onOpenDoc={(id) => { setSelectedDocId(id); handleTabChange('documents') }}
  onOpenSecurity={() => { setProfileOpen(false); /* SettingsModal opens security */ }}
  onOpenModels={() => { setProfileOpen(false); handleTabChange('engines') }}
  onNavigateRag={() => handleTabChange('rag')}
/>
```

- [ ] **Step 7: Add ProfileDrawer and ScannerSheet to JSX**

After the `{searchOpen && ...}` block, add:

```tsx
<ProfileDrawer
  open={profileOpen}
  onClose={() => setProfileOpen(false)}
  themeChoice={themeChoice}
  onThemeChange={setThemeChoice}
  a11y={a11y.prefs}
  onA11yChange={a11y.update}
  onOpenModels={() => { setProfileOpen(false); handleTabChange('engines') }}
  onOpenSecurity={() => { setProfileOpen(false); setSettingsOpen(true) }}
  embedStatus={rag.embedStatus}
  llmStatus={rag.llmStatus}
  rerankerStatus={rag.rerankerStatus}
/>

<ScannerSheet
  open={scannerOpen}
  onClose={() => setScannerOpen(false)}
  onSelectImage={handleScannerImage}
  onSelectAudio={handleScannerAudio}
/>
```

Keep the existing `{settingsOpen && <SettingsModal ... />}` block for PIN/security (accessed from ProfileDrawer → Security).

Re-add `const [settingsOpen, setSettingsOpen] = useState(false)` since it's still needed for the SettingsModal.

- [ ] **Step 8: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors. Fix any remaining type mismatches.

- [ ] **Step 9: Commit**

```bash
git add src/components/App.tsx
git commit -m "feat: App.tsx — wire ProfileDrawer, ScannerSheet, useA11y, new nav"
```

---

## Task 14: Simplify DocumentEditor

**Files:**
- Modify: `src/components/documents/DocumentEditor.tsx`

Hide preprocessing panel, export options, and export history behind a `···` menu. Keep title, text area, and Save button always visible.

- [ ] **Step 1: Add overflow menu state**

At the top of the `DocumentEditor` component function, add:
```tsx
const [menuOpen, setMenuOpen] = useState(false)
```

- [ ] **Step 2: Wrap secondary panels**

Find any always-visible `<ImagePreprocessingPanel>`, export buttons, and `<ExportHistoryDrawer>` toggle. Wrap them in a conditional:
```tsx
{menuOpen && (
  <div className="border-t border-rim">
    {/* ImagePreprocessingPanel here */}
    {/* Export buttons here */}
  </div>
)}
```

- [ ] **Step 3: Add ··· button to header**

In the DocumentEditor header (near the back button and title), add:
```tsx
<button
  onClick={() => setMenuOpen((o) => !o)}
  aria-label="Más opciones"
  aria-expanded={menuOpen}
  className="p-2 rounded-lg text-dim hover:text-ink hover:bg-surface transition-colors"
>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
  </svg>
</button>
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/documents/DocumentEditor.tsx
git commit -m "feat: DocumentEditor — hide secondary panels behind ··· menu"
```

---

## Task 15: Simplify RagView

**Files:**
- Modify: `src/components/rag/RagView.tsx`

Hide model configuration sidebar behind a `⚙` icon. Clean up result cards.

- [ ] **Step 1: Add model config toggle state**

```tsx
const [showModelConfig, setShowModelConfig] = useState(false)
```

- [ ] **Step 2: Wrap model config panel**

Find the model status/selection section and wrap it:
```tsx
{showModelConfig && (
  <div className="border-b border-rim p-4 animate-fade-in">
    {/* existing model config content */}
  </div>
)}
```

- [ ] **Step 3: Add ⚙ toggle button**

In the RagView header row, add:
```tsx
<button
  onClick={() => setShowModelConfig((o) => !o)}
  aria-label="Configuración de modelos"
  aria-expanded={showModelConfig}
  className="p-2 rounded-lg text-dim hover:text-ink hover:bg-surface transition-colors"
>
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
</button>
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/rag/RagView.tsx
git commit -m "feat: RagView — hide model config behind gear icon"
```

---

## Task 16: Final Build Verification

**Files:** (none — verification only)

- [ ] **Step 1: Run type check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Successful build with no errors. Warnings about `@next/next/no-img-element` are acceptable (already present in codebase).

- [ ] **Step 3: Push to remote**

```bash
git push -u origin claude/local-ocr-webapp-NowwS
```

---

## Self-Review Notes

- **Task 9 / DashboardView** removed `onNavigate(tab)` in favor of specific callbacks (`onOpenScanner`, `onOpenSecurity`, `onOpenModels`, `onNavigateRag`) — matches new Tab structure where `ocr` is no longer a nav destination but a scanner action.
- **Task 13 / App.tsx** keeps `settingsOpen` for PIN/security (SettingsModal is not removed — accessed from ProfileDrawer's security button).
- **Engines tab** remains in the Tab type and Tab panels — it's just no longer in the bottom nav. ProfileDrawer and DashboardView navigate to it via `handleTabChange('engines')`.
- **a11y classes** are applied server-side via inline script in layout.tsx (Task 3) to prevent FOUC.
- **Reduced motion** applies both via `a11y-motion` class (manual) and `prefers-reduced-motion` media query (automatic).
