# Compartir Documento (Web Share API) — Design Spec

**Date:** 2026-05-15  
**Status:** Approved

---

## 1. Overview

El usuario puede compartir el texto de un documento directamente desde DocumentEditor. En dispositivos con soporte (móvil/HTTPS), se usa `navigator.share()` para abrir el selector nativo del OS. En desktop o navegadores sin soporte, se copia el texto al portapapeles y se muestra un toast de confirmación.

---

## 2. UI en `DocumentEditor`

Botón "Compartir" (icono share estándar) en el área de acciones del documento.

El label del botón se adapta:

```typescript
const canShare = typeof navigator !== 'undefined' && !!navigator.share
// Móvil/soporte: "Compartir"
// Desktop/sin soporte: "Copiar texto"
```

---

## 3. Comportamiento

```typescript
async function handleShare(doc: ScannedDocument) {
  const text = doc.rawText

  if (navigator.share) {
    try {
      await navigator.share({
        title: doc.title,
        text,
      })
    } catch (err) {
      // El usuario canceló el share dialog — no mostrar error
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err)
      }
    }
  } else {
    await navigator.clipboard.writeText(text)
    showToast('Texto copiado al portapapeles')
  }
}
```

---

## 4. Toast de confirmación

Componente `Toast` reutilizable (si no existe ya):

```tsx
// src/components/ui/Toast.tsx — nuevo o reutilizar si existe
// Aparece en la esquina inferior central, auto-desaparece en 2.5s
// Clases: fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-sm text-ink shadow-lg animate-fade-in
```

Solo se muestra en el caso de fallback (clipboard). En el caso de `navigator.share`, el OS maneja el feedback.

---

## 5. Archivos

### Nuevos
| Archivo | Responsabilidad |
|---------|----------------|
| `src/components/ui/Toast.tsx` | Toast de notificación temporal (si no existe) |

### Modificados
| Archivo | Cambio |
|---------|--------|
| `src/components/documents/DocumentEditor.tsx` | Añadir botón compartir + lógica `handleShare` |

---

## 6. No-goals

- No compartir la imagen (solo texto)
- No compartir via enlace o URL
- No historial de compartidos
- No integración con servicios específicos (WhatsApp directo, etc.) — el OS lo gestiona
