'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ScannedDocument } from '@/types/document'
import { getExtractor, embed, cosineSimilarity, isEmbedderLoaded } from '@/services/embeddingService'
import { getReranker, rerankPassages, isRerankerLoaded } from '@/services/rerankService'
import { checkWebGpu, loadLlmModel, streamGenerate, isLlmLoaded } from '@/services/llmService'
import { BM25Index, reciprocalRankFusion } from '@/services/bm25'
import { LLM_MODELS } from '@/config/llmModels'

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error'
export type ResponseLength = 'concise' | 'normal' | 'detailed'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: ScannedDocument[]
}

// ── Response-length presets ───────────────────────────────────────────────────

interface ResponsePreset {
  maxTokens: number
  charsPerSource: number
  topK: number
  hint: string
}

// Base presets; charsPerSource for 'detailed' is scaled up by getPreset() when
// the selected model has a large context window (> 65 K tokens).
const RESPONSE_PRESETS: Record<ResponseLength, ResponsePreset> = {
  concise:  { maxTokens: 256,  charsPerSource: 800,  topK: 3, hint: 'Be brief — one or two sentences maximum.' },
  normal:   { maxTokens: 512,  charsPerSource: 1500, topK: 5, hint: '' },
  detailed: { maxTokens: 1500, charsPerSource: 3500, topK: 5, hint: 'Be thorough — as many sentences as the question requires.' },
}

function getPreset(length: ResponseLength, contextWindow: number): ResponsePreset {
  const base = RESPONSE_PRESETS[length]
  // For large-context models (128 K), double the source budget in detailed mode.
  if (length === 'detailed' && contextWindow > 65536) {
    return { ...base, charsPerSource: base.charsPerSource * 2 }
  }
  return base
}

// ── Context builder ──────────────────────────────────────────────────────────

