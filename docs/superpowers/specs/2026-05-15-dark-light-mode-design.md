# Modo Oscuro/Claro — Design Spec

**Date:** 2026-05-15  
**Status:** Approved

---

## 1. Overview

La app soporta modo oscuro (default) y modo claro. Los colores se definen como CSS custom properties en `:root` (dark) y se sobreescriben con la clase `.light` en `<html>`. Tailwind consume las variables via `var()`. Un toggle en el header cambia el tema; la preferencia se persiste en `localStorage`. En la primera visita se respeta `prefers-color-scheme`.

---

## 2. CSS Custom Properties

En `globals.css`:

```css
:root {
  /* ── Backgrounds ───────────────────────────── */
  --color-void:    #04050b;
  --color-base:    #07080f;
  --color-surface: #0d1018;
  --color-surface2: #141926;
  --color-rim:     #1d2235;

  /* ── Accent ────────────────────────────────── */
  --color-accent:        #0d9488;
  --color-accent-light:  #2dd4bf;
  --color-accent-dark:   #0f766e;
  --color-accent-glow:   rgba(13,148,136,0.22);
  --color-accent-muted:  rgba(13,148,136,0.10);

  /* ── Text ──────────────────────────────────── */
  --color-ink:   #eaecf5;
  --color-dim:   #7880a0;
  --color-muted: #434c66;

  /* ── Semantic ──────────────────────────────── */
  --color-ok:   #22c55e;
  --color-err:  #f43f5e;
  --color-warn: #f59e0b;
  --color-info: #38bdf8;
}

html.light {
  --color-void:    #f0f2f8;
  --color-base:    #f8f9fc;
  --color-surface: #ffffff;
  --color-surface2: #eef0f6;
  --color-rim:     #dde1ee;

  --color-accent:        #0d9488;
  --color-accent-light:  #0f766e;
  --color-accent-dark:   #115e59;
  --color-accent-glow:   rgba(13,148,136,0.15);
  --color-accent-muted:  rgba(13,148,136,0.08);

  --color-ink:   #0f1117;
  --color-dim:   #4a5270;
  --color-muted: #9aa0bb;

  --color-ok:   #16a34a;
  --color-err:  #e11d48;
  --color-warn: #d97706;
  --color-info: #0284c7;
}
```

---

## 3. `tailwind.config.ts` — consumir variables

Reemplazar todos los valores hardcoded por referencias a variables CSS:

```typescript
colors: {
  void:    'var(--color-void)',
  base:    'var(--color-base)',
  surface: 'var(--color-surface)',
  surface2:'var(--color-surface2)',
  rim:     'var(--color-rim)',
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
  ok:    'var(--color-ok)',
  err:   'var(--color-err)',
  warn:  'var(--color-warn)',
  info:  'var(--color-info)',
}
```

Los nombres de clase de Tailwind (`bg-base`, `text-ink`, etc.) no cambian — solo su valor en tiempo de ejecución.

---

## 4. Script anti-flash en `layout.tsx`

Para evitar el flash de modo incorrecto antes de que React hidrate, se añade un script inline en `<head>`:

```tsx
// En src/app/layout.tsx, dentro de <head>:
<script dangerouslySetInnerHTML={{ __html: `
  (function() {
    var stored = localStorage.getItem('papeleo_theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'light' || (!stored && !prefersDark)) {
      document.documentElement.classList.add('light');
    }
  })();
` }} />
```

---

## 5. Hook `useTheme`

```typescript
// src/hooks/useTheme.ts — nuevo
export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark'
    return localStorage.getItem('papeleo_theme') as 'dark' | 'light'
      ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  })

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('papeleo_theme', next)
      document.documentElement.classList.toggle('light', next === 'light')
      return next
    })
  }, [])

  return { theme, toggle }
}
```

---

## 6. Toggle en el header

En `App.tsx`, en el header junto a `InstallButton`:

```tsx
<button onClick={toggle} aria-label="Cambiar tema" className="p-2 rounded-lg hover:bg-white/5 transition-colors text-dim hover:text-ink">
  {theme === 'dark'
    ? <SunIcon width={16} height={16} />      // ☀️ en modo oscuro → cambiar a claro
    : <MoonIcon width={16} height={16} />     // 🌙 en modo claro → cambiar a oscuro
  }
</button>
```

---

## 7. Glassmorphism en light mode

Las clases `bg-white/5`, `bg-white/8`, `border-white/7` (que usan canales alpha sobre blanco) se ven mal en light mode porque el fondo ya es blanco.

Solución: añadir variables CSS para los colores semi-transparentes usados en glassmorphism:

```css
:root {
  --glass-bg: rgba(255,255,255,0.05);
  --glass-border: rgba(255,255,255,0.07);
}
html.light {
  --glass-bg: rgba(0,0,0,0.04);
  --glass-border: rgba(0,0,0,0.08);
}
```

Y en Tailwind config añadir:

```typescript
glass: {
  bg: 'var(--glass-bg)',
  border: 'var(--glass-border)',
}
```

Los componentes que usan `bg-white/5` y `border-white/7` se migran a `bg-glass-bg` y `border-glass-border` donde sea relevante para el look glassmorphism (header, cards, modales).

---

## 8. Archivos

### Nuevos
| Archivo | Responsabilidad |
|---------|----------------|
| `src/hooks/useTheme.ts` | Estado tema, toggle, persistencia |

### Modificados
| Archivo | Cambio |
|---------|--------|
| `src/app/globals.css` | Variables CSS `:root` + `.light` |
| `tailwind.config.ts` | Colores → `var(--color-*)` |
| `src/app/layout.tsx` | Script anti-flash en `<head>` |
| `src/components/App.tsx` | Integrar `useTheme`, añadir toggle en header |

---

## 9. No-goals

- No tema automático que cambia con el horario
- No temas personalizados (solo dark/light)
- No migrar clases `dark:` de Tailwind (usamos CSS variables, no el modo `class` de Tailwind)
