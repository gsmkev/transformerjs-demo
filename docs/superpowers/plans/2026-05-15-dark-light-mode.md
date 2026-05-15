# Dark/Light Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support a light color theme alongside the existing dark theme, toggled by a sun/moon button in the header. Preference persists in `localStorage` and defaults to `prefers-color-scheme`.

**Architecture:** All color values move from hardcoded hex in `tailwind.config.ts` to CSS custom properties in `globals.css`. A `html.light` class overrides those variables with a light palette. A script inline in `layout.tsx` reads `localStorage` before first render to avoid flash. A `useTheme` hook manages the toggle. Glassmorphism `bg-white/5` / `border-white/7` utilities migrate to `bg-glass-bg` / `border-glass-border` variables that also adapt to the theme.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v3 (CSS custom properties, no `darkMode: 'class'` strategy)

---

### Task 1: CSS custom properties in `globals.css`

**Files:**
- Modify: `src/app/globals.css`

**Context:** `globals.css` currently has keyframe animations and Tailwind directives. Add CSS variables at the top, before `@tailwind base`.

- [ ] **Step 1: Add `:root` and `.light` variable blocks**

Insert at the very top of `globals.css`, before any existing content:

```css
/* ── Theme tokens ───────────────────────────────────────────────────── */
:root {
  --color-void:     #04050b;
  --color-base:     #07080f;
  --color-surface:  #0d1018;
  --color-surface2: #141926;
  --color-rim:      #1d2235;

  --color-accent:       #0d9488;
  --color-accent-light: #2dd4bf;
  --color-accent-dark:  #0f766e;
  --color-accent-glow:  rgba(13,148,136,0.22);
  --color-accent-muted: rgba(13,148,136,0.10);

  --color-ink:   #eaecf5;
  --color-dim:   #7880a0;
  --color-muted: #434c66;

  --color-ok:   #22c55e;
  --color-err:  #f43f5e;
  --color-warn: #f59e0b;
  --color-info: #38bdf8;

  --glass-bg:     rgba(255,255,255,0.05);
  --glass-border: rgba(255,255,255,0.07);
}

html.light {
  --color-void:     #f0f2f8;
  --color-base:     #f8f9fc;
  --color-surface:  #ffffff;
  --color-surface2: #eef0f6;
  --color-rim:      #dde1ee;

  --color-accent:       #0d9488;
  --color-accent-light: #0f766e;
  --color-accent-dark:  #115e59;
  --color-accent-glow:  rgba(13,148,136,0.15);
  --color-accent-muted: rgba(13,148,136,0.08);

  --color-ink:   #0f1117;
  --color-dim:   #4a5270;
  --color-muted: #9aa0bb;

  --color-ok:   #16a34a;
  --color-err:  #e11d48;
  --color-warn: #d97706;
  --color-info: #0284c7;

  --glass-bg:     rgba(0,0,0,0.04);
  --glass-border: rgba(0,0,0,0.08);
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors (CSS change only, no TS impact).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: CSS custom properties for theme tokens (dark default + light overrides)"
```

---

### Task 2: Update `tailwind.config.ts` to consume CSS variables

**Files:**
- Modify: `tailwind.config.ts`

**Context:** The current config has hardcoded hex values. Replace every color value with `var(--color-*)`. Also add the `glass` colors. The class names (`bg-base`, `text-ink`, etc.) do not change — only their runtime values change.

- [ ] **Step 1: Replace color values in `tailwind.config.ts`**

In `tailwind.config.ts`, replace the entire `colors` block inside `theme.extend` with:

```typescript
colors: {
  void:     'var(--color-void)',
  base:     'var(--color-base)',
  surface:  'var(--color-surface)',
  surface2: 'var(--color-surface2)',
  rim:      'var(--color-rim)',

  accent: {
    DEFAULT: 'var(--color-accent)',
    light:   'var(--color-accent-light)',
    dark:    'var(--color-accent-dark)',
    glow:    'var(--color-accent-glow)',
    muted:   'var(--color-accent-muted)',
  },

  ink:   'var(--color-ink)',
  dim:   'var(--color-dim)',
  muted: 'var(--color-muted)',

  ok:   'var(--color-ok)',
  err:  'var(--color-err)',
  warn: 'var(--color-warn)',
  info: 'var(--color-info)',

  glass: {
    bg:     'var(--glass-bg)',
    border: 'var(--glass-border)',
  },
},
```

- [ ] **Step 2: Build to verify Tailwind processes the variables**

```bash
npm run build
```

