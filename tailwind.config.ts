import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void:     'var(--color-void)',
        base:     'var(--color-base)',
        surface:  'var(--color-surface)',
        surface2: 'var(--color-surface2)',
        rim:      'var(--color-rim)',

        accent: {
          DEFAULT: 'var(--color-accent)',
          light:   'var(--color-accent-light)',
          dark:    'var(--color-accent-dark)',
          glow:    'var(--color-accent-glow)',
          muted:   'var(--color-accent-muted)',
        },

        ink:   'var(--color-ink)',
        dim:   'var(--color-dim)',
        muted: 'var(--color-muted)',

        ok:   'var(--color-ok)',
        err:  'var(--color-err)',
        warn: 'var(--color-warn)',
        info: 'var(--color-info)',

        glass: {
          bg:     'var(--glass-bg)',
          border: 'var(--glass-border)',
        },
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
        'accent-glow':   '0 0 20px rgba(13,148,136,0.40), 0 0 48px rgba(13,148,136,0.15)',
        'accent-glow-sm':'0 0 10px rgba(13,148,136,0.35)',
        // Semantic glows
        'ok-glow':       '0 0 14px rgba(34,197,94,0.35)',
        'err-glow':      '0 0 14px rgba(244,63,94,0.35)',
        // Button shadows
        'btn-primary':   '0 1px 2px rgba(0,0,0,0.3), 0 0 16px rgba(13,148,136,0.25)',
        'btn-primary-hover': '0 1px 4px rgba(0,0,0,0.4), 0 0 24px rgba(13,148,136,0.40)',
      },

      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)',
        'gradient-accent-subtle': 'linear-gradient(135deg, rgba(13,148,136,0.15) 0%, rgba(45,212,191,0.08) 100%)',
        'gradient-ok':    'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
        'gradient-err':   'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
        // Background mesh (used on body)
        'mesh': [
          'radial-gradient(ellipse 75% 55% at 10% -10%, rgba(13,148,136,0.11) 0%, transparent 65%)',
          'radial-gradient(ellipse 55% 45% at 92% 105%, rgba(20,184,166,0.08) 0%, transparent 60%)',
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
          '0%,100%': { boxShadow: '0 0 8px rgba(13,148,136,0.25)' },
          '50%':     { boxShadow: '0 0 22px rgba(13,148,136,0.55), 0 0 44px rgba(13,148,136,0.15)' },
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
