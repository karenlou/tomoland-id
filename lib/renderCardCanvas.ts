/**
 * Renders the front of a CitizenCard entirely on a <canvas>, built up from
 * the same layout constants and data the live component uses — rather than
 * asking html-to-image to serialize the rendered DOM into an SVG
 * <foreignObject> and rasterize that, which is the technique that's been
 * unreliable specifically for embedding the user's photo on mobile Safari.
 * Every piece here — background, mountain art, title, the rotated mascot
 * badge, and the photo — goes through the same plain canvas drawImage()/
 * fillText() calls, so there's no separate "rendered part" and "composited
 * part" to fall out of sync; it's one output, built as one unit.
 */
import { CARD_BORDER_RADIUS, CARD_H, CARD_W } from './cardConstants'
import {
  BLURB_SIZE,
  CONTENT_LEFT,
  CONTENT_RIGHT,
  CONTENT_W,
  FRONT_MTN_BG,
  HEART_H,
  HEART_TOP,
  HEART_W,
  INFO_BLURB_LINE,
  INFO_LABEL_LINE,
  INFO_LABEL_SIZE,
  INFO_NAME_LINE,
  MASCOT_H,
  MASCOT_LEFT,
  MASCOT_ROTATE,
  MASCOT_TOP,
  MASCOT_W,
  NAME_SIZE,
  PARTY_CARD_BLURB,
  PARTY_CARD_DOTS,
  PHOTO_GAP,
  PHOTO_H,
  PHOTO_TOP,
  PHOTO_W,
  TITLE_SIZE,
  TITLE_TOP,
} from './partyCardLayout'
import type { Citizen } from '@/types'

const INK = '#2C2511'
const LABEL_YELLOW = '#FEFA80'
const CARD_YELLOW = '#FEFA7F'
const PHOTO_CREAM = '#F3EFED'
const PIXEL_RATIO = 2

const MONO_FONT = "'GT Mechanik Mono Trial', 'Space Mono', 'Courier New', monospace"
const DISPLAY_FONT = "'Reform ST Trial', 'Arial Black', Impact, sans-serif"

const CARD_FONTS = [
  "700 16px 'Reform ST Trial'",
  "700 16px 'GT Mechanik Mono Trial'",
  "900 16px 'GT Mechanik Mono Trial'",
]

async function waitForFonts(): Promise<void> {
  await Promise.all(CARD_FONTS.map((font) => document.fonts.load(font).catch(() => {})))
  await document.fonts.ready.catch(() => {})
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // The photo is fetched from Supabase Storage — a different origin —
    // and without this, drawing it onto the canvas taints it: harmless
    // until the final toDataURL() call, which then throws a SecurityError
    // instead of producing an image. Public Storage buckets already send
    // permissive CORS headers, so requesting it this way succeeds cleanly;
    // applying it to every image here too (same-origin static assets) is
    // a no-op for those, so there's no need to branch on which is which.
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`failed to load ${src}`))
    img.src = src
  })
}

/** Source rectangle replicating CSS `object-fit: cover` (optionally
 * anchored to the bottom, matching `object-position: center bottom`). */
function coverRect(
  naturalW: number,
  naturalH: number,
  targetW: number,
  targetH: number,
  anchorBottom = false,
) {
  const targetRatio = targetW / targetH
  const srcRatio = naturalW / naturalH
  if (srcRatio > targetRatio) {
    const sw = naturalH * targetRatio
    return { sx: (naturalW - sw) / 2, sy: 0, sw, sh: naturalH }
  }
  const sh = naturalW / targetRatio
  const sy = anchorBottom ? naturalH - sh : (naturalH - sh) / 2
  return { sx: 0, sy, sw: naturalW, sh }
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r)
    return
  }
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Greedy word-wrap — matches the browser's own line-breaking closely
 * enough for this card's short, simple blurb text. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

