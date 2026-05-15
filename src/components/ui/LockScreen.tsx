'use client'

import { useState, useEffect, useCallback } from 'react'
import Button from './Button'

interface Props {
  hasWebAuthn: boolean
  onUnlock: (pin: string) => Promise<boolean>
  onUnlockBiometric: () => Promise<boolean>
  onReset: () => void
}

const MAX_ATTEMPTS = 5
const LOCKOUT_SECONDS = 30

export default function LockScreen({ hasWebAuthn, onUnlock, onUnlockBiometric, onReset }: Props) {
  const [digits, setDigits] = useState<string[]>([])
  const [shake, setShake] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [biometricLoading, setBiometricLoading] = useState(false)

  useEffect(() => {
    if (!lockoutUntil) return
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000)
      if (remaining <= 0) { setLockoutUntil(null); setCountdown(0) }
      else setCountdown(remaining)
    }, 500)
    return () => clearInterval(interval)
  }, [lockoutUntil])

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil

  const submitPin = useCallback(async (pin: string) => {
    const ok = await onUnlock(pin)
    if (!ok) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setDigits([])
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      if (newAttempts >= MAX_ATTEMPTS) {
        setLockoutUntil(Date.now() + LOCKOUT_SECONDS * 1000)
        setCountdown(LOCKOUT_SECONDS)
        setAttempts(0)
      }
    }
  }, [onUnlock, attempts])

  const handleDigit = useCallback((d: string) => {
    if (isLockedOut) return
    const next = [...digits, d]
    setDigits(next)
    if (next.length >= 4) {
      submitPin(next.join(''))
    }
  }, [digits, isLockedOut, submitPin])

  const handleDelete = useCallback(() => {
    setDigits((prev) => prev.slice(0, -1))
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleDigit(e.key)
      else if (e.key === 'Backspace') handleDelete()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleDigit, handleDelete])

  const handleBiometric = async () => {
    setBiometricLoading(true)
    await onUnlockBiometric()
    setBiometricLoading(false)
  }

  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'] as const

  return (
    <div className="fixed inset-0 z-[100] bg-base flex flex-col items-center justify-center gap-8 select-none">
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="14" y="8" width="26" height="34" rx="2" fill="white" opacity="0.95"/>
            <polygon points="40,8 40,17 49,17" fill="rgba(15,118,110,0.8)"/>
            <line x1="18" y1="21" x2="35" y2="21" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="18" y1="27" x2="35" y2="27" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="18" y1="33" x2="29" y2="33" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-sm font-bold text-accent">Papeleo</p>
        <p className="text-xs text-dim">Introduce tu PIN</p>
      </div>

      <div className={`flex gap-3 ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
        {Array.from({ length: Math.max(4, digits.length + 1) }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-150 ${
              i < digits.length ? 'bg-accent scale-110' : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {isLockedOut && (
        <p className="text-xs text-err/80 text-center">
          Demasiados intentos. Espera {countdown} segundos.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 w-56">
        {KEYS.map((key, i) => {
          if (key === '') return <div key={i} />
          return (
            <button
              key={i}
              type="button"
              onClick={() => key === '⌫' ? handleDelete() : handleDigit(key)}
              disabled={isLockedOut}
              className="h-14 rounded-2xl border border-white/10 bg-surface hover:bg-surface2 active:scale-95 transition-all text-ink font-medium text-lg disabled:opacity-30"
            >
              {key}
            </button>
          )
        })}
      </div>

      {hasWebAuthn && !isLockedOut && (
        <Button variant="ghost" onClick={handleBiometric} spinning={biometricLoading} className="text-xs px-4">
          Usar huella / Face ID
        </Button>
      )}

      <button
        type="button"
        onClick={onReset}
        className="text-xs text-dim/40 hover:text-err/60 transition-colors mt-4"
      >
        Borrar todos los datos
      </button>
    </div>
  )
}
