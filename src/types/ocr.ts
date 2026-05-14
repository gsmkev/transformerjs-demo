import type Tesseract from 'tesseract.js'

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface EngineConfig {
  id: string
  label: string
  size: string
  langs: string
  langPath: string
  desc: string
}

export interface EngineState {
  status: EngineStatus
  progress: number
  stepLabel: string
  errorMsg: string
}

export type EngineStateMap = Record<string, EngineState>

export type WorkerMap = Map<string, Tesseract.Worker>

export interface OcrResult {
  text: string
  confidence: number | null
}

export type Tab = 'engines' | 'ocr' | 'documents' | 'rag'
