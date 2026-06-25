import { blobToDataUrl, getCitizenPhotoBlob } from '@/lib/citizenPhotoCache'

/**
 * Waits for every <img> inside `node` to finish a real decode (not just a
 * network-complete event) before handing off to html-to-image.
 */
async function waitForImages(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll('img'))
  await Promise.all(
    images.map((img) =>
      img.decode().catch(() => {
        // decode() can reject on broken/cached edge cases — don't block capture.
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

const PIXEL_RATIO = 2

export async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return blobToDataUrl(blob)
  } catch {
    return null
  }
}

async function fetchPhotoDataViaApi(url: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/photo-data?url=${encodeURIComponent(url)}`)
    if (!res.ok) return null
    const json = (await res.json()) as { dataUrl?: string }
    return json.dataUrl ?? null
  } catch {
    return null
  }
}

/** Resolve user-photo bytes for compositing — local cache first, then inline
 * URLs, then direct fetch, then the server proxy as a last resort. */
async function resolvePhotoDataUrl(
  photoUrl: string | null | undefined,
  citizenId?: string | null,
): Promise<string | null> {
  if (citizenId) {
    const cached = await getCitizenPhotoBlob(citizenId)
    if (cached) {
      return blobToDataUrl(cached)
    }
  }

  if (!photoUrl) return null
  if (photoUrl.startsWith('data:')) return photoUrl

  if (photoUrl.startsWith('blob:')) {
    try {
      const blob = await (await fetch(photoUrl)).blob()
      return blobToDataUrl(blob)
    } catch {
      return null
    }
  }

  const inlined = await toDataUrl(photoUrl)
  if (inlined) return inlined

  return fetchPhotoDataViaApi(photoUrl)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
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

/**
 * Desktop keeps plain html-to-image — it already works there.
 *
 * Mobile routes around Safari's unreliable embedding of remote user photos in
 * html-to-image's SVG foreignObject pipeline: capture the card with the photo
 * slot transparent, then paint the photo onto the canvas with drawImage()
 * behind the existing pixels (destination-over). Photo bytes come from the
 * on-device cache when available, otherwise from fetch/API fallback.
 */
export async function captureCardPng(
  node: HTMLElement,
  photoUrl: string | null | undefined,
  isMobile: boolean,
  citizenId?: string | null,
): Promise<string> {
  if (!isMobile) {
    const { toPng } = await import('html-to-image')
    return toPng(node, { pixelRatio: PIXEL_RATIO })
  }

  const hasUserPhoto = Boolean(photoUrl || citizenId)
  const slot = hasUserPhoto
    ? node.querySelector<HTMLElement>('[data-card-photo-slot]')
    : null
  const photoImg = slot?.querySelector<HTMLImageElement>('img[data-card-photo]') ?? null
  const originalBackground = slot?.style.background ?? ''
  const originalDisplay = photoImg?.style.display ?? ''

  if (slot && photoImg) {
    slot.style.background = 'transparent'
    photoImg.style.display = 'none'
  }

  let canvas: HTMLCanvasElement
  try {
    await Promise.all([waitForImages(node), waitForFonts()])
    const { toCanvas } = await import('html-to-image')
    canvas = await toCanvas(node, { pixelRatio: PIXEL_RATIO })
  } finally {
    if (slot && photoImg) {
      slot.style.background = originalBackground
      photoImg.style.display = originalDisplay
    }
  }

  if (slot && hasUserPhoto) {
    const photoDataUrl = await resolvePhotoDataUrl(photoUrl, citizenId)
    if (photoDataUrl) {
      try {
        const img = await loadImage(photoDataUrl)
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const nodeRect = node.getBoundingClientRect()
          const slotRect = slot.getBoundingClientRect()
          const scaleX = nodeRect.width / node.offsetWidth || 1
          const scaleY = nodeRect.height / node.offsetHeight || 1
          const x = ((slotRect.left - nodeRect.left) / scaleX) * PIXEL_RATIO
          const y = ((slotRect.top - nodeRect.top) / scaleY) * PIXEL_RATIO
          const w = (slotRect.width / scaleX) * PIXEL_RATIO
          const h = (slotRect.height / scaleY) * PIXEL_RATIO

          const { sx, sy, sw, sh } = coverCrop(img.naturalWidth, img.naturalHeight, w, h)
          ctx.save()
          ctx.globalCompositeOperation = 'destination-over'
          ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
          ctx.restore()
        }
      } catch {
        // best-effort — card still exports without the photo
      }
    }
  }

  return canvas.toDataURL('image/png')
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