Expected: Clean build. Colors still display correctly in dark mode (variables resolve to original dark values).

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat: tailwind colors consume CSS custom properties"
```

---

### Task 3: Migrate glassmorphism utilities

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/App.tsx`
- Modify: `src/components/ui/Button.tsx` (if it uses `bg-white/5`)
- Modify: `src/components/rag/RagView.tsx` (if relevant)

**Context:** Components use `bg-white/5`, `bg-white/7`, `bg-white/8`, `border-white/7`, `border-white/5`, `border-white/10` for glassmorphism. In light mode, these become invisible (white-on-white). We replace the most structurally important ones with `bg-glass-bg` and `border-glass-border`.

Find all occurrences:

```bash
grep -rn "bg-white/\|border-white/" src/components/ src/app/ --include="*.tsx" --include="*.css" | grep -v "node_modules"
```

- [ ] **Step 1: Search for glassmorphism classes**

```bash
grep -rn "bg-white/[0-9]\|border-white/[0-9]" src/ --include="*.tsx" --include="*.css"
```

Review the output. The key structural surfaces are: header `bg-base/80`, tab bars, cards, modals. Those using `bg-white/5` as surface background need migration.

- [ ] **Step 2: Update `globals.css` — replace `.card` and key utility classes**

In `globals.css`, find the `.card` class definition (if it exists as a `@apply` rule) and update it. If cards use `bg-white/5`, update to `bg-glass-bg`. If the card class is inline in components, we handle those individually.

Check for a `.card` rule:
```bash
grep -n "\.card" src/app/globals.css
```

If found, update `border-white/7` → `border border-[var(--glass-border)]` and `bg-white/5` → `bg-[var(--glass-bg)]` in that rule.

- [ ] **Step 3: Update `App.tsx` header and tab bar backgrounds**

In `App.tsx`, the header uses `bg-base/80` — this already works with CSS variables. The tab bars use `bg-base/80` as well. These are fine.

Any `border-white/7` in the header: replace with `border-[var(--glass-border)]`.

```bash
grep -n "border-white\|bg-white" src/components/App.tsx
```

Replace occurrences in the header `<header>` element:
- `border-white/7` → `border-[var(--glass-border)]`
- `border-white/5` → `border-[var(--glass-border)]`

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 5: Commit**

```bash
git add src/components/App.tsx src/app/globals.css
git commit -m "feat: migrate glassmorphism classes to CSS variable utilities"
```

---

### Task 4: Anti-flash script in `layout.tsx`

**Files:**
- Modify: `src/app/layout.tsx`

**Context:** Without this script, the page briefly renders in dark mode before React hydrates and reads `localStorage`. The inline script runs synchronously before first paint.

- [ ] **Step 1: Add inline script to `layout.tsx`**

Read `src/app/layout.tsx` and add inside `<head>`:

```tsx
<script dangerouslySetInnerHTML={{ __html: `(function(){var s=localStorage.getItem('papeleo_theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='light'||(s===null&&!d)){document.documentElement.classList.add('light');}})();` }} />
```

This goes before any other `<link>` or `<style>` tags in `<head>`.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: anti-flash script reads theme from localStorage before first paint"
```

---

### Task 5: `useTheme` hook

**Files:**
- Create: `src/hooks/useTheme.ts`

**Context:** Manages theme state, toggle function, and localStorage persistence. Reading `document.documentElement` is safe here because this hook runs only on the client.

- [ ] **Step 1: Create `useTheme.ts`**

```typescript
// src/hooks/useTheme.ts
'use client'

import { useState, useCallback } from 'react'

export type Theme = 'dark' | 'light'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem('papeleo_theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('papeleo_theme', next)
      document.documentElement.classList.toggle('light', next === 'light')
      return next
    })
  }, [])

  return { theme, toggle }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTheme.ts
git commit -m "feat: useTheme hook — toggle with localStorage persistence"
```

---

### Task 6: Theme toggle in header

**Files:**
- Modify: `src/components/App.tsx`

**Context:** Add the sun/moon toggle button to the header, between the logo and `InstallButton`. Use `useTheme`.

- [ ] **Step 1: Update `App.tsx`**

1. Import `useTheme`:
```tsx
import { useTheme } from '@/hooks/useTheme'
```

2. Inside the component, after the other hooks:
```tsx
const { theme, toggle } = useTheme()
```

3. In the header, add the toggle button between the logo `<div>` and `<InstallButton />`:
```tsx
<button
  onClick={toggle}
  aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
  className="p-2 rounded-lg hover:bg-white/5 transition-colors text-dim hover:text-ink flex-shrink-0"
>
  {theme === 'dark' ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )}
</button>
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 4: Commit**

```bash
git add src/components/App.tsx
git commit -m "feat: sun/moon theme toggle in header"
```
