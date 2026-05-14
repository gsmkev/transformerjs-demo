import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base:     '#0f1117',
        surface:  '#1a1d27',
        surface2: '#252836',
        rim:      '#2e3145',
        accent:   { DEFAULT: '#6c63ff', hover: '#5a52e0' },
        ink:      '#e8eaf0',
        dim:      '#7b7f9e',
        ok:       '#34d399',
        err:      '#f87171',
        info:     '#60a5fa',
      },
      animation: {
        'badge-pulse': 'badge-pulse 1.2s ease-in-out infinite',
      },
      keyframes: {
        'badge-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.45' },
        },
      },
    },
  },
  plugins: [],
}

export default config
