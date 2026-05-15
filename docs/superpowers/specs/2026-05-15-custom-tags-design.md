# Etiquetas Personalizadas — Design Spec

**Date:** 2026-05-15  
**Status:** Approved

---

## 1. Overview

El usuario puede añadir etiquetas libres (tags) a cada documento, además de la categoría auto-detectada. La lista de documentos ofrece filtrado por categoría y/o tags mediante un dropdown, y una barra de búsqueda unificada que cruza título, categoría y tags simultáneamente.

---

## 2. Tipo de datos

```typescript
// src/types/document.ts — modificar ScannedDocument:
export interface ScannedDocument {
  // ... campos existentes ...
  tags: string[]   // default [] — etiquetas libres definidas por el usuario
}
```

No se requiere migración de DB: IndexedDB es schema-less. Los documentos existentes sin `tags` devuelven `undefined`; el código lo trata como `[]`.

---

## 3. Editor de tags (`DocumentEditor`)

Sección "Etiquetas" bajo el título, antes del editor de texto:

- Lista de chips con la tag + botón ✕ para eliminar
- Input inline al final de los chips: el usuario escribe y pulsa Enter o coma para confirmar
- Autocompletado con tags existentes en otros documentos (extraídas de `documents`)
- Tags en minúsculas, sin duplicados, máx. 20 por documento
- Se guardan con `update(doc.id, { tags })`

```tsx
// src/components/documents/TagEditor.tsx — nuevo
interface Props {
  tags: string[]
  allTags: string[]        // todas las tags existentes (para autocomplete)
  onChange: (tags: string[]) => void
}
```

---

## 4. Filtrado en `DocumentList`

### 4a. Dropdown "Filtrar"

Botón "Filtrar" (icono funnel) a la derecha de la barra de búsqueda. Abre un dropdown con dos secciones:

```
Categoría
  ○ Todas
  ○ Factura  (N)
  ○ Contrato (N)
  ...

Etiquetas
  ☐ trabajo   (N)
  ☐ urgente   (N)
  ☐ 2024      (N)
  ...
```

- Categoría: selección única (radio)
- Tags: selección múltiple (checkboxes) — se aplica OR entre tags seleccionadas
- Badge numérico en el botón "Filtrar" indicando cuántos filtros activos hay

### 4b. Búsqueda unificada

Input de búsqueda existente (o nuevo si no existe) filtra en tiempo real por:
- `doc.title` (case-insensitive)
- `doc.category`
- `doc.tags` (cualquier tag que incluya el texto)

### 4c. Chips de filtros activos

Bajo la barra de búsqueda, chips mostrando los filtros activos con botón ✕ para quitarlos individualmente. Botón "Limpiar todo" si hay más de uno.

### 4d. Combinación

Los filtros (dropdown) y la búsqueda se combinan con AND: el documento debe pasar ambos filtros para aparecer.

---

## 5. Archivos

### Nuevos
| Archivo | Responsabilidad |
|---------|----------------|
| `src/components/documents/TagEditor.tsx` | Chips + input inline de edición de tags |
| `src/components/documents/FilterDropdown.tsx` | Dropdown categoría + tags |

### Modificados
| Archivo | Cambio |
|---------|--------|
| `src/types/document.ts` | Añadir `tags: string[]` a `ScannedDocument` |
| `src/components/documents/DocumentEditor.tsx` | Integrar `TagEditor` |
| `src/components/documents/DocumentList.tsx` | Integrar `FilterDropdown` + búsqueda unificada |
| `src/components/App.tsx` | Pasar `allTags` derivadas de `documents` al editor |

---

## 6. No-goals

- No indexar tags en IndexedDB (filtrado en memoria)
- No sugerir tags automáticamente con IA
- No tags globales/compartidas entre sesiones distintas