function buildSystemPrompt(
  sources: ScannedDocument[],
  reranked: boolean,
  preset: ResponsePreset,
): string {
  const ctx = sources
    .map(
      (d, i) =>
        `=== SOURCE [${i + 1}]: "${d.title}" ===\n${d.rawText.slice(0, preset.charsPerSource).trimEnd()}\n=== END [${i + 1}] ===`,
    )
    .join('\n\n')

  const lengthRule = preset.hint
    ? `6. ${preset.hint}`
    : '6. Be as thorough as the answer requires — a single sentence for simple facts, multiple sentences for complex explanations.'

  return `You are a helpful document assistant. Answer questions using ONLY the content of the SOURCE documents below.

RULES — apply all of them together:
1. Base every claim on the documents. Never add facts, opinions, or assumptions.
2. SPECIFIC VALUES (text to type, codes, passwords, confirmation phrases): quote EXACTLY, word for word.
3. EXPLANATORY QUESTIONS (why, when, how): you may paraphrase, but stay faithful to the document's meaning.
4. Always speak in THIRD PERSON — e.g. "The document says…", "According to [1]…", "This appears when…".
   NEVER say "I" or "yo" as if you ARE the document.
5. Cite every claim with [N] (the source number).
${lengthRule}
7. If the answer is not in any source, say ONLY: "This information is not in the provided documents."

${ctx}

(Sources retrieved using ${reranked ? 'cross-encoder reranking' : 'hybrid BM25 + semantic search'})`
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useRag() {
  // Embedding model
  const [embedStatus, setEmbedStatus]   = useState<ModelStatus>('idle')
  const [embedProgress, setEmbedProgress] = useState(0)
  const [embedError, setEmbedError]     = useState<string | null>(null)

  // Cross-encoder reranker
  const [rerankerStatus, setRerankerStatus]     = useState<ModelStatus>('idle')
  const [rerankerProgress, setRerankerProgress] = useState(0)
  const [rerankerError, setRerankerError]       = useState<string | null>(null)

  // LLM
  const [llmStatus, setLlmStatus]           = useState<ModelStatus>('idle')
  const [llmProgress, setLlmProgress]       = useState(0)
  const [llmProgressText, setLlmProgressText] = useState('')
  const [llmError, setLlmError]             = useState<string | null>(null)
  const [selectedLlmId, setSelectedLlmId]   = useState(LLM_MODELS[0].id)
  const [webGpuAvailable, setWebGpuAvailable] = useState<boolean | null>(null)

  // Response settings
  const [responseLength, setResponseLength] = useState<ResponseLength>('normal')

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [lastSources, setLastSources] = useState<ScannedDocument[]>([])

  const messagesRef = useRef<ChatMessage[]>([])
  const abortRef    = useRef(false)

  // Sync ref with state for stale-closure-free access inside async functions
  const updateMessages = useCallback((updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setMessages((prev) => {
      const next = updater(prev)
      messagesRef.current = next
      return next
    })
  }, [])

  useEffect(() => { checkWebGpu().then(setWebGpuAvailable) }, [])

  // ── Model loaders ───────────────────────────────────────────────────────

  const loadEmbedModel = useCallback(async () => {
    if (embedStatus === 'loading' || embedStatus === 'ready') return
    setEmbedStatus('loading'); setEmbedError(null)
    try {
      await getExtractor((pct) => setEmbedProgress(pct))
      setEmbedStatus('ready')
    } catch (e) {
      setEmbedError(e instanceof Error ? e.message : String(e))
      setEmbedStatus('error')
    }
  }, [embedStatus])

  const loadReranker = useCallback(async () => {
    if (rerankerStatus === 'loading' || rerankerStatus === 'ready') return
    setRerankerStatus('loading'); setRerankerError(null)
    try {
      await getReranker((pct) => setRerankerProgress(pct))
      setRerankerStatus('ready')
    } catch (e) {
      setRerankerError(e instanceof Error ? e.message : String(e))
      setRerankerStatus('error')
    }
  }, [rerankerStatus])

  const loadLlm = useCallback(async () => {
    if (llmStatus === 'loading' || llmStatus === 'ready') return
    setLlmStatus('loading'); setLlmError(null)
    try {
      await loadLlmModel(selectedLlmId, (text, pct) => {
        setLlmProgressText(text)
        setLlmProgress(pct)
      })
      setLlmStatus('ready')
    } catch (e) {
      setLlmError(e instanceof Error ? e.message : String(e))
      setLlmStatus('error')
    }
  }, [llmStatus, selectedLlmId])

  const handleSelectLlm = useCallback((id: string) => {
    if (id === selectedLlmId) return
    setSelectedLlmId(id)
    // Only reset if it's not already loaded with this model
    if (!isLlmLoaded(id)) {
      setLlmStatus('idle')
      setLlmProgress(0)
      setLlmProgressText('')
      setLlmError(null)
    }
  }, [selectedLlmId])

  // ── Retrieval pipeline ──────────────────────────────────────────────────
  // Returns up to topK best documents for a query using:
  //   1. BM25 keyword search (always)
  //   2. Semantic search via bi-encoder (if embedding model loaded + docs indexed)
  //   3. RRF fusion
  //   4. Cross-encoder reranking (if reranker loaded)

  const retrieve = useCallback(async (
    query: string,
    documents: ScannedDocument[],
    topK: number,
  ): Promise<{ sources: ScannedDocument[]; reranked: boolean }> => {
    if (documents.length === 0) return { sources: [], reranked: false }

    // 1. BM25
    const bm25 = new BM25Index(documents.map((d) => d.rawText))
    const bm25Results = bm25.search(query, 20)

    // 2. Semantic (only if embedder already loaded and documents are indexed)
    const indexed = documents.filter((d) => d.embedding !== null)
    let semanticResults: Array<{ idx: number; score: number }> = []

    if (isEmbedderLoaded() && indexed.length > 0) {
      try {
        const qVec = await embed(query)
        semanticResults = indexed
          .map((d) => ({ idx: documents.indexOf(d), score: cosineSimilarity(qVec, d.embedding!) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 20)
      } catch { /* embedder not ready yet — degrade gracefully */ }
    }

    // 3. RRF fusion
    const rankings = [bm25Results, ...(semanticResults.length > 0 ? [semanticResults] : [])]
    const fused    = reciprocalRankFusion(rankings).slice(0, 10)
    const candidates = fused.map(({ idx }) => documents[idx]).filter(Boolean)

    if (candidates.length === 0) return { sources: [], reranked: false }

    // 4. Cross-encoder reranking (if loaded, graceful fallback)
    if (isRerankerLoaded()) {
      try {
        const scores = await rerankPassages(query, candidates.map((d) => d.rawText))
        if (scores.some((s) => s > 0)) {
          const reranked = candidates
            .map((d, i) => ({ d, score: scores[i] }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)
            .map((x) => x.d)
          return { sources: reranked, reranked: true }
        }
      } catch { /* reranker failed — fall through */ }
    }

    return { sources: candidates.slice(0, topK), reranked: false }
  }, [])

  // ── Embedding helper (called from App.tsx to update doc in IndexedDB) ──

  const embedDoc = useCallback(async (doc: ScannedDocument): Promise<number[]> => {
    return embed(doc.rawText)
  }, [])

  // ── Chat ────────────────────────────────────────────────────────────────

  const chat = useCallback(async (query: string, documents: ScannedDocument[]) => {
    if (streaming) return
    setQueryError(null)

    const selectedModel = LLM_MODELS.find((m) => m.id === selectedLlmId) ?? LLM_MODELS[0]
    const preset = getPreset(responseLength, selectedModel.contextWindow)

    // Add user message
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: query }
    updateMessages((prev) => [...prev, userMsg])

    // Retrieve sources
    let sources: ScannedDocument[] = []
    let reranked = false
    try {
      const result = await retrieve(query, documents, preset.topK)
      sources = result.sources
      reranked = result.reranked
      setLastSources(sources)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setQueryError(msg)
      updateMessages((prev) => prev.slice(0, -1))
      return
    }

    const assistantId = crypto.randomUUID()

    // If LLM not loaded — show retrieved sources as the answer
    if (llmStatus !== 'ready') {
      const content = sources.length > 0
        ? `Found ${sources.length} relevant document${sources.length !== 1 ? 's' : ''}. Load a language model to generate an answer.`
        : 'No relevant documents found for your query.'
      updateMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content, sources }])
      return
    }

    // Stream LLM response
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', sources }
    updateMessages((prev) => [...prev, assistantMsg])
    setStreaming(true)
    abortRef.current = false

    let accumulated = ''
    try {
      const systemPrompt = buildSystemPrompt(sources, reranked, preset)
      // Build history from ref to avoid stale closure
      const history = messagesRef.current
        .filter((m) => m.id !== assistantId)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      for await (const chunk of streamGenerate(systemPrompt, history, preset.maxTokens)) {
        if (abortRef.current) break
        accumulated += chunk
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m),
        )
      }
      // Sync ref with final state
      messagesRef.current = messagesRef.current.map((m) =>
        m.id === assistantId ? { ...m, content: accumulated } : m,
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      updateMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: `⚠️ ${msg}` } : m),
      )
      setQueryError(msg)
    } finally {
      setStreaming(false)
    }
  }, [streaming, retrieve, llmStatus, updateMessages, responseLength, selectedLlmId])

  const stopStreaming = useCallback(() => { abortRef.current = true }, [])

  const clearChat = useCallback(() => {
    setMessages([])
    messagesRef.current = []
    setLastSources([])
    setQueryError(null)
  }, [])

  return {
    embedStatus, embedProgress, embedError, loadEmbedModel,
    rerankerStatus, rerankerProgress, rerankerError, loadReranker,
    llmStatus, llmProgress, llmProgressText, llmError,
    selectedLlmId, setSelectedLlmId: handleSelectLlm,
    webGpuAvailable, loadLlm,
    responseLength, setResponseLength,
    messages, streaming, queryError, lastSources,
    embedDoc, chat, stopStreaming, clearChat,
  } as const
}
