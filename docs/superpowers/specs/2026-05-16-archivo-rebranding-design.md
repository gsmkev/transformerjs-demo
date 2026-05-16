# Archivo — Rebranding & UX Redesign Spec

**Date:** 2026-05-16  
**Scope:** Complete UI/UX redesign of Papeleo PWA → Archivo  
**Target user:** Personal users — warm, simple, accessible copy  
**Constraint:** 100% local, no new backend dependencies

---

## 1. Identity

### Name & Tagline
- **App name:** Archivo
- **Tagline:** *Tu vault personal de documentos.*
- **Sub-tagline (landing):** *Sin nube. Sin suscripción.*

### Personality
- Simple and clear for regular users
- Technically honest and humble for power users
- Never boastful — show facts, not claims
- Warm but not playful; professional but not corporate

---

## 2. Visual Identity

### Color Palette — Light Mode

| Token | Value | Usage |
|---|---|---|
| `bg-base` | `#FFFFFF` | Page background |
| `bg-subtle` | `#F7F7F8` | Cards, sections |
| `border` | `#E4E4E7` | Dividers, input borders |
| `text-primary` | `#18181B` | Body text, titles |
| `text-secondary` | `#71717A` | Labels, metadata |
| `text-dim` | `#A1A1AA` | Placeholders, hints |
| `accent` | `#4F46E5` | Buttons, FAB, active states |
| `accent-hover` | `#4338CA` | Hover/press on accent |
| `accent-subtle` | `#EEF2FF` | Badges, tag backgrounds |
| `success` | `#16A34A` | Confirmations |
| `error` | `#DC2626` | Errors |
| `warning` | `#D97706` | Warnings |

### Color Palette — Dark Mode (sobrio)

| Token | Value | Usage |
|---|---|---|
| `bg-base` | `#0F0F11` | Page background |
| `bg-subtle` | `#1C1C1E` | Cards, sections |
| `border` | `#2C2C2E` | Dividers |
| `text-primary` | `#F5F5F5` | Body text |
| `text-secondary` | `#98989E` | Labels |
| `text-dim` | `#636366` | Placeholders |
| `accent` | `#818CF8` | indigo-400 (lighter for dark contrast) |
| `accent-subtle` | `#1E1B4B` | Badges in dark mode |

Dark mode activates via: (1) `prefers-color-scheme: dark` system preference, (2) manual toggle in profile drawer persisted to `localStorage`. Applied as `dark` class on `<html>`.

### Typography
- **Font:** Inter via `next/font/google`
- **Titles:** `font-semibold`, normal tracking
- **Body:** `font-normal`, `text-sm` / `text-base`
- **Meta/labels:** `text-xs text-secondary`
- **No uppercase styling** — no `uppercase tracking-widest`

### Shape & Spacing
- Card border radius: `rounded-xl` (12px)
- Button/input border radius: `rounded-lg` (8px)
- Badge/FAB border radius: `rounded-full`
- Card padding: `p-4` consistent
- Section gaps: `gap-3` or `gap-4`
- **No glassmorphism** — no `backdrop-blur`, no `bg-opacity`
- **No large shadows** — only `shadow-sm` on elevated cards

### Icons
Lucide React — stroke style, `size-4` or `size-5`, never filled variants.

---

## 3. Accessibility

Four accessibility modes, persisted in `localStorage`, applied as classes on `<html>`:

| Mode | Class | Effect |
|---|---|---|
| Large text | `a11y-large` | Base font `16px → 19px` (all rem scales) |
| High contrast | `a11y-contrast` | Pure black/white backgrounds, thicker borders, no mid-grays |
| Reduced motion | `a11y-motion` | Disable all transitions, springs, entrance animations |
| Color-safe | always on | Never use color alone to convey state — always pair with icon or label |

All four options live in the Profile Drawer under **Apariencia**:

```
━━ Apariencia ━━━━━━━━━━━━━
  Tema      [Claro · Oscuro · Sistema]
  Tamaño    [Normal · Grande]
  Contraste [Normal · Alto]
  Movimiento[Normal · Reducido]
```

All motion code checks `a11y-motion` class and `prefers-reduced-motion` media query before running animations.

---

## 4. Navigation Architecture

