'use client'

import { useState, useRef, useCallback, DragEvent, useEffect } from 'react'

export function useImageLoader() {
  const [file, setFile] = useState<File | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileTypeError, setFileTypeError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const readerRef = useRef<FileReader | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      readerRef.current?.abort()
    }
  }, [])

  const loadFile = useCallback((f: File) => {
    setFileTypeError(null)
    if (!f.type.startsWith('image/')) {
      setFileTypeError(`"${f.name}" is not an image file.`)
      return
    }

    readerRef.current?.abort()
    const reader = new FileReader()
    readerRef.current = reader

    reader.onload = (e) => {
      if (!mountedRef.current) return
      const result = e.target?.result
      if (typeof result === 'string') {
        setFile(f)
        setDataUrl(result)
      }
    }
    reader.readAsDataURL(f)
  }, [])

  const clearImage = useCallback(() => {
    readerRef.current?.abort()
    setFile(null)
    setDataUrl(null)
    setFileTypeError(null)
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

  return { file, dataUrl, isDragOver, fileTypeError, loadFile, clearImage, dragHandlers, fileInputRef } as const
}
