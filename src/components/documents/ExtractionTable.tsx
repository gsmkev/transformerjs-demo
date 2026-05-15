// src/components/documents/ExtractionTable.tsx
'use client'

import type { ExtractionField } from '@/types/document'

interface Props {
  schema: ExtractionField[]
  data: Record<string, string>
  onChange: (data: Record<string, string>) => void
}

export default function ExtractionTable({ schema, data, onChange }: Props) {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <table className="w-full text-xs">
        <tbody>
          {schema.map((field) => (
            <tr key={field.key} className="border-b border-white/7 last:border-0">
              <td className="px-3 py-2 text-dim/80 font-medium w-2/5 align-middle">{field.label}</td>
              <td className="px-3 py-2 align-middle">
                <input
                  value={data[field.key] ?? ''}
                  onChange={(e) => onChange({ ...data, [field.key]: e.target.value })}
                  inputMode={field.type === 'number' ? 'decimal' : 'text'}
                  className={`w-full bg-transparent text-ink focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 rounded ${
                    field.type === 'number' ? 'text-right font-mono' : ''
                  }`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
