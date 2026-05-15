'use client'

import { useState, useEffect, useRef } from 'react'
import type { ExtractionField } from '@/types/document'

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}

const SCHEMA_TEMPLATES: Record<string, { label: string; fields: ExtractionField[] }> = {
  factura: {
    label: 'Factura',
    fields: [
      { key: 'numero_factura', label: 'Número de factura', type: 'text',   description: 'Invoice number or identifier' },
      { key: 'fecha',          label: 'Fecha',              type: 'text',   description: 'Issue date of the invoice' },
      { key: 'proveedor',      label: 'Proveedor',          type: 'text',   description: 'Supplier or vendor name' },
      { key: 'total',          label: 'Total',              type: 'number', description: 'Total amount including taxes' },
      { key: 'iva',            label: 'IVA',                type: 'number', description: 'VAT or tax amount' },
    ],
  },
  contrato: {
    label: 'Contrato',
    fields: [
      { key: 'partes',       label: 'Partes',              type: 'text',   description: 'Names of contracting parties' },
      { key: 'objeto',       label: 'Objeto del contrato', type: 'text',   description: 'Purpose or subject matter' },
      { key: 'fecha_inicio', label: 'Fecha de inicio',     type: 'text',   description: 'Contract start date' },
      { key: 'fecha_fin',    label: 'Fecha de fin',        type: 'text',   description: 'Contract end or expiry date' },
      { key: 'importe',      label: 'Importe',             type: 'number', description: 'Contract value or amount' },
    ],
  },
  recibo: {
    label: 'Recibo',
    fields: [
      { key: 'concepto',   label: 'Concepto',      type: 'text',   description: 'Description of the purchase or service' },
      { key: 'fecha',      label: 'Fecha',          type: 'text',   description: 'Date of the receipt' },
      { key: 'importe',    label: 'Importe',        type: 'number', description: 'Total amount paid' },
      { key: 'forma_pago', label: 'Forma de pago',  type: 'text',   description: 'Payment method (cash, card, transfer)' },
    ],
  },
  dni: {
    label: 'DNI / Pasaporte',
    fields: [
      { key: 'nombre',           label: 'Nombre completo',     type: 'text', description: 'Full name of the document holder' },
      { key: 'numero',           label: 'Número de documento', type: 'text', description: 'ID number or DNI/NIE/passport number' },
      { key: 'fecha_nacimiento', label: 'Fecha de nacimiento', type: 'text', description: 'Date of birth' },
      { key: 'fecha_caducidad',  label: 'Fecha de caducidad',  type: 'text', description: 'Document expiry date' },
      { key: 'nacionalidad',     label: 'Nacionalidad',        type: 'text', description: 'Nationality' },
    ],
  },
}

interface Props {
  schema: ExtractionField[]
  onChange: (schema: ExtractionField[]) => void
}

export default function SchemaEditor({ schema, onChange }: Props) {
  const [label, setLabel]           = useState('')
  const [type, setType]             = useState<'text' | 'number'>('text')
  const [desc, setDesc]             = useState('')
  const [templateOpen, setTemplateOpen] = useState(false)
  const templateRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!templateOpen) return
    const handleClick = (e: MouseEvent) => {
      if (templateRef.current && !templateRef.current.contains(e.target as Node)) {
        setTemplateOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [templateOpen])

  const addField = () => {
    if (!label.trim()) return
    const key = slugify(label.trim())
    if (!key) return
    if (schema.some((f) => f.key === key)) return
    onChange([...schema, { key, label: label.trim(), type, description: desc.trim() }])
    setLabel(''); setDesc('')
  }

  const removeField = (key: string) => onChange(schema.filter((f) => f.key !== key))

  const applyTemplate = (tplKey: string) => {
    const tpl = SCHEMA_TEMPLATES[tplKey]
    if (!tpl) return
    onChange(tpl.fields)
    setTemplateOpen(false)
  }

  return (
    <div className="space-y-3">
      {/* Template picker */}
      <div className="relative" ref={templateRef}>
        <button
          type="button"
          onClick={() => setTemplateOpen((o) => !o)}
          className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-dim hover:text-ink hover:bg-white/5 transition-colors flex items-center gap-1.5"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          Usar plantilla
        </button>
        {templateOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-surface border border-white/10 rounded-xl shadow-lg overflow-hidden min-w-[180px]">
            {Object.entries(SCHEMA_TEMPLATES).map(([key, tpl]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyTemplate(key)}
                className="w-full text-left px-4 py-2.5 text-xs text-ink hover:bg-white/7 transition-colors"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Existing fields */}
      {schema.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-dim/60">
              <th className="text-left pb-1.5 font-normal w-1/3">Campo</th>
              <th className="text-left pb-1.5 font-normal w-16">Tipo</th>
              <th className="text-left pb-1.5 font-normal">Descripción</th>
              <th className="w-6" />
            </tr>
          </thead>
          <tbody>
            {schema.map((field) => (
              <tr key={field.key} className="border-t border-white/5">
                <td className="py-1.5 pr-2 font-mono text-accent/80">{field.label}</td>
                <td className="py-1.5 pr-2 text-dim">{field.type}</td>
                <td className="py-1.5 pr-2 text-dim/70 truncate max-w-0">{field.description}</td>
                <td className="py-1.5">
                  <button
                    type="button"
                    onClick={() => removeField(field.key)}
                    aria-label={`Remove field ${field.label}`}
                    className="text-dim/40 hover:text-err transition-colors"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add new field row */}
      {schema.length < 15 && (
        <div className="flex gap-2 items-end flex-wrap">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addField() } }}
            placeholder="Nombre del campo"
            className="flex-1 min-w-[120px] px-2.5 py-1.5 rounded-lg border border-white/10 bg-transparent text-xs text-ink placeholder:text-dim/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'text' | 'number')}
            className="px-2 py-1.5 rounded-lg border border-white/10 bg-surface text-xs text-ink focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
          >
            <option value="text">Texto</option>
            <option value="number">Número</option>
          </select>
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addField() } }}
            placeholder="Descripción (instrucción para el LLM)"
            className="flex-1 min-w-[160px] px-2.5 py-1.5 rounded-lg border border-white/10 bg-transparent text-xs text-ink placeholder:text-dim/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
          />
          <button
            type="button"
            onClick={addField}
            disabled={!label.trim()}
            className="px-3 py-1.5 rounded-lg bg-accent/15 border border-accent/30 text-accent text-xs disabled:opacity-40 hover:bg-accent/20 transition-colors"
          >
            Añadir
          </button>
        </div>
      )}
    </div>
  )
}
