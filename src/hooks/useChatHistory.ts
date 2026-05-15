// src/hooks/useChatHistory.ts
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { nanoid } from 'nanoid'
import type { ChatHistory, ChatMessage } from '@/types/document'
import {
  saveChatHistory, getAllChatHistories, updateChatHistory,
  deleteChatHistory, pruneChatHistories,
} from '@/services/chatHistoryStorage'

interface UseChatHistoryOptions {
  limit: number
  generateTitle?: (firstUserMessage: string) => Promise<string>
}

export function useChatHistory({ limit, generateTitle }: UseChatHistoryOptions) {
  const [histories, setHistories] = useState<ChatHistory[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeIdRef = useRef<string | null>(null)

  useEffect(() => {
    getAllChatHistories().then(setHistories)
  }, [])

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  const refresh = useCallback(async () => {
    setHistories(await getAllChatHistories())
  }, [])

  const saveHistory = useCallback(async (messages: ChatMessage[]): Promise<void> => {
    if (messages.length === 0) return

    const firstUserMsg = messages.find((m) => m.role === 'user')?.content ?? ''
    const now = Date.now()

    if (!activeIdRef.current) {
      const id = nanoid()
      let title = firstUserMsg.slice(0, 60)
      if (generateTitle) {
        try { title = await generateTitle(firstUserMsg) } catch { /* keep truncated title */ }
      }
      const history: ChatHistory = { id, title, messages, createdAt: now, updatedAt: now }
      await saveChatHistory(history)
      setActiveId(id)
      activeIdRef.current = id
    } else {
      await updateChatHistory(activeIdRef.current, { messages, updatedAt: now })
    }

    await pruneChatHistories(limit)
    await refresh()
  }, [generateTitle, limit, refresh])

  const loadHistory = useCallback((id: string): ChatMessage[] | null => {
    const history = histories.find((h) => h.id === id)
    if (!history) return null
    setActiveId(id)
    return history.messages
  }, [histories])

  const deleteHistory = useCallback(async (id: string): Promise<void> => {
    await deleteChatHistory(id)
    if (activeIdRef.current === id) {
      setActiveId(null)
      activeIdRef.current = null
    }
    await refresh()
  }, [refresh])

  const renameHistory = useCallback(async (id: string, title: string): Promise<void> => {
    await updateChatHistory(id, { title })
    await refresh()
  }, [refresh])

  const startNew = useCallback(() => {
    setActiveId(null)
    activeIdRef.current = null
  }, [])

  return { histories, activeId, saveHistory, loadHistory, deleteHistory, renameHistory, startNew }
}
