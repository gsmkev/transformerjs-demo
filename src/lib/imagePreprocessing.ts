export interface PreprocessOptions {
  brightness: number  // 0–200, default 100 (= 1.0x)
  contrast:   number  // 0–200, default 100 (= 1.0x)
  rotation:   number  // -180 to 180 degrees, default 0
}

export const DEFAULT_PREPROCESS: PreprocessOptions = {
  brightness: 100,
  contrast:   100,
  rotation:   0,
}

export function isDefaultPreprocess(opts: PreprocessOptions): boolean {
  return opts.brightness === 100 && opts.contrast === 100 && opts.rotation === 0
}

export async function preprocessImage(
  dataUrl: string,
  opts: PreprocessOptions,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const radians = (opts.rotation * Math.PI) / 180
      const sin = Math.abs(Math.sin(radians))
      const cos = Math.abs(Math.cos(radians))
      const rotatedWidth  = img.naturalWidth  * cos + img.naturalHeight * sin
      const rotatedHeight = img.naturalWidth  * sin + img.naturalHeight * cos

      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(rotatedWidth)
      canvas.height = Math.round(rotatedHeight)

      const ctx = canvas.getContext('2d')!
      ctx.filter = `brightness(${opts.brightness}%) contrast(${opts.contrast}%)`
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(radians)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)

      resolve(canvas.toDataURL('image/jpeg', 0.92))
      canvas.width = 0
    }
    img.onerror = reject
    img.src = dataUrl
  })
}
