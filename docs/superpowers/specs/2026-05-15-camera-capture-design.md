# Captura por Cámara — Design Spec

**Date:** 2026-05-15  
**Status:** Approved

---

## 1. Overview

Botón "Tomar foto" visible solo en móvil (`sm:hidden`) que abre la cámara trasera nativa del dispositivo mediante `<input type="file" accept="image/*" capture="environment">`. Reutiliza exactamente el mismo flujo de carga que el upload de archivo existente — sin lógica adicional.

---

## 2. Puntos de acceso

| Ubicación | Forma |
|-----------|-------|
| Dropzone (tab OCR) | Botón secundario "Tomar foto" junto a "Seleccionar archivo" |
| Dashboard | Botón de acción rápida "Escanear con cámara" (junto al botón "Escanear" existente) |

Ambos son `sm:hidden` — invisibles en pantallas ≥ 640px.

---

## 3. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/ocr/Dropzone.tsx` | Añadir `<input capture="environment">` oculto + botón "Tomar foto" `sm:hidden` |
| `src/components/dashboard/DashboardView.tsx` | Añadir botón "Escanear con cámara" `sm:hidden` en la sección de acciones rápidas |

---

## 4. Implementación en Dropzone

```tsx
{/* Input oculto para cámara — solo móvil */}
<input
  ref={cameraInputRef}
  type="file"
  accept="image/*"
  capture="environment"
  className="hidden"
  onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]) }}
/>

{/* Botón visible solo en móvil */}
<button
  type="button"
  onClick={() => cameraInputRef.current?.click()}
  className="sm:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-dim hover:text-ink hover:bg-white/5 transition-colors"
>
  <svg ...cámara icon... />
  Tomar foto
</button>
```

- `onFile` es el mismo handler que usa el input de archivo existente — sin cambios en `useImageLoader`
- Mismo flujo: imagen aparece en `ImagePreview`, listo para ejecutar OCR

---

## 5. Implementación en Dashboard

En la sección de acciones rápidas del Dashboard, añadir junto al botón "Escanear":

```tsx
<Button
  variant="ghost"
  onClick={onCameraCapture}
  className="sm:hidden flex-1"
>
  <svg ...cámara icon... />
  Escanear con cámara
</Button>
```

`onCameraCapture` es una prop nueva de `DashboardView`:
```typescript
interface Props {
  documents: ScannedDocument[]
  onNavigate: (tab: Tab) => void
  onCameraCapture: () => void   // nuevo
}
```

En `App.tsx`, `onCameraCapture` navega al tab OCR y activa el input de cámara del Dropzone. Para coordinar esto sin prop drilling profundo, se expone un `ref` en el Dropzone:

```typescript
// En App.tsx
const dropzoneCameraRef = useRef<() => void>(null)

// En Dropzone: useImperativeHandle para exponer triggerCamera()
// En App.tsx: onCameraCapture={() => { handleTabChange('ocr'); setTimeout(() => dropzoneCameraRef.current?.(), 150) }}
```

El `setTimeout(150)` da tiempo al tab change animation antes de abrir la cámara.

---

## 6. No-goals

- No captura de cámara frontal (selfie mode)
- No vista previa especial para fotos — usa el ImagePreview existente
- No integración con la cola de OCR en lote (eso se cubre en el spec de batch OCR)
- No visible en desktop
