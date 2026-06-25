import { renderCardCanvas } from './renderCardCanvas'
import type { Citizen } from '@/types'

/**
 * Desktop never had trouble with html-to-image's DOM → SVG <foreignObject>
 * → canvas pipeline, so it keeps the plain, original toPng() call untouched
 * rather than paying for a fix it doesn't need.
 *
 * On mobile, that same pipeline is the known-unreliable part — specifically
 * for embedding the user's own photo — on Safari/WebKit. Rather than patch
 * around it (waiting longer, pre-fetching the image, compositing a second
 * layer on top of whatever html-to-image produced), this bypasses it
 * entirely: renderCardCanvas() draws the whole card — background, art,
 * text, the rotated mascot badge, and the photo — as one canvas built from
 * the same data and layout constants the live component uses, all through
 * plain, reliably-supported canvas drawImage()/fillText() calls. One
 * output, built as one unit, instead of a rendered layer plus a composited
 * patch.
 */
export async function captureCardPng(
  node: HTMLElement,
  citizen: Citizen,
  isMobile: boolean,
): Promise<string> {
  if (!isMobile) {
    const { toPng } = await import('html-to-image')
    return toPng(node, { pixelRatio: 2 })
  }

  const canvas = await renderCardCanvas(citizen)
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
