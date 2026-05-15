# Backup / Restore — Design Spec

**Date:** 2026-05-15  
**Status:** Approved

---

## 1. Overview

Exportar todos los documentos de la biblioteca como un `.zip` de archivos JSON (sin imágenes). Importar ese mismo `.zip` para restaurar documentos en IndexedDB con upsert por `id`. Accesible desde el modal de Ajustes (icono ⚙ en el header).

---

## 2. Formato del backup

Un `.zip` llamado `papeleo-backup-YYYY-MM-DD.zip` con la siguiente estructura:

```
papeleo-backup-2026-05-15/
  manifest.json          ← versión del backup, fecha, número de documentos
  documents/
    {doc.id}.json        ← un archivo por documento
  chat_histories/
    {history.id}.json    ← un archivo por conversación (si existe el store)
```

### `manifest.json`
```json
{
  "version": 1,
  "exportedAt": "2026-05-15T14:32:00Z",
  "documentCount": 12,
  "chatHistoryCount": 5
}
```

### `documents/{id}.json`
Campos incluidos: `id, title, rawText, richText, engineId, confidence, createdAt, updatedAt, category, embedding` (el flag null/[1]).  
Campo **excluido**: `imageDataUrl` — las imágenes no se respaldan para mantener el backup ligero.

---

## 3. Dependencia

`jszip` — ya requerida por el spec de export Word/ODT/ODS. Sin dependencias nuevas.

---

## 4. Archivos

### Nuevo
| Archivo | Responsabilidad |
|---------|----------------|
| `src/services/backupService.ts` | `exportBackup()` y `importBackup(file)` |

### Modificados
| Archivo | Cambio |
|---------|--------|
| `src/components/ui/SettingsModal.tsx` (nuevo) | Modal ⚙ con secciones Datos + Chat |
| `src/components/App.tsx` | Estado `settingsOpen`, render `<SettingsModal>`, icono ⚙ en header |

---

## 5. `backupService.ts`

### `exportBackup(documents, chatHistories)`

```typescript
export async function exportBackup(
  documents: ScannedDocument[],
  chatHistories: ChatHistory[],
): Promise<void>
```

1. Crear `JSZip`
2. Añadir `manifest.json`
3. Para cada documento: `zip.file(`documents/${doc.id}.json`, JSON.stringify(doc, null, 2))` (sin `imageDataUrl`)
4. Para cada chat history: `zip.file(`chat_histories/${h.id}.json`, JSON.stringify(h, null, 2))`
5. Generar blob → `URL.createObjectURL` → descarga automática
6. Nombre del archivo: `papeleo-backup-YYYY-MM-DD.zip`

### `importBackup(file: File)`

```typescript
export async function importBackup(file: File): Promise<{ docsImported: number; chatsImported: number; errors: string[] }>
```

1. Parsear el ZIP con JSZip
2. Leer `manifest.json` — validar que `version === 1`
3. Para cada archivo en `documents/`: parsear JSON, llamar `saveDocument(doc)` con upsert (reemplaza si el `id` ya existe)
4. Para cada archivo en `chat_histories/`: parsear JSON, llamar `saveChatHistory(history)` con upsert
5. Devolver resumen: `{ docsImported, chatsImported, errors }`
6. Errores por archivo (JSON inválido, campos faltantes) se acumulan sin detener el resto

---

## 6. Modal de Ajustes (`SettingsModal.tsx`)

Activado por icono ⚙ en el header. Overlay con panel centrado:

```
┌──────────────────────────────────┐
│  Ajustes                     [✕] │
│  ────────────────────────────    │
│  DATOS                           │
│  [Exportar backup]               │
│  "Descarga un ZIP con todos tus  │
│   documentos y conversaciones"   │
│                                  │
│  [Importar backup]               │
│  "Restaura desde un backup .zip" │
│  (input file oculto)             │
│                                  │
│  ────────────────────────────    │
│  HISTORIAL DE CHAT               │
│  Conversaciones guardadas        │
│  [10] [25] [50] [Sin límite]     │
└──────────────────────────────────┘
```

- Fondo: `fixed inset-0 z-50 bg-black/60 backdrop-blur-sm`
- Panel: `max-w-sm mx-auto mt-24 rounded-2xl card-elevated p-6 space-y-6`
- Botón exportar: `Button variant="ghost" className="w-full"` — muestra spinner mientras genera el zip
- Botón importar: `Button variant="ghost" className="w-full"` — abre `<input type="file" accept=".zip">` oculto
- Tras importar: toast inline con el resumen (`"12 documentos importados, 3 conversaciones"`)
- El selector de límite de chat: 4 pill buttons `10 | 25 | 50 | ∞`, persiste en `localStorage`

---

## 7. Estado de carga e importación

- Durante la exportación: spinner en el botón, texto "Generando backup…"
- Durante la importación: spinner + barra de progreso (N/total archivos procesados)
- Error de ZIP inválido: mensaje inline `"El archivo no es un backup válido de Papeleo"`
- Éxito: mensaje verde con el resumen de lo importado

---

## 8. No-goals

- No incluir imágenes en el backup (demasiado pesado)
- No cifrado del backup
- No backup automático/programado
- No importar desde otras aplicaciones (solo el formato propio)
- No merge inteligente de conflictos — upsert simple por `id`
