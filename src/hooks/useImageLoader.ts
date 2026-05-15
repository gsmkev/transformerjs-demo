'use client'

import { useState, useRef, useCallback, DragEvent, useEffect } from 'react'
import { pdfToImages } from '@/lib/pdfToImages'

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
  const result = canvas.toDataURL('image/jpeg', 0.92)
  canvas.width = 0
  return result
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
  const [adjustedDataUrl, setAdjustedDataUrl] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileTypeError, setFileTypeError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (pages.length === 0) {
      setDataUrl(null)
      setAdjustedDataUrl(null)
      return
    }
    let cancelled = false
    concatenatePages(pages)
      .then((url) => { if (!cancelled) { setDataUrl(url); setAdjustedDataUrl(null) } })
      .catch(() => { if (!cancelled) { setDataUrl(null); setAdjustedDataUrl(null) } })
    return () => { cancelled = true }
  }, [pages])

  const addPage = useCallback((f: File) => {
    setFileTypeError(null)

    if (f.type === 'application/pdf') {
      pdfToImages(f).then((urls) => {
        if (urls.length === 0) {
          setFileTypeError(`"${f.name}" no contiene páginas renderizables.`)
          return
        }
        setPages((prev) => {
          if (prev.length === 0) setFile(f)
          return [...prev, ...urls]
        })
      }).catch(() => {
        setFileTypeError(`No se pudo leer "${f.name}" como PDF.`)
      })
      return
    }

    if (!f.type.startsWith('image/')) {
      setFileTypeError(`"${f.name}" no es una imagen ni un PDF.`)
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
    setAdjustedDataUrl(null)
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

  return { file, dataUrl, adjustedDataUrl, setAdjustedDataUrl, pages, isDragOver, fileTypeError, loadFile, addPage, removePage, clearImage, dragHandlers, fileInputRef } as const
}
