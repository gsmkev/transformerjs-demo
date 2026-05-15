# Bloqueo con PIN/Biométrico — Design Spec

**Date:** 2026-05-15  
**Status:** Approved

---

## 1. Overview

El usuario puede proteger la app con un PIN de 4–6 dígitos. Al abrir la app (primera carga del tab), si hay un PIN configurado, se muestra una pantalla de bloqueo fullscreen que oculta todo el contenido. El PIN se guarda hasheado (SHA-256) en `localStorage`. Opcionalmente, si el dispositivo lo soporta, se puede desbloquear con huella/Face ID via WebAuthn.

---

## 2. Almacenamiento

```
localStorage:
  papeleo_pin_hash      — SHA-256 hex del PIN (null si no hay PIN configurado)
  papeleo_webauthn_id   — credentialId base64 (null si no hay biométrico registrado)
```

El hash se calcula con `crypto.subtle.digest('SHA-256', encoder.encode(pin))`.

**Reset de emergencia**: si el usuario olvida el PIN, puede hacer click en "Borrar todos los datos" en la pantalla de bloqueo. Esto ejecuta `indexedDB.deleteDatabase('papeleo')` + `localStorage.clear()` y recarga la app.

---

## 3. Hook `usePinLock`

```typescript
// src/hooks/usePinLock.ts — nuevo
export function usePinLock() {
  const [isLocked, setIsLocked] = useState(false)
  const [hasPinSet, setHasPinSet] = useState(false)
  const [hasWebAuthn, setHasWebAuthn] = useState(false)

  // Al montar: si hay PIN configurado, bloquear
  // unlock(pin): hashea el PIN, compara con stored hash, desbloquea si coincide
  // unlockWithBiometric(): llama WebAuthn.get(), desbloquea si éxito
  // setPin(newPin, currentPin?): configura/cambia PIN (requiere verificar el actual si ya hay uno)
  // removePin(currentPin): quita el PIN
  // registerBiometric(currentPin): registra credencial WebAuthn tras verificar PIN

  return { isLocked, hasPinSet, hasWebAuthn, unlock, unlockWithBiometric, setPin, removePin, registerBiometric }
}
```

---

## 4. Pantalla de bloqueo (`LockScreen`)

Pantalla fullscreen con `position: fixed inset-0 z-50 bg-base`:

```
┌─────────────────────────────────┐
│                                 │
│        🔒  Papeleo              │
│                                 │
│     Introduce tu PIN            │
│                                 │
│     ● ● ○ ○ ○ ○                │  ← dots (4-6 dígitos)
│                                 │
│   1  2  3                       │
│   4  5  6                       │
│   7  8  9                       │
│      0  ⌫                       │
│                                 │
│   [Usar huella/Face ID]         │  ← solo si hasWebAuthn
│                                 │
│   Borrar todos los datos        │  ← texto pequeño, con confirmación
└─────────────────────────────────┘
```

- Teclado numérico on-screen (para móvil; el teclado físico también funciona via `keydown`)
- PIN incorrecto: shake animation + limpiar dots. Tras 5 intentos fallidos: bloqueo de 30 segundos con countdown
- PIN correcto: fade-out de la pantalla de bloqueo

```tsx
// src/components/ui/LockScreen.tsx — nuevo
interface Props {
  hasWebAuthn: boolean
  onUnlock: (pin: string) => Promise<boolean>  // devuelve true si OK
  onUnlockBiometric: () => Promise<boolean>
  onReset: () => void
}
```

---

## 5. Configuración del PIN (en Ajustes)

Sección "Seguridad" en el modal de Ajustes (spec: backup-restore-design.md):

- Si no hay PIN: botón "Activar PIN" → flujo de 3 pasos: Introduce PIN → Confirma PIN → (opcional) Registrar biométrico
- Si hay PIN: botones "Cambiar PIN" y "Desactivar PIN" (ambos requieren PIN actual)
- Si hay WebAuthn: botón "Quitar huella/Face ID"
- Toggle "Usar biométrico" (solo visible si `PublicKeyCredential` disponible en el navegador)

---

## 6. Integración en `App.tsx`

```tsx
const pinLock = usePinLock()

// Renderizar LockScreen sobre todo el contenido si isLocked
if (pinLock.isLocked) {
  return <LockScreen
    hasWebAuthn={pinLock.hasWebAuthn}
    onUnlock={pinLock.unlock}
    onUnlockBiometric={pinLock.unlockWithBiometric}
    onReset={pinLock.resetAll}
  />
}
```

---

## 7. WebAuthn (biométrico)

- Usar `navigator.credentials.create()` con `authenticatorAttachment: 'platform'` para registro
- Usar `navigator.credentials.get()` para verificación
- Solo disponible si `window.PublicKeyCredential` existe y el contexto es HTTPS (o localhost)
- Si WebAuthn falla (e.g., sensor no disponible), el usuario puede usar el PIN como fallback

---

## 8. Archivos

### Nuevos
| Archivo | Responsabilidad |
|---------|----------------|
| `src/hooks/usePinLock.ts` | Estado de bloqueo, lógica PIN + WebAuthn |
| `src/components/ui/LockScreen.tsx` | Pantalla de bloqueo fullscreen con teclado |

### Modificados
| Archivo | Cambio |
|---------|--------|
| `src/components/App.tsx` | Integrar `usePinLock`, mostrar `LockScreen` si `isLocked` |
| `src/components/models/ModelsView.tsx` (o Ajustes) | Sección "Seguridad" con configuración de PIN |

---

## 9. No-goals

- No bloquear tras inactividad (solo al abrir el tab)
- No sincronización del PIN entre dispositivos
- No límite de intentos permanente (solo timeout temporal de 30s)
