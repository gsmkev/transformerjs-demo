export interface LlmModelConfig {
  id: string
  label: string
  size: string
  desc: string
  /** Approximate context-window size in tokens for the MLC build */
  contextWindow: number
}

export const LLM_MODELS: LlmModelConfig[] = [
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen 2.5 0.5B — Ultra Fast',
    size: '~370 MB',
    desc: 'Smallest model, fastest responses. Good for simple document Q&A.',
    contextWindow: 32768,
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 1B — Balanced',
    size: '~720 MB',
    desc: "Meta's efficient 1B model. Good balance of speed and quality.",
    contextWindow: 131072,
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    label: 'Phi 3.5 Mini 3.8B — High Quality',
    size: '~2.4 GB',
    desc: "Microsoft's powerful small model. Best reasoning for complex documents.",
    contextWindow: 131072,
  },
]
