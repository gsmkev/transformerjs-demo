'use client'

import { useState, useRef, useEffect } from 'react'
import Button from './Button'
import type { ScannedDocument } from '@/types/document'
import { exportBackup, importBackup, type ImportResult } from '@/services/backupService'

const CHAT_LIMIT_OPTIONS = [
  { value: 10, label: '10' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: Infinity, label: '∞' },
]

const CHAT_LIMIT_KEY = 'papeleo_chat_limit'

function getChatLimit(): number {
  if (typeof window === 'undefined') return 25
  try {
    const stored = localStorage.getItem(CHAT_LIMIT_KEY)
    if (stored === 'Infinity') return Infinity
    const n = Number(stored)
    return isNaN(n) ? 25 : n
  } catch {
    return 25
  }
}

interface Props {
  documents: ScannedDocument[]
  onClose: () => void
  onImportComplete: () => void
}

export default function SettingsModal({ documents, onClose, onImportComplete }: Props) {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [chatLimit, setChatLimit] = useState<number>(getChatLimit)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleExport = async () => {
    setExporting(true)
    try { await exportBackup(documents) } finally { setExporting(false) }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImportResult(null)
    setImportError(null)
    setImporting(true)
    try {
      const result = await importBackup(file)
      setImportResult(result)
      onImportComplete()
    } catch (err) {
      setImportError(String(err).replace('Error: ', ''))
    } finally {
      setImporting(false)
    }
  }

  const handleChatLimitChange = (value: number) => {
    setChatLimit(value)
    try {
      localStorage.setItem(CHAT_LIMIT_KEY, value === Infinity ? 'Infinity' : String(value))
    } catch { /* ignore */ }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/7">
          <h2 className="text-sm font-semibold text-ink">Ajustes</h2>
          <button onClick={onClose} className="text-dim hover:text-ink transition-colors" aria-label="Cerrar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          <section className="space-y-3">
            <p className="section-label">Datos</p>

            <div className="space-y-1">
              <Button variant="ghost" onClick={handleExport} spinning={exporting} disabled={exporting} className="w-full py-2 text-xs justify-start">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {exporting ? 'Generando backup…' : 'Exportar backup'}
              </Button>
              <p className="text-xs text-dim/60 px-1">Descarga un ZIP con todos tus documentos</p>
            </div>

            <div className="space-y-1">
              <Button variant="ghost" onClick={() => fileInputRef.current?.click()} spinning={importing} disabled={importing} className="w-full py-2 text-xs justify-start">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {importing ? 'Importando…' : 'Importar backup'}
              </Button>
              <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={handleImportFile} />
              <p className="text-xs text-dim/60 px-1">Restaura desde un backup .zip de Papeleo</p>
            </div>

            {importResult && (
              <div className="px-3 py-2 rounded-xl bg-ok/10 border border-ok/20 text-xs text-ok">
                {importResult.docsImported} documento{importResult.docsImported !== 1 ? 's' : ''} importado{importResult.docsImported !== 1 ? 's' : ''}
                {importResult.chatsImported > 0 && `, ${importResult.chatsImported} conversaciones`}
                {importResult.errors.length > 0 && ` · ${importResult.errors.length} errores`}
              </div>
            )}

            {importError && (
              <div className="px-3 py-2 rounded-xl bg-err/10 border border-err/20 text-xs text-err">
                {importError}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <p className="section-label">Historial de Chat</p>
            <div className="space-y-2">
              <p className="text-xs text-dim">Conversaciones guardadas</p>
              <div className="flex gap-1.5">
                {CHAT_LIMIT_OPTIONS.map(({ value, label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleChatLimitChange(value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      chatLimit === value
                        ? 'bg-accent/15 border-accent/30 text-accent'
                        : 'border-white/10 text-dim hover:text-ink hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
