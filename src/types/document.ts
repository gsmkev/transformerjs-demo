export interface ScannedDocument {
  id: string
  title: string
  imageDataUrl: string   // base64 data URL of the original image
  rawText: string        // original OCR output — never mutated
  richText: string       // Tiptap JSON string — user-editable
  engineId: string
  confidence: number | null
  createdAt: number      // Date.now()
  updatedAt: number
  embedding: number[] | null  // 384-dim float32 from all-MiniLM-L6-v2
  category?: string | null    // keyword-classified document type
  tags?: string[]             // user-defined labels, undefined = []
  extractionSchema?: ExtractionField[] | null
  extractedData?: Record<string, string> | null
}

export interface ExtractionField {
  key: string          // snake_case identifier, auto-generated from label
  label: string        // human-readable name
  type: 'text' | 'number'
  description: string  // instruction for the LLM
}

export interface DocumentChunk {
  id: string          // `${docId}_c${chunkIndex}`
  docId: string
  chunkIndex: number
  text: string        // ~300 chars fragment
  embedding: number[] // 384-dim, always present
}

export interface RagResult {
  doc: ScannedDocument
  score: number           // cosine similarity 0-1
  excerpt: string         // first ~280 chars of rawText
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: ScannedDocument[]
}

export interface ChatHistory {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}
