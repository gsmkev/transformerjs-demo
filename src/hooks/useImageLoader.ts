'use client'

import { useState, useRef, useCallback, DragEvent, useEffect } from 'react'

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

async function concatenatePages(dataUrls: string[]): Promise<string> {
  if (dataUrls.length === 0) return ''
  if (dataUrls.length === 1) return dataUrls[0]
  const images = await Promise.all(dataUrls.map(loadImage))
  const width = Math.max(...images.map((img) => img.naturalWidth))
  const totalHeight = images.reduce((sum, img) => sum + img.naturalHeight, 0)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = totalHeight
  const ctx = canvas.getContext('2d')!
  let y = 0
  for (const img of images) {
    ctx.drawImage(img, 0, y)
    y += img.naturalHeight
  }
  return canvas.toDataURL('image/jpeg', 0.92)
}

function readFileAsDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') resolve(result)
      else reject(new Error('FileReader result is not a string'))
    }
    reader.onerror = reject
    reader.readAsDataURL(f)
  })
}

export function useImageLoader() {
  const [pages, setPages] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileTypeError, setFileTypeError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (pages.length === 0) {
      setDataUrl(null)
      return
    }
    let cancelled = false
    concatenatePages(pages).then((url) => {
      if (!cancelled) setDataUrl(url)
    })
    return () => { cancelled = true }
  }, [pages])

  const addPage = useCallback((f: File) => {
    setFileTypeError(null)
    if (!f.type.startsWith('image/')) {
      setFileTypeError(`"${f.name}" is not an image file.`)
      return
    }
    readFileAsDataUrl(f).then((url) => {
      setPages((prev) => {
        if (prev.length === 0) setFile(f)
        return [...prev, url]
      })
    })
  }, [])

  const loadFile = addPage

  const removePage = useCallback((index: number) => {
    setPages((prev) => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 0) setFile(null)
      return next
    })
  }, [])

  const clearImage = useCallback(() => {
    setPages([])
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
      const files = Array.from(e.dataTransfer.files)
      files.forEach(addPage)
    },
  }

  return { file, dataUrl, pages, isDragOver, fileTypeError, loadFile, addPage, removePage, clearImage, dragHandlers, fileInputRef } as const
}
