import { CONTENT_LEFT, PHOTO_H, PHOTO_TOP, PHOTO_W } from '@/lib/partyCardLayout'

/**
 * Waits for every <img> inside `node` to finish a real decode (not just a
 * network-complete event) before handing off to html-to-image.
 */
async function waitForImages(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll('img'))
  await Promise.all(
    images.map((img) =>
      img.decode().catch(() => {
        // decode() can reject on broken/cached edge cases — don't block capture
      }),
    ),
  )
}

const CARD_FONTS = [
  "700 16px 'Reform ST Trial'",
  "700 16px 'GT Mechanik Mono Trial'",
  "900 16px 'GT Mechanik Mono Trial'",
  "400 16px 'GT Mechanik Poly Trial'",
  "700 16px 'GT Mechanik Poly Trial'",
]

async function waitForFonts(): Promise<void> {
  await Promise.all(CARD_FONTS.map((font) => document.fonts.load(font).catch(() => {})))
  await document.fonts.ready.catch(() => {})
}

/** Fetches `url` and returns it as a data URI. Returns null on failure. */
export async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function loadImage(src: string, crossOrigin = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (crossOrigin) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image failed to load'))
    img.src = src
  })
}

/** Source rectangle that replicates CSS `object-fit: cover`. */
function coverCrop(naturalW: number, naturalH: number, targetW: number, targetH: number) {
  const targetRatio = targetW / targetH
  const srcRatio = naturalW / naturalH
  if (srcRatio > targetRatio) {
    const sw = naturalH * targetRatio
    return { sx: (naturalW - sw) / 2, sy: 0, sw, sh: naturalH }
  }
  const sh = naturalW / targetRatio
  return { sx: 0, sy: (naturalH - sh) / 2, sw: naturalW, sh }
}

const PIXEL_RATIO = 2
const PHOTO_BORDER = 3
const PHOTO_RADIUS = 4

/** Photo slot in canvas pixels — derived from locked card layout constants
 * rather than getBoundingClientRect, so off-screen capture targets and
 * scaled-on-screen previews all agree. */
function photoSlotRect() {
  const x = CONTENT_LEFT * PIXEL_RATIO
  const y = PHOTO_TOP * PIXEL_RATIO
  const w = PHOTO_W * PIXEL_RATIO
  const h = PHOTO_H * PIXEL_RATIO
  const b = PHOTO_BORDER * PIXEL_RATIO
  return {
    x: x + b,
    y: y + b,
    w: w - b * 2,
    h: h - b * 2,
    radius: PHOTO_RADIUS * PIXEL_RATIO,
  }
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

async function loadPhotoForCapture(
  photoUrl: string,
  domImg: HTMLImageElement | null,
): Promise<HTMLImageElement | null> {
  const inlined = await toDataUrl(photoUrl)
  if (inlined) {
    try {
      return await loadImage(inlined)
    } catch {
      // fall through
    }
  }

  if (domImg?.complete && domImg.naturalWidth > 0) {
    return domImg
  }

  try {
    return await loadImage(photoUrl, true)
  } catch {
    return null
  }
}

function compositePhotoUnderCard(
  cardCanvas: HTMLCanvasElement,
  photo: CanvasImageSource,
) {
  const out = document.createElement('canvas')
  out.width = cardCanvas.width
  out.height = cardCanvas.height
  const ctx = out.getContext('2d')
  if (!ctx) return cardCanvas

  const { x, y, w, h, radius } = photoSlotRect()
  const source = photo as HTMLImageElement
  const naturalW = 'naturalWidth' in source ? source.naturalWidth : w
  const naturalH = 'naturalHeight' in source ? source.naturalHeight : h
  const { sx, sy, sw, sh } = coverCrop(naturalW, naturalH, w, h)

  ctx.save()
  roundRectPath(ctx, x, y, w, h, radius)
  ctx.clip()
  ctx.drawImage(photo, sx, sy, sw, sh, x, y, w, h)
  ctx.restore()

  // Card chrome (border, badge, text) on top — transparent photo hole shows through.
  ctx.drawImage(cardCanvas, 0, 0)
  return out
}

/**
 * Mobile Safari drops user photos inside html-to-image's foreignObject pass even
 * when they're inlined as data URIs. Desktop is unaffected, so it keeps plain
 * toPng(). On mobile the photo is painted onto a canvas first, then the card
 * (captured with the photo hidden so the slot is transparent) is layered on top.
 */
export async function captureCardPng(
  node: HTMLElement,
  photoUrl: string | null | undefined,
  isMobile: boolean,
): Promise<string> {
  const { toPng, toCanvas } = await import('html-to-image')

  if (!isMobile) {
    return toPng(node, { pixelRatio: PIXEL_RATIO })
  }

  const photoImg = node.querySelector<HTMLImageElement>('img[data-card-photo]')

  await Promise.all([waitForImages(node), waitForFonts()])

  const photo =
    photoUrl && photoImg
      ? await loadPhotoForCapture(photoUrl, photoImg)
      : null

  node.setAttribute('data-capturing', 'true')

  let cardCanvas: HTMLCanvasElement
  try {
    cardCanvas = await toCanvas(node, {
      pixelRatio: PIXEL_RATIO,
      backgroundColor: 'rgba(0,0,0,0)',
      cacheBust: true,
    })
  } finally {
    node.removeAttribute('data-capturing')
  }

  if (!photoUrl || !photo) {
    return cardCanvas.toDataURL('image/png')
  }

  const result = compositePhotoUnderCard(cardCanvas, photo)
  try {
    return result.toDataURL('image/png')
  } catch {
    return cardCanvas.toDataURL('image/png')
  }
}

export async function downloadCardImage(
  dataUrl: string,
  filename: string,
  isMobile: boolean,
): Promise<void> {
  if (!isMobile) {
    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
    return
  }

  const blob = await (await fetch(dataUrl)).blob()

  if (navigator.canShare && navigator.share) {
    const file = new File([blob], filename, { type: blob.type })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
        return
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = filename
  link.href = url
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
