'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ScannedDocument, DocumentChunk, ChatMessage } from '@/types/document'
import { getExtractor, embed, cosineSimilarity, isEmbedderLoaded } from '@/services/embeddingService'
import { getReranker, rerankPassages, isRerankerLoaded } from '@/services/rerankService'
import { checkWebGpu, loadLlmModel, streamGenerate, isLlmLoaded } from '@/services/llmService'
import { BM25Index, reciprocalRankFusion } from '@/services/bm25'
import { LLM_MODELS } from '@/config/llmModels'

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error'
export type ResponseLength = 'concise' | 'normal' | 'detailed'

// ── Response-length presets ───────────────────────────────────────────────────

interface ResponsePreset {
  maxTokens: number
  charsPerSource: number
  topK: number
  hint: string
}

const RESPONSE_PRESETS: Record<ResponseLength, ResponsePreset> = {
  concise:  { maxTokens: 256,  charsPerSource: 800,  topK: 3, hint: 'Be brief — one or two sentences maximum.' },
  normal:   { maxTokens: 512,  charsPerSource: 1500, topK: 5, hint: '' },
  detailed: { maxTokens: 1500, charsPerSource: 3500, topK: 5, hint: 'Be thorough — as many sentences as the question requires.' },
}

function getPreset(length: ResponseLength, contextWindow: number): ResponsePreset {
  const base = RESPONSE_PRESETS[length]
  if (length === 'detailed' && contextWindow > 65536) {
    return { ...base, charsPerSource: base.charsPerSource * 2 }
  }
  return base
}

// ── Context builder ──────────────────────────────────────────────────────────

