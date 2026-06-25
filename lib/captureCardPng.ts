/**
 * Waits for every <img> inside `node` to finish a real decode (not just a
 * network-complete event) before handing off to html-to-image. html-to-image
 * rasterizes by serializing the DOM into an SVG <foreignObject> and drawing
 * that through a fresh Image — on Safari/WebKit (every iOS browser, since
 * Apple requires it) that pipeline is known to silently drop embedded
 * raster images if they haven't fully decoded yet, and a card mounted
 * fresh just for capture (rather than one already sitting on screen) is
 * far more likely to still be mid-decode, especially over a mobile
 * connection — that's the gap this closes.
 */
async function waitForImages(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll('img'))
  await Promise.all(
    images.map((img) =>
      img.decode().catch(() => {
        // A handful of legitimate cases (already-broken image, certain
        // cached responses) reject decode() even though the image still
        // paints fine — one rejection shouldn't block the whole capture.
      }),
    ),
  )
}

/** Every face actually declared in globals.css — see the @font-face block
 * there. The card's text only renders in the intended typeface (rather than
 * silently falling back to Space Mono/Georgia/system-ui) once these have
 * actually finished fetching, and like the photo, that's far less likely to
 * have happened yet for a card mounted fresh just for capture. */
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

/** Fetches `url` and returns it as a data URI, so the capture target's <img>
 * never depends on html-to-image's own (separately CORS-gated) fetch of a
 * remote resource — by the time it's assigned, the bytes are already in
 * hand. Returns null on any failure so callers can fall back to the
 * original URL rather than lose the whole capture over a missing photo. */
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image failed to load'))
    img.src = src
  })
}

/** Source rectangle that replicates CSS `object-fit: cover` — crops to the
 * target's aspect ratio (centered) rather than stretching. */
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

/**
 * The citizen's own photo is the one image in the card that's remote and
 * user-supplied, and the one actually reported missing from captures on
 * mobile — even after fully decoding it and inlining it as a data URI
 * beforehand, on some devices it still doesn't show up. html-to-image
 * rasterizes by serializing the DOM into an SVG <foreignObject> and drawing
 * that through a fresh Image; embedding a *user photo* specifically into
 * that pipeline is the known-unreliable part on Safari/WebKit. Desktop
 * never had this problem, so it keeps the plain, original toPng() call
 * untouched rather than paying for a fix it doesn't need.
 *
 * On mobile, everything else in the card (text, borders, the rotated
 * mascot badge sticker that overlaps one corner of the photo) renders fine
 * through html-to-image, so this only routes around the photo: the slot is
 * made transparent for the html-to-image pass, then the real photo —
 * fetched fresh from wherever it's actually stored (photoUrl, the same URL
 * the card displays it from normally) — is drawn straight onto the
 * resulting canvas with a plain drawImage() call, composited *behind* the
 * existing (opaque) pixels via 'destination-over'. That fills exactly the
 * transparent hole — i.e. the rounded photo rect minus whatever sliver of
 * the badge overlaps it — without needing to separately replicate the
 * border-radius clip or the badge's rotation/clipping math by hand.
 */
export async function captureCardPng(
  node: HTMLElement,
  photoUrl: string | null | undefined,
  isMobile: boolean,
): Promise<string> {
  if (!isMobile) {
    const { toPng } = await import('html-to-image')
    return toPng(node, { pixelRatio: PIXEL_RATIO })
  }

  const slot = photoUrl ? node.querySelector<HTMLElement>('[data-card-photo-slot]') : null
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

  if (slot && photoUrl) {
    try {
      const inlined = await toDataUrl(photoUrl)
      if (inlined) {
        const img = await loadImage(inlined)
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const nodeRect = node.getBoundingClientRect()
          const slotRect = slot.getBoundingClientRect()
          // Dividing by the *rendered* size rather than assuming pixelRatio
          // accounts for any CSS scale() on an ancestor — IdSpotlight and
          // RetroPrinter both display the card scaled down from its native
          // size, while DownloadList's off-screen capture target doesn't.
          const scaleX = (nodeRect.width / node.offsetWidth) || 1
          const scaleY = (nodeRect.height / node.offsetHeight) || 1
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
      }
    } catch {
      // best-effort — if this fails, the capture still has everything else
    }
  }

  return canvas.toDataURL('image/png')
}

/**
 * Saves a captured card PNG (the data URL from captureCardPng). Desktop
 * already worked perfectly with a plain <a download> click on the raw data:
 * URI, so that's untouched here too.
 *
 * On mobile, where the Web Share API supports files (iOS Safari 16.4+,
 * most mobile Chrome), this opens the native share sheet with the image
 * attached — the user gets a "Save Image" option that writes straight to
 * Photos. That replaces clicking a synthetic <a download> on a data: URI,
 * which on iOS Safari pops up a "Download from data:image/png;base64,..."
 * sheet that dumps the entire base64 payload as visible text (reads as
 * broken/suspicious) and, even once confirmed, lands in the Files app
 * rather than Photos.
 *
 * Falls back to a blob-URL download (not the raw data: URI — that's the
 * same thing that makes the dialog ugly in the first place, and some
 * browsers cap data: URI length) for mobile browsers without file-sharing
 * support.
 */
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
        // The user dismissing the share sheet is a real choice, not a
        // failure — don't fall through to also force a second download.
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = filename
  link.href = url
  link.click()
  // Revoking immediately can race the browser's own download handoff in
  // some implementations; a short delay is the common workaround.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
