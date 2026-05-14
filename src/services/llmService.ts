// WebLLM — runs LLMs locally in the browser using WebGPU.
// Model weights are downloaded from the MLC CDN and cached in the browser.
// Requires Chrome 113+ / Edge 113+ with WebGPU enabled.

export interface LlmChatMsg {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _engine: any | null = null
let _loadedModelId: string | null = null

export async function checkWebGpu(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !('gpu' in navigator)) return false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapter = await (navigator as any).gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
}

export function isLlmLoaded(modelId: string): boolean {
  return _loadedModelId === modelId && _engine !== null
}

export async function loadLlmModel(
  modelId: string,
  onProgress: (text: string, pct: number) => void,
): Promise<void> {
  if (isLlmLoaded(modelId)) return

  // Unload previous model
  _engine = null
  _loadedModelId = null

  const { CreateMLCEngine } = await import('@mlc-ai/web-llm')
  _engine = await CreateMLCEngine(modelId, {
    initProgressCallback: ({ text, progress }: { text: string; progress: number }) => {
      onProgress(text, Math.round(progress * 100))
    },
  })
  _loadedModelId = modelId
}

export async function* streamGenerate(
  systemPrompt: string,
  history: LlmChatMsg[],
): AsyncGenerator<string> {
  if (!_engine) throw new Error('LLM not loaded — load a language model first.')

  const stream = await _engine.chat.completions.create({
    messages: [{ role: 'system', content: systemPrompt }, ...history],
    stream: true,
    temperature: 0.1,
    max_tokens: 768,
  })

  for await (const chunk of stream) {
    const delta: string = chunk.choices[0]?.delta?.content ?? ''
    if (delta) yield delta
  }
}
