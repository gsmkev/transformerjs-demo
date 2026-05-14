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
}

export interface RagResult {
  doc: ScannedDocument
  score: number           // cosine similarity 0-1
  excerpt: string         // first ~280 chars of rawText
}
