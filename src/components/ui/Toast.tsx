'use client'

import { useEffect } from 'react'

interface Props {
  message: string
  onDismiss: () => void
}

export default function Toast({ message, onDismiss }: Props) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 2500)
    return () => clearTimeout(id)
  }, [onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-sm text-ink shadow-lg animate-fade-in pointer-events-none"
    >
      {message}
    </div>
  )
}