function truncateWithEllipsis(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let truncated = text
  while (truncated.length > 0 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return `${truncated}…`
}

export async function renderCardCanvas(citizen: Citizen): Promise<HTMLCanvasElement> {
  const { name, relation_to_tomo, tomoland_id, photo_url, place_of_issue } = citizen

  const canvas = document.createElement('canvas')
  canvas.width = CARD_W * PIXEL_RATIO
  canvas.height = CARD_H * PIXEL_RATIO
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO)
  ctx.textBaseline = 'top'

  await waitForFonts()

  // The live card gets its rounded corners for free from a wrapper div with
  // borderRadius + overflow:hidden around it — this canvas has no such
  // wrapper, so the rounding has to be baked in directly, clipping every
  // draw call below to the card's true outer shape.
  roundRectPath(ctx, 0, 0, CARD_W, CARD_H, CARD_BORDER_RADIUS)
  ctx.clip()

  // Background
  ctx.fillStyle = CARD_YELLOW
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Mountain background art, cover-fit and anchored to the bottom edge
  try {
    const mtn = await loadImage(FRONT_MTN_BG)
    const mtnH = Math.round((644 / 1350) * CARD_W)
    const { sx, sy, sw, sh } = coverRect(mtn.naturalWidth, mtn.naturalHeight, CARD_W, mtnH, true)
    ctx.drawImage(mtn, sx, sy, sw, sh, 0, CARD_H - mtnH, CARD_W, mtnH)
  } catch {
    // best-effort
  }

  // Title
  ctx.fillStyle = INK
  ctx.textAlign = 'left'
  ctx.font = `700 ${TITLE_SIZE}px ${DISPLAY_FONT}`
  ctx.fillText('TOMOSAPIEN', CONTENT_LEFT, TITLE_TOP)

  // Heart icon
  try {
    const heart = await loadImage('/tomohearticon.svg')
    ctx.drawImage(heart, CARD_W - CONTENT_RIGHT - HEART_W, HEART_TOP, HEART_W, HEART_H)
  } catch {
    // best-effort
  }

  // --- Photo slot ---
  const slotX = CONTENT_LEFT
  const slotY = PHOTO_TOP
  const innerX = slotX + 3
  const innerY = slotY + 3
  const innerW = PHOTO_W - 6
  const innerH = PHOTO_H - 6

  ctx.save()
  roundRectPath(ctx, slotX, slotY, PHOTO_W, PHOTO_H, 4)
  ctx.clip()

  // 3px border + cream interior
  ctx.fillStyle = INK
  ctx.fillRect(slotX, slotY, PHOTO_W, PHOTO_H)
  roundRectPath(ctx, innerX, innerY, innerW, innerH, 2)
  ctx.fillStyle = PHOTO_CREAM
  ctx.fill()

  // The container's overflow:hidden clips at its *padding* edge (inside
  // the 3px border), and MASCOT_LEFT/MASCOT_TOP — like any absolutely
  // positioned child's offsets — are measured from that same inner edge,
  // not the outer border-box. Sharing this one clip+origin for both the
  // photo and the badge keeps that consistent.
  ctx.save()
  roundRectPath(ctx, innerX, innerY, innerW, innerH, 2)
  ctx.clip()
  if (photo_url) {
    try {
      const photo = await loadImage(photo_url)
      const { sx, sy, sw, sh } = coverRect(photo.naturalWidth, photo.naturalHeight, innerW, innerH)
      ctx.drawImage(photo, sx, sy, sw, sh, innerX, innerY, innerW, innerH)
    } catch {
      // best-effort — cream background stays visible
    }
  } else {
    try {
      const placeholder = await loadImage('/tomo-character.png')
      const w = 145
      const h = (placeholder.naturalHeight / placeholder.naturalWidth) * w
      const bottomY = innerY + innerH + 10
      ctx.drawImage(placeholder, innerX + innerW / 2 - w / 2, bottomY - h, w, h)
    } catch {
      // best-effort
    }
  }

  // Mascot badge — rotated about its own center
  try {
    const badge = await loadImage('/party-mascot-badge.svg')
    ctx.save()
    ctx.translate(innerX + MASCOT_LEFT + MASCOT_W / 2, innerY + MASCOT_TOP + MASCOT_H / 2)
    ctx.rotate((MASCOT_ROTATE * Math.PI) / 180)
    ctx.drawImage(badge, -MASCOT_W / 2, -MASCOT_H / 2, MASCOT_W, MASCOT_H)
    ctx.restore()
  } catch {
    // best-effort
  }
  ctx.restore() // closes the inner-rect clip (line 221)
  ctx.restore() // closes the outer-rect clip (line 205)

  // --- Info column ---
  const infoX = slotX + PHOTO_W + PHOTO_GAP
  const infoW = CONTENT_W - PHOTO_W - PHOTO_GAP
  const infoTop = PHOTO_TOP
  const infoH = PHOTO_H

  const labelLineH = INFO_LABEL_SIZE * INFO_LABEL_LINE
  const nameLineH = NAME_SIZE * INFO_NAME_LINE
  const blurbLineH = BLURB_SIZE * INFO_BLURB_LINE

  ctx.font = `700 ${BLURB_SIZE}px ${MONO_FONT}`
  const blurbLines = wrapText(ctx, PARTY_CARD_BLURB, infoW)

  // Natural height of each of the column's 11 children, in the exact order
  // they render — mirrors the live card's flex column so the leftover
  // space distributes into the same `justify-content: space-between` gaps.
  const rowHeights = [
    labelLineH + 8, // 0: label badge (4px padding top + bottom)
    nameLineH, // 1: name
    labelLineH, // 2: divider
    labelLineH, // 3: relation row
    labelLineH, // 4: divider
    labelLineH, // 5: tomoland id row
    labelLineH, // 6: divider
    labelLineH, // 7: place of issue row
    labelLineH, // 8: divider
    blurbLines.length * blurbLineH, // 9: blurb
    labelLineH, // 10: contact line
  ]
  const totalContentH = rowHeights.reduce((sum, h) => sum + h, 0)
  const gap = (infoH - totalContentH) / (rowHeights.length - 1)

  const rowTops: number[] = []
  let y = infoTop
  for (const h of rowHeights) {
    rowTops.push(y)
    y += h + gap
  }

  // Row 0: label badge
  ctx.font = `900 ${INFO_LABEL_SIZE}px ${MONO_FONT}`
  const labelText = 'PERMANENT RESIDENT OF TOMOLAND'
  const labelTextW = ctx.measureText(labelText).width
  ctx.fillStyle = INK
  ctx.fillRect(infoX, rowTops[0], labelTextW + 12, labelLineH + 8)
  ctx.fillStyle = LABEL_YELLOW
  ctx.fillText(labelText, infoX + 6, rowTops[0] + 4)

  // Row 1: name (uppercase, ellipsis-truncated to fit)
  ctx.font = `700 ${NAME_SIZE}px ${MONO_FONT}`
  ctx.fillStyle = INK
  ctx.fillText(truncateWithEllipsis(ctx, (name ?? '—').toUpperCase(), infoW), infoX, rowTops[1])

  // Rows 2, 4, 6, 8: dot dividers
  ctx.font = `700 ${INFO_LABEL_SIZE}px ${MONO_FONT}`
  for (const i of [2, 4, 6, 8]) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(infoX, rowTops[i], infoW, labelLineH)
    ctx.clip()
    ctx.fillText(PARTY_CARD_DOTS, infoX, rowTops[i])
    ctx.restore()
  }

  // Row 3: relation
  ctx.font = `700 ${INFO_LABEL_SIZE}px ${MONO_FONT}`
  ctx.textAlign = 'left'
  ctx.fillText('RELATION:', infoX, rowTops[3])
  ctx.textAlign = 'right'
  ctx.fillText((relation_to_tomo ?? '—').toUpperCase(), infoX + infoW, rowTops[3])

  // Row 5: Tomoland ID
  ctx.textAlign = 'left'
  ctx.fillText('TOMOLAND ID:', infoX, rowTops[5])
  ctx.textAlign = 'right'
  ctx.fillText(tomoland_id ?? '—', infoX + infoW, rowTops[5])

  // Row 7: place of issue
  ctx.textAlign = 'left'
  ctx.fillText('PLACE OF ISSUE:', infoX, rowTops[7])
  ctx.textAlign = 'right'
  ctx.fillText((place_of_issue ?? 'San Francisco, CA').toUpperCase(), infoX + infoW, rowTops[7])
  ctx.textAlign = 'left'

  // Row 9: blurb (wrapped lines computed above)
  ctx.font = `700 ${BLURB_SIZE}px ${MONO_FONT}`
  blurbLines.forEach((line, i) => {
    ctx.fillText(line, infoX, rowTops[9] + i * blurbLineH)
  })

  // Row 10: contact line
  ctx.font = `900 ${INFO_LABEL_SIZE}px ${MONO_FONT}`
  ctx.textAlign = 'right'
  ctx.fillText('TEXT +1 (415) 770 - 0048 IF FOUND', infoX + infoW, rowTops[10])
  ctx.textAlign = 'left'

  return canvas
}
