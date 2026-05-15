// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pipelinePromise: Promise<any> | null = null
let _isReady = false

export type WhisperStatus = 'idle' | 'loading' | 'ready' | 'error'

export function isWhisperLoaded(): boolean { return _isReady }

export async function loadWhisper(
  onProgress?: (pct: number) => void,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (!_pipelinePromise) {
    _pipelinePromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers')
      env.allowLocalModels = false
      const pipe = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress_callback: (info: any) => {
          if (typeof info?.progress === 'number') onProgress?.(Math.round(info.progress))
        },
      })
      _isReady = true
      return pipe
    })()
    _pipelinePromise.catch(() => { _pipelinePromise = null; _isReady = false })
  }
  return _pipelinePromise
}

async function decodeAudioFile(file: File): Promise<Float32Array> {
  const arrayBuffer = await file.arrayBuffer()
  const audioCtx = new AudioContext({ sampleRate: 16000 })
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  const channelData = audioBuffer.getChannelData(0)
  await audioCtx.close()
  return channelData
}

export async function transcribe(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const pipe = await loadWhisper(onProgress)
  const audioData = await decodeAudioFile(file)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (pipe as any)(audioData, {
    chunk_length_s: 30,
    stride_length_s: 5,
    language: null,
    task: 'transcribe',
  })
  if (typeof result?.text === 'string') return result.text.trim()
  if (Array.isArray(result)) return result.map((r: { text: string }) => r.text).join(' ').trim()
  return ''
}
