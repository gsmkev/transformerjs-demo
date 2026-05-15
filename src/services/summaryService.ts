import { streamGenerate, isLlmLoaded } from './llmService'

const SYSTEM_PROMPT = `You are a document summarizer. Given the OCR text of a scanned document, write a concise summary of 2-3 sentences in the SAME LANGUAGE as the document. Cover: what kind of document it is, who are the main parties or subjects, and the most important fact or figure. Be factual — do not add information not present in the text.`

export async function summarizeDocument(
  rawText: string,
  modelId: string,
): Promise<string> {
  if (!isLlmLoaded(modelId)) return ''

  const input = rawText.slice(0, 2000)

  let result = ''
  for await (const chunk of streamGenerate(
    SYSTEM_PROMPT,
    [{ role: 'user', content: input }],
    120,
  )) {
    result += chunk
  }
  return result.trim()
}
