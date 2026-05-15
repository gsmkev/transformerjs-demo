# Escaneo Multi-página — Design Spec

**Date:** 2026-05-15  
**Status:** Approved

---

## 1. Overview

El usuario puede añadir múltiples fotos/imágenes a un mismo documento antes de ejecutar el OCR. Las imágenes se concatenan verticalmente en un canvas offscreen y el motor OCR las procesa como una sola imagen. El documento guardado contiene el canvas concatenado como `imageDataUrl`.

---

## 2. Cambios en `useImageLoader`

```typescript
// src/hooks/useImageLoader.ts — extender:
interface ImageLoaderState {
  pages: string[]          // dataURLs de todas las páginas (mínimo 1 si hay imagen)
  dataUrl: string | null   // canvas concatenado (computed de pages)
  file: File | null        // primer archivo (para compatibilidad con OCR engine)
  isDragOver: boolean
  fileTypeError: string | null
}

// Nuevas funciones expuestas:
addPage(file: File): void        // añade una página al array
removePage(index: number): void  // elimina una página por índice
clearImage(): void               // limpia todas las páginas (comportamiento existente)
```

La concatenación ocurre en `useEffect` cuando cambia `pages`:

```typescript
// Concatenar pages en un canvas offscreen
async function concatenatePages(dataUrls: string[]): Promise<string> {
  const images = await Promise.all(dataUrls.map(loadImage))
  const width = Math.max(...images.map(img => img.naturalWidth))
  const totalHeight = images.reduce((sum, img) => sum + img.naturalHeight, 0)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = totalHeight
  const ctx = canvas.getContext('2d')!
  let y = 0
  for (const img of images) {
    ctx.drawImage(img, 0, y)
    y += img.naturalHeight
  }
  return canvas.toDataURL('image/jpeg', 0.92)
}
```

---

## 3. UI en `OcrView`

Cuando hay al menos una imagen cargada, en lugar del `ImagePreview` simple:

```
┌─────────────────────────────────┐
│  [Miniatura 1] [Miniatura 2] [+]│  ← fila horizontal scrollable
└─────────────────────────────────┘
│  Preview del canvas concatenado │
│  (imagen completa resultante)   │
└─────────────────────────────────┘
```

- **Fila de miniaturas**: `overflow-x-auto`, miniaturas de 56×56px con botón ✕ para eliminar. Último elemento: botón "+ Añadir página" (abre file input)
- **Preview**: el canvas concatenado (misma lógica que `ImagePreview` actual)
- Si solo hay 1 página: UI idéntica a la actual (sin fila de miniaturas)
- Input de cámara existente (`cameraInputRef`) llama a `addPage()` en vez de `loadFile()`

### Componente nuevo: `PageStrip.tsx`

```tsx
// src/components/ocr/PageStrip.tsx
interface Props {
  pages: string[]
  onAdd: (file: File) => void
  onRemove: (index: number) => void
  cameraInputRef?: RefObject<HTMLInputElement>
}
```

---

## 4. Flujo OCR

`ocr.execute()` recibe el canvas concatenado (como `File` o `Blob`). No cambia la API del motor OCR — sigue recibiendo un archivo de imagen.

```typescript
// En OcrView, el botón "Ejecutar OCR":
onRunOcr={() => {
  if (!imageLoader.file) return
  // Convertir dataUrl concatenado a File
  const blob = dataURLtoBlob(imageLoader.dataUrl!)
  const file = new File([blob], 'multipage.jpg', { type: 'image/jpeg' })
  ocr.execute(file)
}}
```

---

## 5. Guardado

El documento guardado usa `imageLoader.dataUrl` (el canvas concatenado) como `imageDataUrl`. No hay cambio en el tipo `ScannedDocument` ni en la lógica de guardado.

---

## 6. Archivos

### Nuevos
| Archivo | Responsabilidad |
|---------|----------------|
| `src/components/ocr/PageStrip.tsx` | Fila de miniaturas + botón añadir |

### Modificados
| Archivo | Cambio |
|---------|--------|
| `src/hooks/useImageLoader.ts` | Añadir `pages[]`, `addPage()`, `removePage()`, concatenación |
| `src/components/ocr/OcrView.tsx` | Mostrar `PageStrip` cuando `pages.length > 0` |
| `src/components/ocr/Dropzone.tsx` | `onFile` pasa a llamar `addPage` en lugar de `loadFile` |

---

## 7. No-goals

- No reordenar páginas via drag & drop (eliminar y re-añadir)
- No OCR por página individual (siempre concatenado)
- No límite máximo de páginas (el usuario es responsable del rendimiento)
