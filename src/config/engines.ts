import type { EngineConfig } from '@/types/ocr'

export const FAST_LANG_PATH = 'https://tessdata.projectnaptha.com/4.0.0_fast'
export const BEST_LANG_PATH = 'https://tessdata.projectnaptha.com/4.0.0_best'

export const ENGINES: EngineConfig[] = [
  {
    id: 'eng-fast',
    label: 'English — Fast',
    size: '~8 MB',
    langs: 'eng',
    langPath: FAST_LANG_PATH,
    desc: 'Lightweight LSTM model for printed English text. Best for quick scans.',
  },
  {
    id: 'spa-fast',
    label: 'Español — Rápido',
    size: '~8 MB',
    langs: 'spa',
    langPath: FAST_LANG_PATH,
    desc: 'Modelo LSTM ligero para texto impreso en español. Ideal para escaneos rápidos.',
  },
  {
    id: 'eng+spa-fast',
    label: 'English + Español',
    size: '~16 MB',
    langs: 'eng+spa',
    langPath: FAST_LANG_PATH,
    desc: 'Bilingual fast model. Handles mixed English/Spanish documents.',
  },
  {
    id: 'eng-best',
    label: 'English — High Precision',
    size: '~15 MB',
    langs: 'eng',
    langPath: BEST_LANG_PATH,
    desc: 'Full LSTM model trained on more data. Higher accuracy, slightly slower.',
  },
  {
    id: 'spa-best',
    label: 'Español — Alta Precisión',
    size: '~15 MB',
    langs: 'spa',
    langPath: BEST_LANG_PATH,
    desc: 'Modelo LSTM completo para español. Mayor precisión en documentos complejos.',
  },
]
