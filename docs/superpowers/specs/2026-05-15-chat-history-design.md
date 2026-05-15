# Historial de Chats — Design Spec

**Date:** 2026-05-15  
**Status:** Approved

---

## 1. Overview

Las conversaciones del RAG chat se guardan automáticamente en IndexedDB al primer mensaje del usuario. El título se genera con el LLM si está disponible; si no, se usa el primer mensaje del usuario (≤ 60 chars). El usuario puede renombrar y eliminar conversaciones. El acceso es mediante un sidebar en desktop (≥ `lg`) o un modal en móvil, dentro de RagView.

---

## 2. Tipo de datos

```typescript
// src/types/document.ts — añadir:
export interface ChatHistory {
  id: string          // nanoid
  title: string       // LLM-generado o primer mensaje
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}
```

---

## 3. Base de datos (`src/services/db.ts`)

Migración a **versión 4**:

```typescript
const DB_VERSION = 4

export type DocStore = {
  documents: { ... }
  chunks:    { ... }
  chat_histories: {
    key: string
    value: ChatHistory
    indexes: { createdAt: number }
  }
}

// En upgrade():
if (oldVersion < 4) {
  const store = db.createObjectStore('chat_histories', { keyPath: 'id' })
  store.createIndex('createdAt', 'createdAt')
}
```

---

## 4. Storage (`src/services/chatHistoryStorage.ts` — nuevo)

```typescript
export async function saveChatHistory(history: ChatHistory): Promise<void>
export async function getAllChatHistories(): Promise<ChatHistory[]>  // ordenadas por createdAt desc
export async function updateChatHistory(id: string, patch: Partial<ChatHistory>): Promise<void>
export async function deleteChatHistory(id: string): Promise<void>
export async function pruneChatHistories(limit: number): Promise<void>  // elimina las más antiguas si se supera el límite
```

---

## 5. Hook (`src/hooks/useChatHistory.ts` — nuevo)

```typescript
export function useChatHistory(limit: number) {
  const [histories, setHistories] = useState<ChatHistory[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  // Cargar al montar
  // saveHistory(messages): crea o actualiza la conversación activa
  // loadHistory(id): carga mensajes de una conversación anterior
  // deleteHistory(id): elimina y limpia si era la activa
  // renameHistory(id, title): actualiza título
  // startNew(): limpia activeId para empezar conversación nueva

  return { histories, activeId, saveHistory, loadHistory, deleteHistory, renameHistory, startNew }
}
```

---

## 6. Integración en `useRag.ts`

- `chat()` llama `saveHistory(messages)` después de cada respuesta completa (no durante streaming)
- El título se genera: si `llmStatus === 'ready'`, se hace una llamada LLM con prompt `"Resume en menos de 8 palabras: {primer mensaje del usuario}"`; si no, `firstUserMessage.slice(0, 60)`

---

## 7. Límite configurable

Guardado en `localStorage` como `papeleo_chat_limit` con valores posibles: `10 | 25 | 50 | Infinity`.  
Default: `25`.  
Gestionado desde el modal de Ajustes (descrito en el spec `backup-restore-design.md`, sección 6).  
`pruneChatHistories(limit)` se llama tras cada `saveHistory`.

---

## 8. UI en `RagView.tsx`

### Desktop (≥ `lg`) — sidebar izquierdo

```
┌──────────────┬─────────────────────────────┐
│ Conversac.   │  [Chat area actual]          │
│ ──────────── │                              │
│ > Chat activo│                              │
│   Chat 2     │                              │
│   Chat 3     │                              │
│ + Nueva      │                              │
└──────────────┴─────────────────────────────┘
```

- `lg:grid lg:grid-cols-[220px_1fr]` en el wrapper principal de RagView
- Sidebar: `hidden lg:flex flex-col gap-1 border-r border-white/7 p-3`
- Cada item: `text-xs truncate px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white/5`; activo: `bg-accent/10 text-accent`
- Botón "+ Nueva conversación" en la parte superior del sidebar
- Hover en item → mostrar botones ✏️ (renombrar) y 🗑️ (eliminar)

### Móvil — botón "Historial" + modal

- Botón `lg:hidden` "Historial" en la cabecera del chat area
- Abre un `<dialog>` / overlay con la lista de conversaciones
- Misma interacción que el sidebar (seleccionar, renombrar, eliminar, nueva)

---

## 9. Archivos

### Nuevos
| Archivo | Responsabilidad |
|---------|----------------|
| `src/types/document.ts` | Añadir `ChatHistory` interface |
| `src/services/chatHistoryStorage.ts` | CRUD + prune en IndexedDB |
| `src/hooks/useChatHistory.ts` | Estado y lógica de historial |
| `src/components/rag/ChatHistorySidebar.tsx` | Sidebar desktop + modal móvil |

### Modificados
| Archivo | Cambio |
|---------|--------|
| `src/services/db.ts` | Versión 4, store `chat_histories` |
| `src/hooks/useRag.ts` | Llamar `saveHistory` tras cada respuesta |
| `src/components/rag/RagView.tsx` | Integrar `ChatHistorySidebar`, grid layout en lg |
| `src/components/App.tsx` | Pasar `chatLimit` desde settings a `useChatHistory` |

---

## 10. No-goals

- No sincronización entre dispositivos
- No exportar conversaciones individualmente (el backup cubre esto)
- No buscar dentro del historial de chats
- No streaming de título LLM — se genera en segundo plano tras la respuesta
