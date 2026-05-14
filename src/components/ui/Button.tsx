import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'ghost'
  spinning?: boolean
}

export default function Button({
  children,
  variant = 'primary',
  spinning = false,
  className = '',
  ...rest
}: Props) {
  const base =
    'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-40 disabled:cursor-not-allowed'

  const variants = {
    primary:
      'bg-gradient-to-r from-accent to-violet-500 text-white shadow-btn-primary hover:shadow-btn-primary-hover hover:opacity-90',
    ghost:
      'bg-white/5 hover:bg-white/9 border border-white/9 hover:border-white/16 text-ink/80 hover:text-ink',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${spinning ? 'btn-spinning' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
