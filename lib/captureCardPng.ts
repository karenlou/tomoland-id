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

export async function captureCardPng(node: HTMLElement): Promise<string> {
  await waitForImages(node)
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
