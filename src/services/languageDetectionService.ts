import { ENGINES } from '@/config/engines'

export type DetectedLang = 'eng' | 'spa' | 'unknown'

export interface LangSuggestion {
  lang: DetectedLang
  label: string
  engineId: string | null
  engineLabel: string | null
}

const SPA_PATTERN = /[áéíóúüñÁÉÍÓÚÜÑ¿¡]/g

const SPA_WORDS = new Set(['que', 'con', 'una', 'los', 'las', 'por', 'del', 'para', 'más', 'como', 'pero', 'sus', 'también', 'está', 'son'])
const ENG_WORDS = new Set(['the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'been', 'they', 'their', 'what', 'which', 'when', 'were'])

export function detectLanguage(text: string): LangSuggestion {
  if (text.trim().length < 30) {
    return { lang: 'unknown', label: 'Desconocido', engineId: null, engineLabel: null }
  }

  const lower = text.toLowerCase()
  const words = lower.match(/\b[a-záéíóúüñ]{3,}\b/g) ?? []

  const spaCharMatches = (text.match(SPA_PATTERN) ?? []).length
  const spaWordCount   = words.filter((w) => SPA_WORDS.has(w)).length
  const engWordCount   = words.filter((w) => ENG_WORDS.has(w)).length

  const spaScore = spaCharMatches * 3 + spaWordCount * 2
  const engScore = engWordCount * 2

  let lang: DetectedLang = 'unknown'
  if (spaScore > engScore && spaScore >= 3) lang = 'spa'
  else if (engScore > spaScore && engScore >= 3) lang = 'eng'

  if (lang === 'unknown') {
    return { lang, label: 'Desconocido', engineId: null, engineLabel: null }
  }

  const candidates = ENGINES.filter((e) => e.langs === lang || e.langs.startsWith(lang))
  const best = candidates.find((e) => e.id.endsWith('-best')) ?? candidates[0] ?? null

  return {
    lang,
    label: lang === 'spa' ? 'Español' : 'English',
    engineId: best?.id ?? null,
    engineLabel: best?.label ?? null,
  }
}