### Structure
```
┌─────────────────────────────────┐
│  Archivo              [avatar]  │  ← Fixed header
├─────────────────────────────────┤
│                                 │
│         Main content            │
│                                 │
├─────────────────────────────────┤
│  [📄 Docs]  [🔍 Buscar]  [⊕]  │  ← Bottom nav, 3 tabs
└─────────────────────────────────┘
```

### Tabs
- **Docs** — document list/grid with collections
- **Buscar** — RAG semantic search (full tab, not modal)
- **⊕ FAB** — central floating action button, opens source picker sheet

### Profile Drawer (avatar top-right)
- User info / app name
- Apariencia (theme, text size, contrast, motion)
- Seguridad (PIN, biometrics)
- Modelos (LLM, embedder, reranker, Whisper — download status)
- Sobre Archivo (version, open source link, "Para nerds" extended)

### Eliminated from current nav
- ❌ Settings tab
- ❌ Audio tab (integrated into FAB source picker)
- ❌ Stacked modals
- ❌ Always-visible preprocessing panel

---

## 5. Landing Page

The landing is the first screen all users see. It explains the product in two layers.

### Layer 1 — Simple pitch
```
[Logo] Archivo

Tu vault personal de documentos.
Sin nube. Sin suscripción.

✦  Escanea cualquier papel o PDF
✦  Busca con lenguaje natural
✦  Todo queda en tu dispositivo
✦  Funciona sin internet

[  Abrir mis documentos  ]   ← primary CTA
```

Copy principles:
- Lead with user benefit, not feature name
- "En serio." — occasional conversational emphasis to build trust
- Short sentences, max 8 words per bullet

### Layer 2 — Para nerds (collapsible)
Expands below the CTA. Tone: technically honest, humble, no inflation.

Sections:
- **Arquitectura** — offline-first PWA, nothing leaves the device, IndexedDB storage
- **OCR** — Tesseract.js (WASM port), eng/spa, no server
- **Embeddings** — all-MiniLM-L6-v2, 384 dims, local via Transformers.js. "Not the largest model, but the most efficient for local semantic search."
- **LLM** — Llama 3.2 1B / Qwen 0.5B, quantized GGUF/Q4, WebGPU when available, WASM fallback
- **Reranker** — ms-marco-MiniLM-L-6-v2 cross-encoder for result ordering
- **Audio** — Whisper Tiny, 39M params, 16kHz decoding
- **RAG pipeline** — BM25 + semantic + RRF fusion + reranking, chunk-level retrieval (~350 chars/chunk)
- **Privacidad** — no analytics, no telemetry, no accounts

Example tone for "Para nerds":
> *"Usamos all-MiniLM-L6-v2 — no es el modelo más grande, pero es el más eficiente para búsqueda semántica en local. Cabe en memoria, responde rápido, y en documentos cortos supera a modelos 10× más pesados."*

---

## 6. Adaptive Home

The home transitions from landing to dashboard when `documents.length > 0` (IndexedDB). No dependency on onboarding completion — a user who skips onboarding and scans directly still gets the dashboard.

### Dashboard layout
```
┌─────────────────────────────────┐
│  Archivo              [avatar]  │
│  [🔍 Busca en tus documentos ] │  ← searchbar in header
├─────────────────────────────────┤
│  Recientes                      │
│  [card] [card] [card] →         │  ← horizontal scroll
│                                 │
│  Colecciones                    │
│  ● Contratos  ● Facturas        │
│                                 │
│  Todos los documentos      [⊞]  │
│  [doc card]                     │
│  [doc card]                     │
└─────────────────────────────────┘
```

---

## 7. Onboarding Flow

Shown as a **non-blocking banner card** at the top of the home when setup is incomplete. User can dismiss or skip steps.

### Banner (collapsed)
```
Configura Archivo en 4 pasos
━━━━━━░░░░░░  Paso 1 de 4
[  Continuar  ]  [Ahora no]
```

### 4 steps (each in a bottom sheet modal)

**Paso 1 — Instala la app**
- Detect browser and show specific PWA install instructions (Chrome: address bar icon, Safari: Share → Add to Home Screen, Firefox: install prompt)
- Skip option always visible

**Paso 2 — Crea tu PIN**
- 6-digit PIN input
- Optional biometric toggle (if `PublicKeyCredential` available)
- Friendly copy: *"Solo tú podrás abrir Archivo."*

