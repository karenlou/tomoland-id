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

export async function captureCardPng(node: HTMLElement): Promise<string> {
  await Promise.all([waitForImages(node), waitForFonts()])
  const { toPng } = await import('html-to-image')
  return toPng(node, { pixelRatio: 2 })
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

/**
 * Saves a captured card PNG (the data URL from captureCardPng). Where the
 * Web Share API supports files (iOS Safari 16.4+, most mobile Chrome), this
 * opens the native share sheet with the image attached — the user gets a
 * "Save Image" option that writes straight to Photos. That replaces
 * clicking a synthetic <a download> on a data: URI, which on iOS Safari
 * pops up a "Download from data:image/png;base64,..." sheet that dumps the
 * entire base64 payload as visible text (reads as broken/suspicious) and,
 * even once confirmed, lands in the Files app rather than Photos.
 *
 * Falls back to a normal blob-URL download for browsers without
 * file-sharing support — every desktop browser this app targets today,
 * where the old approach already worked fine. A blob: URL rather than the
 * raw data: URI here too, since that's the same thing that makes the dialog
 * ugly on iOS in the first place, and some browsers cap data: URI length.
 */
export async function downloadCardImage(dataUrl: string, filename: string): Promise<void> {
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
