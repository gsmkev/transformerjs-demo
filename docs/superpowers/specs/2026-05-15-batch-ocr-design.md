# OCR en Lote — Design Spec

**Date:** 2026-05-15  
**Status:** Approved

---

## 1. Overview

El Dropzone del tab OCR acepta múltiples archivos simultáneamente. Las imágenes se muestran en una cola con preview thumbnail. El procesamiento es secuencial (un worker OCR a la vez). Cada documento terminado se guarda automáticamente en la biblioteca. Los errores por archivo se muestran inline sin detener el resto del lote.

---

## 2. Flujo

```
Usuario suelta N imágenes en el Dropzone
         ↓
  Cola de archivos (lista con thumbnails)
         ↓
  [Ejecutar OCR en lote] — botón
         ↓
  Proceso secuencial: archivo 1 → OCR → auto-guardar → archivo 2 → ...
         ↓
  Barra de progreso: "3 / 7 documentos"
         ↓
  Resultado: "7 documentos guardados en la biblioteca"
  (con link "Ir a Archivo")
```

---

## 3. Estados de un archivo en la cola

| Estado | Visual |
|--------|--------|
| `pending` | thumbnail + nombre, sin indicador |
| `processing` | spinner sobre el thumbnail |
| `done` | ✓ verde sobre el thumbnail |
| `error` | ✕ rojo + mensaje de error inline |

---

## 4. Archivos

### Nuevos
| Archivo | Responsabilidad |
|---------|----------------|
| `src/hooks/useBatchOcr.ts` | Gestión de cola, procesamiento secuencial, auto-save |
| `src/components/ocr/BatchQueue.tsx` | UI de la cola: lista de items con estado + barra de progreso |

### Modificados
| Archivo | Cambio |
|---------|--------|
| `src/components/ocr/Dropzone.tsx` | Añadir `multiple` al input; en modo lote, `onFiles(FileList)` en lugar de `onFile(File)` |
| `src/components/ocr/OcrView.tsx` | Alternar entre modo individual y modo lote según número de archivos; integrar `BatchQueue` |
| `src/hooks/useImageLoader.ts` | Exponer `files: File[]` + `loadFiles(FileList)` junto al estado individual existente |

---

## 5. `useBatchOcr.ts`

```typescript
interface BatchItem {
  id: string          // nanoid
  file: File
  dataUrl: string     // para thumbnail
  status: 'pending' | 'processing' | 'done' | 'error'
  error?: string
  docId?: string      // id del documento guardado en biblioteca
}

export function useBatchOcr({ workersRef, selectedId, create }: BatchOcrDeps) {
  const [queue, setQueue] = useState<BatchItem[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  // addFiles(files: File[]): añade archivos a la cola con dataUrl pre-generado
  // startBatch(): procesa la cola secuencialmente
  // clearQueue(): resetea todo
  // removeItem(id): elimina un item pendiente de la cola

  return { queue, running, progress, addFiles, startBatch, clearQueue, removeItem }
}
```

### Procesamiento secuencial

```typescript
for (const item of queue.filter(i => i.status === 'pending')) {
  setItemStatus(item.id, 'processing')
  try {
    const result = await ocr.execute(item.file)
    const firstLine = result.text.split('\n').find(l => l.trim()) ?? 'Sin título'
    const category = classifyDocument(result.text)
    const doc = await create({ title: firstLine.slice(0, 80), rawText: result.text, ... })
    setItemStatus(item.id, 'done', { docId: doc.id })
  } catch (err) {
    setItemStatus(item.id, 'error', { error: String(err) })
    // Continúa con el siguiente — no detiene el lote
  }
  setProgress(p => ({ ...p, done: p.done + 1 }))
}
```

---

## 6. UI: `BatchQueue.tsx`

```
┌─────────────────────────────────────────────┐
│  Cola de OCR · 3 / 7 documentos             │
│  ══════════════════░░░░░░░░░░  43%           │
│                                              │
│  [🖼] documento1.jpg        ✓ Guardado       │
│  [🖼] contrato.png          ⟳ Procesando…   │
│  [🖼] factura.jpg           — Pendiente  [✕]│
│  [🖼] foto_borrosa.jpg      ✕ OCR fallido   │
│       "No se pudo leer la imagen"            │
│                                              │
│  [Cancelar]                                  │
└─────────────────────────────────────────────┘
```

- Thumbnail: `w-10 h-10 object-cover rounded-lg bg-surface`
- Barra de progreso: `ProgressBar` existente
- Botón ✕ en items pendientes: `removeItem(id)` — no en procesando/done/error
- Al terminar todos: banner `"N documentos guardados en la biblioteca"` + `Button "Ir a Archivo"` + `Button variant="ghost" "Limpiar cola"`

---

## 7. Modo individual vs. modo lote en `OcrView`

- **1 archivo:** comportamiento actual — preview + ejecutar + guardar manual
- **2+ archivos:** muestra `BatchQueue` en lugar del `ImagePreview` individual; el botón cambia a "Ejecutar OCR en lote"
- La alternancia es automática según `queue.length`

---

## 8. Integración con cámara (móvil)

Si ya hay archivos en la cola (`queue.length > 0`), el botón de cámara en el Dropzone llama `addFiles([capturedFile])` en lugar de `loadFile(capturedFile)`, añadiendo la foto a la cola existente en lugar de reemplazar.

---

## 9. No-goals

- No procesamiento paralelo (un solo worker OCR por engine)
- No reordenar la cola (drag & drop)
- No OCR en lote desde la DocumentList
- No preview del resultado de cada item antes de guardar (todo se auto-guarda)
- No selección del engine por item — usa el engine activo para todo el lote
