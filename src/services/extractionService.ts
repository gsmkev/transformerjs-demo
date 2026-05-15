// src/services/extractionService.ts
import { streamGenerate, isLlmLoaded } from './llmService'
import type { ExtractionField } from '@/types/document'

export async function extractStructuredData(
  rawText: string,
  schema: ExtractionField[],
  modelId: string,
): Promise<Record<string, string>> {
  if (!isLlmLoaded(modelId)) {
    throw new Error('LLM not loaded — load a language model in the Models tab first.')
  }

  const schemaJson = JSON.stringify(
    Object.fromEntries(schema.map((f) => [f.key, { type: f.type, description: f.description }])),
    null, 2,
  )

  const exampleJson = JSON.stringify(
    Object.fromEntries(schema.map((f) => [f.key, f.type === 'number' ? '0' : ''])),
    null, 2,
  )

  const systemPrompt = `Extract specific fields from the document. Respond with ONLY a valid JSON object — no explanation, no markdown, no code blocks.

Schema (field_key: {type, description}):
${schemaJson}

Respond ONLY with this exact format:
${exampleJson}`

  const userMessage = `Document text:\n${rawText.slice(0, 8000)}`

  let fullResponse = ''
  for await (const chunk of streamGenerate(
    systemPrompt,
    [{ role: 'user', content: userMessage }],
    512,
  )) {
    fullResponse += chunk
  }

  const jsonMatch = fullResponse.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('El modelo no devolvió un JSON válido. Inténtalo de nuevo.')
  }

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>

  const result: Record<string, string> = {}
  for (const field of schema) {
    result[field.key] = String(parsed[field.key] ?? '')
  }
  return result
}
