export type DocCategory =
  | 'factura'
  | 'contrato'
  | 'médico'
  | 'identidad'
  | 'seguro'
  | 'bancario'
  | 'hogar'
  | 'otro'

const RULES: Array<{ category: DocCategory; keywords: string[] }> = [
  { category: 'factura',   keywords: ['factura', 'invoice', 'total', 'subtotal', 'iva', 'importe', 'vencimiento', 'pago', 'cobro', 'facturación'] },
  { category: 'contrato',  keywords: ['contrato', 'acuerdo', 'cláusula', 'firma', 'firmante', 'obligaciones', 'arrendamiento', 'rescisión', 'partes'] },
  { category: 'médico',    keywords: ['diagnóstico', 'receta', 'médico', 'paciente', 'hospital', 'clínica', 'dosis', 'tratamiento', 'análisis', 'doctor'] },
  { category: 'identidad', keywords: ['dni', 'nif', 'pasaporte', 'nombre', 'apellidos', 'fecha de nacimiento', 'nationality', 'expedido', 'documento nacional'] },
  { category: 'seguro',    keywords: ['póliza', 'aseguradora', 'cobertura', 'prima', 'siniestro', 'seguro', 'beneficiario', 'asegurado'] },
  { category: 'bancario',  keywords: ['iban', 'cuenta', 'saldo', 'transferencia', 'extracto', 'banco', 'débito', 'crédito', 'entidad financiera'] },
  { category: 'hogar',     keywords: ['suministro', 'electricidad', 'gas', 'agua', 'comunidad', 'hipoteca', 'alquiler', 'inquilino', 'propietario'] },
]

export function classifyDocument(text: string): DocCategory {
  const lower = text.toLowerCase()
  let best: DocCategory = 'otro'
  let bestScore = 0
  for (const rule of RULES) {
    const score = rule.keywords.filter((kw) => lower.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      best = rule.category
    }
  }
  return best
}
