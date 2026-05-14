import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Backgrounds ─────────────────────────────────────────────────────
        void:    '#04050b',          // deepest bg (behind everything)
        base:    '#07080f',          // app background
        surface: '#0d1018',          // solid surface (inputs, editors, code blocks)
        surface2:'#141926',          // secondary solid surface
        rim:     '#1d2235',          // subtle solid border

        // ── Accent ──────────────────────────────────────────────────────────
        accent: {
          DEFAULT: '#6366f1',        // indigo
          light:   '#818cf8',
          dark:    '#4f46e5',
          glow:    'rgba(99,102,241,0.22)',
          muted:   'rgba(99,102,241,0.10)',
        },

        // ── Text ────────────────────────────────────────────────────────────
        ink:   '#eaecf5',
        dim:   '#7880a0',
        muted: '#434c66',

        // ── Semantic ─────────────────────────────────────────────────────────
        ok:   '#22c55e',
        err:  '#f43f5e',
        warn: '#f59e0b',
        info: '#38bdf8',
      },

      fontFamily: {
        sans: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },

      boxShadow: {
        // Glass card shadows
        'glass':         '0 0 0 1px rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.45)',
        'glass-hover':   '0 0 0 1px rgba(255,255,255,0.07) inset, 0 16px 48px rgba(0,0,0,0.55)',
        'glass-lg':      '0 0 0 1px rgba(255,255,255,0.05) inset, 0 24px 64px rgba(0,0,0,0.65)',
        // Accent glow
        'accent-glow':   '0 0 20px rgba(99,102,241,0.40), 0 0 48px rgba(99,102,241,0.15)',
        'accent-glow-sm':'0 0 10px rgba(99,102,241,0.35)',
        // Semantic glows
        'ok-glow':       '0 0 14px rgba(34,197,94,0.35)',
        'err-glow':      '0 0 14px rgba(244,63,94,0.35)',
        // Button shadows
        'btn-primary':   '0 1px 2px rgba(0,0,0,0.3), 0 0 16px rgba(99,102,241,0.25)',
        'btn-primary-hover': '0 1px 4px rgba(0,0,0,0.4), 0 0 24px rgba(99,102,241,0.40)',
      },

      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        'gradient-accent-subtle': 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.08) 100%)',
        'gradient-ok':    'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
        'gradient-err':   'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
        // Background mesh (used on body)
        'mesh': [
          'radial-gradient(ellipse 75% 55% at 10% -10%, rgba(99,102,241,0.13) 0%, transparent 65%)',
          'radial-gradient(ellipse 55% 45% at 92% 105%, rgba(139,92,246,0.09) 0%, transparent 60%)',
          'radial-gradient(ellipse 40% 35% at 50% 50%, rgba(56,189,248,0.03) 0%, transparent 70%)',
        ].join(', '),
      },

      animation: {
        'badge-pulse': 'badge-pulse 1.5s ease-in-out infinite',
        'spin':        'spin 0.65s linear infinite',
        'fade-in':     'fade-in 0.25s ease-out both',
        'slide-up':    'slide-up 0.3s cubic-bezier(0.16,1,0.3,1) both',
        'slide-down':  'slide-down 0.25s cubic-bezier(0.16,1,0.3,1) both',
        'glow-pulse':  'glow-pulse 2.5s ease-in-out infinite',
        'shimmer':     'shimmer 1.8s linear infinite',
      },

      keyframes: {
        'badge-pulse': {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.35' },
        },
        'spin': {
          to: { transform: 'rotate(360deg)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%,100%': { boxShadow: '0 0 8px rgba(99,102,241,0.25)' },
          '50%':     { boxShadow: '0 0 22px rgba(99,102,241,0.55), 0 0 44px rgba(99,102,241,0.15)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
      },
    },
  },
  plugins: [],
}

export default config
