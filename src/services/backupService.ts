import JSZip from 'jszip'
import type { ScannedDocument } from '@/types/document'
import { saveDocument } from './documentStorage'

export interface BackupManifest {
  version: 1
  exportedAt: string
  documentCount: number
  chatHistoryCount: number
}

export interface ImportResult {
  docsImported: number
  chatsImported: number
  errors: string[]
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export async function exportBackup(
  documents: ScannedDocument[],
  chatHistories: unknown[] = [],
): Promise<void> {
  const zip = new JSZip()

  const manifest: BackupManifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    documentCount: documents.length,
    chatHistoryCount: chatHistories.length,
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2))

  const docsFolder = zip.folder('documents')!
  for (const doc of documents) {
    const { imageDataUrl: _, ...docWithoutImage } = doc
    docsFolder.file(`${doc.id}.json`, JSON.stringify(docWithoutImage, null, 2))
  }

  if (chatHistories.length > 0) {
    const chatsFolder = zip.folder('chat_histories')!
    for (const history of chatHistories) {
      const h = history as { id: string }
      chatsFolder.file(`${h.id}.json`, JSON.stringify(history, null, 2))
    }
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  const date = new Date().toISOString().slice(0, 10)
  downloadBlob(blob, `papeleo-backup-${date}.zip`)
}

export async function importBackup(file: File): Promise<ImportResult> {
  const result: ImportResult = { docsImported: 0, chatsImported: 0, errors: [] }

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    throw new Error('El archivo no es un backup válido de Papeleo')
  }

  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) throw new Error('El archivo no es un backup válido de Papeleo')

  let manifest: BackupManifest
  try {
    manifest = JSON.parse(await manifestFile.async('string'))
  } catch {
    throw new Error('El archivo no es un backup válido de Papeleo')
  }

  if (manifest.version !== 1) {
    throw new Error(`Versión de backup no compatible (v${manifest.version})`)
  }

  const docFiles = Object.entries(zip.files).filter(([path]) => path.startsWith('documents/') && path.endsWith('.json'))
  for (const [path, zipFile] of docFiles) {
    try {
      const json = await zipFile.async('string')
      const doc = JSON.parse(json) as ScannedDocument
      if (!doc?.id) throw new Error('missing id field')
      await saveDocument({ ...doc, imageDataUrl: '' })
      result.docsImported++
    } catch (err) {
      result.errors.push(`${path}: ${String(err)}`)
    }
  }

  const chatFiles = Object.entries(zip.files).filter(([path]) => path.startsWith('chat_histories/') && path.endsWith('.json'))
  for (const [path, zipFile] of chatFiles) {
    try {
      const json = await zipFile.async('string')
      const history = JSON.parse(json)
      // Dynamic import with fallback — chatHistoryStorage may not exist yet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dynamicImport = new Function('specifier', 'return import(specifier)') as (s: string) => Promise<any>
      const { saveChatHistory } = await dynamicImport('./chatHistoryStorage').catch(() => ({ saveChatHistory: null }))
      if (saveChatHistory) {
        await saveChatHistory(history)
        result.chatsImported++
      } else {
        result.errors.push(`${path}: chatHistoryStorage not available`)
      }
    } catch (err) {
      result.errors.push(`${path}: ${String(err)}`)
    }
  }

  return result
}