function buildSystemPrompt(
  sources: ScannedDocument[],
  excerpts: Map<string, string>,
  reranked: boolean,
  preset: ResponsePreset,
): string {
  const ctx = sources
    .map((d, i) => {
      const text = excerpts.get(d.id) ?? d.rawText.slice(0, preset.charsPerSource)
      return `=== SOURCE [${i + 1}]: "${d.title}" ===\n${text.trimEnd()}\n=== END [${i + 1}] ===`
    })
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

export function useRag(config?: { onAfterChat?: (messages: ChatMessage[]) => void }) {
  // Embedding model
  const [embedStatus, setEmbedStatus]     = useState<ModelStatus>('idle')
  const [embedProgress, setEmbedProgress] = useState(0)
  const [embedError, setEmbedError]       = useState<string | null>(null)

  // Cross-encoder reranker
  const [rerankerStatus, setRerankerStatus]     = useState<ModelStatus>('idle')
  const [rerankerProgress, setRerankerProgress] = useState(0)
  const [rerankerError, setRerankerError]       = useState<string | null>(null)

  // LLM
  const [llmStatus, setLlmStatus]             = useState<ModelStatus>('idle')
  const [llmProgress, setLlmProgress]         = useState(0)
  const [llmProgressText, setLlmProgressText] = useState('')
  const [llmError, setLlmError]               = useState<string | null>(null)
  // Default to Llama 3.2 1B — better instruction-following than Qwen 0.5B
  const [selectedLlmId, setSelectedLlmId]     = useState(LLM_MODELS[1].id)
  const [webGpuAvailable, setWebGpuAvailable] = useState<boolean | null>(null)

  // Response settings
  const [responseLength, setResponseLength] = useState<ResponseLength>('normal')

  // Chat
  const [messages, setMessages]       = useState<ChatMessage[]>([])
  const [streaming, setStreaming]     = useState(false)
  const [queryError, setQueryError]   = useState<string | null>(null)
  const [lastSources, setLastSources] = useState<ScannedDocument[]>([])

  const messagesRef   = useRef<ChatMessage[]>([])
  const abortRef      = useRef(false)
  const isRunningRef  = useRef(false)

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
    if (!isLlmLoaded(id)) {
      setLlmStatus('idle')
      setLlmProgress(0)
      setLlmProgressText('')
      setLlmError(null)
    }
  }, [selectedLlmId])

  // ── Retrieval pipeline ──────────────────────────────────────────────────
  // Operates at chunk level for precise retrieval, then groups back to documents.
  //
  // Pipeline:
  //   1. BM25 over chunk texts (Unicode-aware tokenizer)
  //   2. Semantic search over chunk embeddings (if embedder ready)
  //   3. RRF fusion of both rankings
  //   4. Cross-encoder reranking of top chunks (if reranker ready)
  //   5. Group top chunks by document, build per-doc excerpt strings

  const retrieve = useCallback(async (
    query: string,
    documents: ScannedDocument[],
    chunks: DocumentChunk[],
    topK: number,
  ): Promise<{ sources: ScannedDocument[]; excerpts: Map<string, string>; reranked: boolean }> => {
    const empty = { sources: [], excerpts: new Map<string, string>(), reranked: false }

    // Fall back to document-level BM25 if no chunks are indexed yet
    if (chunks.length === 0) {
      if (documents.length === 0) return empty
      const bm25 = new BM25Index(documents.map((d) => d.rawText))
      const results = bm25.search(query, topK)
      const sources = results.map(({ idx }) => documents[idx]).filter(Boolean)
      const excerpts = new Map(sources.map((d) => [d.id, d.rawText.slice(0, 800)]))
      return { sources, excerpts, reranked: false }
    }

    // 1. BM25 over chunks
    const bm25 = new BM25Index(chunks.map((c) => c.text))
    const bm25Results = bm25.search(query, 20)

    // 2. Semantic search over chunk embeddings
    let semanticResults: Array<{ idx: number; score: number }> = []
    if (isEmbedderLoaded() && chunks.length > 0) {
      try {
        const qVec = await embed(query)
        semanticResults = chunks
          .map((c, i) => ({ idx: i, score: cosineSimilarity(qVec, c.embedding) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 20)
      } catch { /* embedder not ready yet — degrade gracefully */ }
    }

    // 3. RRF fusion
    const rankings = [bm25Results, ...(semanticResults.length > 0 ? [semanticResults] : [])]
    const fused = reciprocalRankFusion(rankings).slice(0, 15)
    let topChunks = fused.map(({ idx }) => chunks[idx]).filter(Boolean)

    if (topChunks.length === 0) return empty

    // 4. Cross-encoder reranking over chunk texts (chunks fit in 512 chars without truncation)
    let reranked = false
    if (isRerankerLoaded()) {
      try {
        const scores = await rerankPassages(query, topChunks.map((c) => c.text))
        if (scores.some((s) => s > 0)) {
          topChunks = topChunks
            .map((c, i) => ({ c, score: scores[i] }))
            .sort((a, b) => b.score - a.score)
            .map((x) => x.c)
          reranked = true
        }
      } catch { /* reranker failed — fall through */ }
    }

    // 5. Group by document: keep up to 2 best chunks per doc, preserve original order
    const chunksByDoc = new Map<string, DocumentChunk[]>()
    for (const chunk of topChunks.slice(0, topK * 3)) {
      const arr = chunksByDoc.get(chunk.docId) ?? []
      if (arr.length < 2) {
        arr.push(chunk)
        chunksByDoc.set(chunk.docId, arr)
      }
      if (chunksByDoc.size >= topK) break
    }

    // Build excerpt strings: chunks sorted by position, joined with ellipsis
    const excerpts = new Map<string, string>()
    for (const [docId, docChunks] of chunksByDoc) {
      const sorted = docChunks.sort((a, b) => a.chunkIndex - b.chunkIndex)
      excerpts.set(docId, sorted.map((c) => c.text).join(' … '))
    }

    const sources = [...chunksByDoc.keys()]
      .map((docId) => documents.find((d) => d.id === docId))
      .filter((d): d is ScannedDocument => d !== undefined)

    return { sources, excerpts, reranked }
  }, [])

  // ── Embedding helper (kept for backward compat — indexDocument() is preferred) ──

  const embedDoc = useCallback(async (doc: ScannedDocument): Promise<number[]> => {
    return embed(doc.rawText)
  }, [])

  // ── Chat ────────────────────────────────────────────────────────────────

  const chat = useCallback(async (
    query: string,
    documents: ScannedDocument[],
    chunks: DocumentChunk[],
  ) => {
    if (streaming || isRunningRef.current) return
    isRunningRef.current = true
    try {
      setQueryError(null)

      const selectedModel = LLM_MODELS.find((m) => m.id === selectedLlmId) ?? LLM_MODELS[1]
      const preset = getPreset(responseLength, selectedModel.contextWindow)

      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: query }
      updateMessages((prev) => [...prev, userMsg])

      let sources: ScannedDocument[] = []
      let excerpts = new Map<string, string>()
      let reranked = false
      try {
        const result = await retrieve(query, documents, chunks, preset.topK)
        sources  = result.sources
        excerpts = result.excerpts
        reranked = result.reranked
        setLastSources(sources)
      } catch (e) {
        setQueryError(e instanceof Error ? e.message : String(e))
        updateMessages((prev) => prev.slice(0, -1))
        return
      }

      const assistantId = crypto.randomUUID()

      if (llmStatus !== 'ready') {
        const content = sources.length > 0
          ? sources
              .map((d, i) => {
                const excerpt = excerpts.get(d.id) ?? d.rawText.slice(0, 300)
                return `**[${i + 1}] ${d.title}**\n> ${excerpt.slice(0, 300)}`
              })
              .join('\n\n')
          : 'No se encontraron documentos relevantes para tu consulta.'
        const noLlmMsg: ChatMessage = { id: assistantId, role: 'assistant', content, sources }
        const finalMsgsNoLlm = [...messagesRef.current, noLlmMsg]
        setMessages(finalMsgsNoLlm)
        messagesRef.current = finalMsgsNoLlm
        config?.onAfterChat?.(finalMsgsNoLlm)
        return
      }

      const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', sources }
      updateMessages((prev) => [...prev, assistantMsg])
      setStreaming(true)
      abortRef.current = false

      let accumulated = ''
      try {
        const systemPrompt = buildSystemPrompt(sources, excerpts, reranked, preset)
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
        messagesRef.current = messagesRef.current.map((m) =>
          m.id === assistantId ? { ...m, content: accumulated } : m,
        )
        config?.onAfterChat?.(messagesRef.current)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        updateMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: `⚠️ ${msg}` } : m),
        )
        setQueryError(msg)
      } finally {
        setStreaming(false)
      }
    } finally {
      isRunningRef.current = false
    }
  }, [streaming, retrieve, llmStatus, updateMessages, responseLength, selectedLlmId])

  const stopStreaming = useCallback(() => { abortRef.current = true }, [])

  const clearChat = useCallback(() => {
    setMessages([])
    messagesRef.current = []
    setLastSources([])
    setQueryError(null)
  }, [])

  const loadMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages(msgs)
    messagesRef.current = msgs
  }, [])

  return {
    embedStatus, embedProgress, embedError, loadEmbedModel,
    rerankerStatus, rerankerProgress, rerankerError, loadReranker,
    llmStatus, llmProgress, llmProgressText, llmError,
    selectedLlmId, setSelectedLlmId: handleSelectLlm,
    webGpuAvailable, loadLlm,
    responseLength, setResponseLength,
    messages, streaming, queryError, lastSources,
    embedDoc, chat, stopStreaming, clearChat, loadMessages,
  } as const
}