**Paso 3 — Elige tus modelos**
- Grouped by capability: LLM, Embedder, Reranker, Audio
- Each shows: model name, size in MB, what it enables
- Download progress bar per model
- Can skip: *"Puedes descargarlos después desde tu perfil."*

**Paso 4 — Escanea tu primer documento**
- Mini hands-on tutorial — opens scanner directly
- On first save → subtle confetti animation
- Step auto-completes on save

---

## 8. Key Screen Designs

### Document Editor (simplified)
**Always visible:**
- Large editable title
- OCR text in main area
- `Guardar` button (only when changes exist)
- Assigned collection as subtle badge

**Hidden by default (behind `···` menu):**
- Image preprocessing sliders
- Export options
- Export history
- Annotations panel

### Scanner (FAB sheet)
Source picker:
```
╌╌╌╌╌╌  (drag handle)
Añadir documento

[📷  Cámara / Imagen]
[📄  PDF]
[🎙  Audio]

[  Cancelar  ]
```

### Search / RAG
- No model config sidebar by default — behind `⚙` icon inside the tab
- Results as clean cards: title + highlighted excerpt + "Ver documento" button
- Skeleton shimmer while processing (not spinner)

---

## 9. Micro-interactions & Motion

All animations respect `prefers-reduced-motion` and `a11y-motion` class. When either is active: fade only, no transforms or springs.

### Timing scale
- Instant feedback: 100–150ms
- Navigation / sheet: 250–300ms `ease-out`
- Entrance animations: 200ms per element, 40–50ms stagger

### Specific interactions

| Interaction | Animation |
|---|---|
| FAB press | `scale(0.94)` → return 150ms spring |
| Sheet open | slide-up 280ms `ease-out` |
| Sheet close | slide-down 200ms `ease-in` |
| Card press | `scale(0.98)` → return 150ms |
| Card list entrance | `fade + translateY(8px)` staggered 40ms |
| Card delete | `translateX(-100%) + fade` then collapse height |
| Onboarding step complete | Check mark draws with spring, progress bar eases |
| First document saved | Confetti (subtle, 1.5s, then gone) |
| Save confirmation | Bottom toast "Guardado ✓", disappears in 2s |
| Search results | Skeleton shimmer → fade-in staggered cards |
| FAB idle pulse | Subtle scale pulse every 30s if no documents yet |

---

## 10. Copy Principles

### For regular users
- Max 8 words per bullet
- Active voice, present tense
- Avoid jargon: say "buscar" not "query", "documentos" not "assets"
- Occasional conversational markers: "En serio.", "Así de simple."

### For "Para nerds"
- State facts: model name, param count, architecture
- Acknowledge trade-offs honestly: *"No es el modelo más grande, pero..."*
- No superlatives: avoid "best", "revolutionary", "state of the art"
- Show what makes it genuinely interesting: offline inference, WebGPU, privacy

---

## 11. Files to Create / Modify

| File | Action |
|---|---|
| `src/app/globals.css` | New design tokens (CSS vars), dark/a11y classes |
| `src/app/layout.tsx` | Inter font, `<html>` class management |
| `src/components/layout/Header.tsx` | New minimal header with avatar |
| `src/components/layout/BottomNav.tsx` | 3-tab bottom nav with FAB |
| `src/components/layout/ProfileDrawer.tsx` | Settings/appearance drawer |
| `src/components/home/LandingView.tsx` | Landing + "Para nerds" collapsible |
| `src/components/home/OnboardingBanner.tsx` | 4-step onboarding banner + sheets |
| `src/components/home/DashboardView.tsx` | Adaptive dashboard (recientes + colecciones) |
| `src/components/scanner/ScannerSheet.tsx` | FAB source picker sheet |
| `src/components/documents/DocumentList.tsx` | Refactored list with new card style |
| `src/components/documents/DocumentEditor.tsx` | Simplified editor (hide panels behind ···) |
| `src/components/rag/RagView.tsx` | Simplified search tab |
| `src/hooks/useA11y.ts` | Accessibility preferences hook |
| `src/hooks/useTheme.ts` | Theme (light/dark/system) hook |
| `public/manifest.json` | Update app name to "Archivo" |
| `src/app/page.tsx` | Wire adaptive home logic |

---

## 12. Out of Scope (v1)

- Dyslexia-friendly font option
- Sepia mode
- Gesture zoom
- Multi-language UI (app stays in Spanish)
- Accounts / sync
