# Extracción de Datos Estructurados — Design Spec

**Date:** 2026-05-15  
**Status:** Approved

---

## 1. Overview

El usuario define un schema personalizado por documento (campos con nombre, tipo y descripción/reglas). El LLM local extrae los valores según ese schema y los muestra como una tabla editable en DocumentEditor. El dashboard agrega todos los datos extraídos de todos los documentos en una sección "Datos clave".

---

## 2. Tipos de datos

```typescript
// src/types/document.ts — añadir:

export interface ExtractionField {
  key: string          // identificador interno (snake_case)
  label: string        // nombre visible para el usuario
  type: 'text' | 'number'
  description: string  // instrucción para el LLM ("Importe total en euros", "Número de factura", etc.)
}

// Modificar ScannedDocument:
export interface ScannedDocument {
  // ... campos existentes ...
  extractionSchema: ExtractionField[] | null  // null = sin schema definido
  extractedData: Record<string, string> | null  // key → valor extraído (siempre string, se convierte según type)
}
```

Los valores se guardan como `string` siempre para simplicidad. El `type` en el schema se usa solo para la validación básica en el prompt (pedir número sin texto extra) y para el formato visual (alinear a la derecha los numéricos).

---

## 3. Prompt de extracción

```
Extrae los siguientes campos del documento. Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional.

Schema:
{
  "importe": { "type": "number", "description": "Importe total en euros" },
  "fecha": { "type": "text", "description": "Fecha de emisión en formato DD/MM/YYYY" },
  "proveedor": { "type": "text", "description": "Nombre del proveedor o empresa emisora" }
}

Documento:
<rawText del documento>

Responde solo con:
{"importe": "...", "fecha": "...", "proveedor": "..."}
```

La respuesta del LLM se parsea con `JSON.parse()`. Si falla, se muestra un error y se permite reintentar.

---

## 4. Editor de schema (`SchemaEditor`)

```tsx
// src/components/documents/SchemaEditor.tsx — nuevo
interface Props {
  schema: ExtractionField[]
  onChange: (schema: ExtractionField[]) => void
}
```

UI: lista de campos con inputs inline:

```
┌──────────────┬──────────┬────────────────────────────────────┬───┐
│ Nombre       │ Tipo     │ Descripción / Reglas               │   │
├──────────────┼──────────┼────────────────────────────────────┼───┤
│ importe      │ [número] │ Importe total en euros             │ ✕ │
│ fecha        │ [texto]  │ Fecha de emisión (DD/MM/YYYY)      │ ✕ │
│ proveedor    │ [texto]  │ Nombre de la empresa emisora       │ ✕ │
└──────────────┴──────────┴────────────────────────────────────┴───┘
                                              [+ Añadir campo]
```

- El `key` se auto-genera como slug del `label` (espacios → `_`, minúsculas)
- Tipo: select con opciones "Texto" / "Número"
- Máx. 15 campos por schema

---

## 5. Sección en `DocumentEditor`

La sección "Datos estructurados" tiene tres estados:

**Estado 1 — Sin schema:**
```
[Datos estructurados]
Define qué campos quieres extraer de este documento con ayuda de la IA.
[Definir schema]
```

**Estado 2 — Schema definido, sin datos:**
```
[Datos estructurados]  [Editar schema]
⚠ LLM no cargado — ve a Modelos para cargarlo    (si LLM no ready)
[Extraer con IA]
```

**Estado 3 — Con datos extraídos:**
```
[Datos estructurados]  [Editar schema]  [Re-extraer]
┌─────────────────┬──────────────────┐
│ Importe         │ 1.234,50         │
│ Fecha           │ 15/05/2026       │
│ Proveedor       │ Acme S.L.        │
└─────────────────┴──────────────────┘
```

Tabla colapsable (acordeón). Los valores son editables directamente en la tabla (click para editar). Cambios se guardan con `update()`.

---

## 6. Dashboard — sección "Datos clave"

Solo se muestra si hay al menos 1 documento con `extractedData !== null`.

Lista de documentos con datos extraídos:

```
Datos clave
─────────────────────────────────────────────
📄 Factura Electricidad Mayo        ver >
   Importe: 87,40 €  ·  Fecha: 01/05/2026

📄 Contrato Alquiler 2024           ver >
   Inquilino: Juan García  ·  Renta: 950 €
```

- Muestra hasta 3 campos del extractedData (los primeros del schema)
- Click en el item navega al DocumentEditor de ese documento
- Botón "Ver todo" si hay más de 5 documentos con datos

---

## 7. Servicio de extracción

```typescript
// src/services/extractionService.ts — nuevo
export async function extractStructuredData(
  rawText: string,
  schema: ExtractionField[],
): Promise<Record<string, string>>
// Lanza error si el LLM no está listo o si el JSON no parsea
```

---

## 8. Archivos

### Nuevos
| Archivo | Responsabilidad |
|---------|----------------|
| `src/services/extractionService.ts` | Prompt construction + LLM call + JSON parse |
| `src/components/documents/SchemaEditor.tsx` | Editor de campos del schema |
| `src/components/documents/ExtractionTable.tsx` | Tabla de datos extraídos (editable) |

### Modificados
| Archivo | Cambio |
|---------|--------|
| `src/types/document.ts` | Añadir `ExtractionField`, `extractionSchema`, `extractedData` |
| `src/components/documents/DocumentEditor.tsx` | Integrar sección "Datos estructurados" |
| `src/components/dashboard/DashboardView.tsx` | Añadir sección "Datos clave" |

---

## 9. No-goals

- No schemas globales por categoría (cada documento tiene el suyo)
- No exportar datos extraídos como CSV/JSON independientemente
- No validación estricta de tipos en los valores (todo se guarda como string)
- No extracción automática al guardar el documento
