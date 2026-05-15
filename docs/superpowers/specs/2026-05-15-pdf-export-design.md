# PDF Export — Design Spec

**Date:** 2026-05-15  
**Status:** Approved

---

## 1. Overview

El usuario puede exportar cualquier documento como PDF directamente desde DocumentEditor usando `window.print()`. Un checkbox permite incluir o no la imagen original del documento escaneado. Sin dependencias nuevas.

---

## 2. UI en `DocumentEditor`

Botón "PDF" junto a los botones de export Word/ODT existentes (área de acciones del documento).

Click abre un pequeño popover/modal inline con:

```
┌──────────────────────────────────┐
│  Exportar como PDF               │
│                                  │
│  ☑ Incluir imagen original       │
│                                  │
│  [Cancelar]  [Imprimir / PDF]    │
└──────────────────────────────────┘
```

- Checkbox "Incluir imagen original": marcado por defecto
- Al pulsar "Imprimir / PDF": prepara el área de impresión y llama `window.print()`

---

## 3. Área de impresión

Un `<div id="papeleo-print-area">` se renderiza siempre en el DOM pero oculto visualmente (`hidden print:block` con Tailwind print variant). Contiene:

```html
<div id="papeleo-print-area">
  <!-- Si includeImage: -->
  <img src="{doc.imageDataUrl}" alt="{doc.title}" />

  <h1>{doc.title}</h1>
  <p class="meta">{category} · {date}</p>
  <hr />

  <!-- richText renderizado como HTML -->
  <div class="content">...</div>
</div>
```

El richText (Tiptap JSON) se convierte a HTML limpio para impresión usando un helper `richTextToHtml(richText: string): string` — que serializa el JSON de Tiptap a HTML básico (párrafos, negritas, listas).

---

## 4. CSS `@media print`

En `globals.css`:

```css
@media print {
  /* Ocultar toda la UI de la app */
  body > * { display: none !important; }

  /* Mostrar solo el área de impresión */
  #papeleo-print-area {
    display: block !important;
    color: #000 !important;
    background: #fff !important;
    font-family: Georgia, serif;
    font-size: 12pt;
    line-height: 1.6;
    padding: 2cm;
  }

  #papeleo-print-area img {
    max-width: 100%;
    page-break-after: always;
  }

  #papeleo-print-area .meta {
    font-size: 10pt;
    color: #666;
  }
}
```

---

## 5. Implementación

```typescript
// src/components/documents/PrintArea.tsx — nuevo
// Componente que renderiza el área de impresión fuera del flujo visual
// Recibe doc + includeImage (controlado por el estado del modal)

// src/components/documents/PdfExportModal.tsx — nuevo  
// Modal pequeño con checkbox + botón imprimir
// Al confirmar: actualiza PrintArea y llama window.print()
```

El flujo en DocumentEditor:

1. Click "PDF" → abre `PdfExportModal`
2. Usuario elige si incluir imagen → click "Imprimir / PDF"
3. Se actualiza `PrintArea` con el doc actual y la preferencia de imagen
4. `window.print()` — el navegador muestra el diálogo de impresión/guardar PDF

---

## 6. Archivos

### Nuevos
| Archivo | Responsabilidad |
|---------|----------------|
| `src/components/documents/PdfExportModal.tsx` | Modal con checkbox + botón imprimir |
| `src/components/documents/PrintArea.tsx` | Área de impresión oculta (`@media print`) |
| `src/lib/richTextToHtml.ts` | Serializar Tiptap JSON → HTML para impresión |

### Modificados
| Archivo | Cambio |
|---------|--------|
| `src/app/globals.css` | Añadir reglas `@media print` |
| `src/components/documents/DocumentEditor.tsx` | Añadir botón PDF + integrar modal y PrintArea |

---

## 7. No-goals

- No exportación PDF sin interacción del usuario (automática)
- No personalización del layout de impresión
- No generación de PDF via librería (solo `window.print()`)
- No exportación en lote como PDFs
