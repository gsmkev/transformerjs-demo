# Búsqueda Global — Design Spec

**Date:** 2026-05-15  
**Status:** Approved

---

## 1. Overview

Un overlay de búsqueda fullscreen accesible desde cualquier tab mediante un icono 🔍 en el header o el atajo `Cmd/Ctrl+K`. Busca sobre `rawText` de todos los documentos usando BM25 y muestra resultados con snippet contextual. Al hacer click en un resultado navega directamente al DocumentEditor.

---

## 2. Acceso

- Icono 🔍 añadido al header (entre el logo y InstallButton)
- Atajo de teclado: `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux) — listener global en `App.tsx`
- El overlay se cierra con `Escape` o click fuera

---

## 3. Archivos

### Nuevos
| Archivo | Responsabilidad |
|---------|----------------|
| `src/components/search/SearchOverlay.tsx` | Overlay completo: input, resultados, estados vacío/sin-resultados |
| `src/lib/searchIndex.ts` | Wrapper del BM25 existente para búsqueda sobre documentos |

### Modificados
| Archivo | Cambio |
|---------|--------|
| `src/components/App.tsx` | Estado `searchOpen`, listener `Cmd/Ctrl+K`, render `<SearchOverlay>` |
| `src/components/ui/Header.tsx` (o inline en App) | Añadir botón 🔍 |

---

## 4. Lógica de búsqueda (`searchIndex.ts`)

```typescript
export interface SearchResult {
  doc: ScannedDocument
  snippet: string   // ~100 chars con contexto alrededor del match
  score: number
}

export function searchDocuments(query: string, documents: ScannedDocument[]): SearchResult[]
```

- Construye un `BM25Index` (ya existe en `src/services/bm25.ts`) sobre `doc.rawText` de todos los documentos
- El índice se reconstruye en cada llamada — documentos cambian raramente, el coste es despreciable (<5ms para <200 docs)
- Devuelve top 10 resultados ordenados por score
- **Snippet:** localiza la primera ocurrencia del término en `rawText`, extrae 50 chars antes + 50 chars después; reemplaza el término con marcador para resaltado

---

## 5. UI del overlay

```
┌─────────────────────────────────────────────┐
│  🔍  [Buscar en tus documentos...      ] ✕  │
├─────────────────────────────────────────────┤
│  Resultado 1                                 │
│  Título del documento · 📁 Factura · 12 may │
│  "…texto con el **término** encontrado…"    │
│                                              │
│  Resultado 2                                 │
│  ...                                         │
└─────────────────────────────────────────────┘
```

- **Fondo:** `fixed inset-0 z-50 bg-black/60 backdrop-blur-sm`
- **Panel:** `max-w-xl mx-auto mt-20 rounded-2xl card-elevated`
- **Input:** autofocus al abrir, `text-sm`, debounce 200ms
- **Resultados:** lista scrollable `max-h-[60vh]`
- **Cada resultado:**
  - Línea 1: `font-semibold text-ink` — título del documento
  - Línea 2: `text-xs text-dim` — categoría (emoji + label) + fecha
  - Línea 3: `text-xs text-dim/80 italic` — snippet con el término en `<mark>` (clase `bg-accent/20 text-accent rounded px-0.5`)
  - `hover:bg-white/5 cursor-pointer rounded-xl px-4 py-3 transition-colors`
- **Estado vacío** (query < 2 chars): "Escribe para buscar en tus documentos"
- **Sin resultados:** "No se encontraron documentos para «{query}»"

---

## 6. Navegación al resultado

Al hacer click en un resultado:
1. Cerrar overlay (`setSearchOpen(false)`)
2. Llamar `handleTabChange('documents')` 
3. Llamar `setSelectedDocId(doc.id)` — abre DocumentEditor directamente

Esto requiere que `SearchOverlay` reciba `onNavigate: (docId: string) => void` como prop.

---

## 7. No-goals

- No búsqueda semántica (eso ya lo hace el RAG chat)
- No resaltado dentro del DocumentEditor al abrir
- No búsqueda incremental letra-a-letra sin debounce
- No persistir historial de búsquedas
