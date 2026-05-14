import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'ghost'
  spinning?: boolean
}

export default function Button({ children, variant = 'primary', spinning = false, className = '', ...rest }: Props) {
  const base = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-accent hover:bg-accent-hover text-white',
    ghost:   'bg-surface2 hover:bg-rim text-ink',
  }
  return (
    <button className={`${base} ${variants[variant]} ${spinning ? 'btn-spinning' : ''} ${className}`} {...rest}>
      {children}
    </button>
  )
}
