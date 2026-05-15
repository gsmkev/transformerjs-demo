'use client'

import { useState, useEffect, useCallback } from 'react'

const PIN_HASH_KEY = 'papeleo_pin_hash'
const WEBAUTHN_CRED_KEY = 'papeleo_webauthn_id'
const RELYING_PARTY_ID = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
const RELYING_PARTY_NAME = 'Papeleo'

async function sha256hex(text: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function base64url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromBase64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

export function usePinLock() {
  const [isLocked, setIsLocked] = useState(false)
  const [hasPinSet, setHasPinSet] = useState(false)
  const [hasWebAuthn, setHasWebAuthn] = useState(false)

  useEffect(() => {
    try {
      const pinHash = localStorage.getItem(PIN_HASH_KEY)
      const credId = localStorage.getItem(WEBAUTHN_CRED_KEY)
      setHasPinSet(!!pinHash)
      setHasWebAuthn(!!credId && typeof window !== 'undefined' && !!window.PublicKeyCredential)
      if (pinHash) setIsLocked(true)
    } catch {
      // localStorage unavailable (private browsing)
    }
  }, [])

  const unlock = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const stored = localStorage.getItem(PIN_HASH_KEY)
      if (!stored) return true
      const hash = await sha256hex(pin)
      if (hash === stored) {
        setIsLocked(false)
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  const unlockWithBiometric = useCallback(async (): Promise<boolean> => {
    try {
      const credIdStr = localStorage.getItem(WEBAUTHN_CRED_KEY)
      if (!credIdStr || !window.PublicKeyCredential) return false
      await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: RELYING_PARTY_ID,
          allowCredentials: [{ type: 'public-key', id: fromBase64url(credIdStr).buffer as ArrayBuffer }],
          userVerification: 'required',
          timeout: 60000,
        },
      })
      setIsLocked(false)
      return true
    } catch {
      return false
    }
  }, [])

  const setPin = useCallback(async (newPin: string, currentPin?: string): Promise<boolean> => {
    try {
      const existing = localStorage.getItem(PIN_HASH_KEY)
      if (existing && currentPin !== undefined) {
        const currentHash = await sha256hex(currentPin)
        if (currentHash !== existing) return false
      }
      const newHash = await sha256hex(newPin)
      localStorage.setItem(PIN_HASH_KEY, newHash)
      setHasPinSet(true)
      return true
    } catch {
      return false
    }
  }, [])

  const removePin = useCallback(async (currentPin: string): Promise<boolean> => {
    try {
      const existing = localStorage.getItem(PIN_HASH_KEY)
      if (!existing) return true
      const hash = await sha256hex(currentPin)
      if (hash !== existing) return false
      localStorage.removeItem(PIN_HASH_KEY)
      localStorage.removeItem(WEBAUTHN_CRED_KEY)
      setHasPinSet(false)
      setHasWebAuthn(false)
      return true
    } catch {
      return false
    }
  }, [])

  const registerBiometric = useCallback(async (currentPin: string): Promise<boolean> => {
    try {
      if (!window.PublicKeyCredential) return false
      const existing = localStorage.getItem(PIN_HASH_KEY)
      if (existing && currentPin) {
        const hash = await sha256hex(currentPin)
        if (hash !== existing) return false
      }
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { id: RELYING_PARTY_ID, name: RELYING_PARTY_NAME },
          user: {
            id: crypto.getRandomValues(new Uint8Array(16)),
            name: 'papeleo_user',
            displayName: 'Usuario',
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
          timeout: 60000,
        },
      }) as PublicKeyCredential | null
      if (!credential) return false
      localStorage.setItem(WEBAUTHN_CRED_KEY, base64url(credential.rawId))
      setHasWebAuthn(true)
      return true
    } catch {
      return false
    }
  }, [])

  const resetAll = useCallback(() => {
    if (confirm('¿Estás seguro? Se borrarán TODOS los datos de la aplicación y no se puede deshacer.')) {
      indexedDB.deleteDatabase('local-ocr-v1')
      localStorage.clear()
      window.location.reload()
    }
  }, [])

  return { isLocked, hasPinSet, hasWebAuthn, unlock, unlockWithBiometric, setPin, removePin, registerBiometric, resetAll }
}
