'use client'

import { useState, useRef, useCallback, DragEvent } from 'react'

export function useImageLoader() {
  const [file, setFile] = useState<File | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = (e) => setDataUrl(e.target?.result as string)
    reader.readAsDataURL(f)
  }, [])

  const clearImage = useCallback(() => {
    setFile(null)
    setDataUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const dragHandlers = {
    onDragOver: (e: DragEvent) => { e.preventDefault(); setIsDragOver(true) },
    onDragLeave: () => setIsDragOver(false),
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const f = e.dataTransfer.files[0]
      if (f) loadFile(f)
    },
  }

  return { file, dataUrl, isDragOver, loadFile, clearImage, dragHandlers, fileInputRef } as const
}
