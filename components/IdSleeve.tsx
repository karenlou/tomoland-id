'use client'

import { useCallback, useId, useRef, useState } from 'react'
import { CARD_BORDER_RADIUS } from '@/lib/cardConstants'

/** Shared by the sleeve's outer edge and the notch cutout, so the notch reads
 * as a punched-through hole in the same plastic rather than a flat pill on top. */
const SLEEVE_BORDER = '1.5px solid rgba(255, 255, 255, 0.55)'
/** The inset highlight/shadow pair is what actually reads as a beveled edge —
 * a plain border alone looks flat. Shared so the notch matches the outer rim. */
const SLEEVE_EDGE_BEVEL = 'inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -1px 0 rgba(44,37,17,0.06)'
const SLEEVE_OUTER_SHADOW = '0 4px 12px rgba(44, 37, 17, 0.12), 0 12px 28px rgba(44, 37, 17, 0.1)'
/** Plastic sheen behind/over the card — slightly stronger than before, it was reading too sheer */
const SLEEVE_SHEEN =
  'linear-gradient(165deg, rgba(255,255,255,0.3) 0%, rgba(255,252,245,0.22) 45%, rgba(255,248,228,0.2) 100%)'

const NOTCH_W = 60
const NOTCH_H = 11
const NOTCH_TOP = 12
const NOTCH_RADIUS = NOTCH_H / 2

interface IdSleeveProps {
  children: React.ReactNode
  cardWidth: number
  cardHeight: number
  cardScale: number
}

export function getSleeveMetrics(cardWidth: number, cardScale: number) {
  const padX = 26
  const padTop = 34
  const padBottom = 26
  const cardRadius = Math.round(CARD_BORDER_RADIUS * cardScale)
  const sleeveRadius = cardRadius + 6
  return { padX, padTop, padBottom, cardRadius, sleeveRadius }
}

/**
 * SVG mask def — punches the notch out of the plastic sheen so it's a true
 * cutout showing whatever's behind the sleeve, rather than a separate fill
 * color that has to be kept in sync with the surrounding background by hand.
 */
function NotchMaskDef({
  maskId,
  totalWidth,
  totalHeight,
}: {
  maskId: string
  totalWidth: number
  totalHeight: number
}) {
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <mask id={maskId} maskContentUnits="userSpaceOnUse">
          <rect x={0} y={0} width={totalWidth} height={totalHeight} fill="white" />
          <rect
            x={(totalWidth - NOTCH_W) / 2}
            y={NOTCH_TOP}
            width={NOTCH_W}
            height={NOTCH_H}
            rx={NOTCH_RADIUS}
            fill="black"
          />
        </mask>
      </defs>
    </svg>
  )
}

/** Plastic shell only — used for slip-on animation over an existing card */
export function IdSleeveShell({
  cardWidth,
  cardHeight,
  cardScale,
  className,
  style,
}: {
  cardWidth: number
  cardHeight: number
  cardScale: number
  className?: string
  style?: React.CSSProperties
}) {
  const maskId = useId()
  const { padX, padTop, padBottom, sleeveRadius } = getSleeveMetrics(cardWidth, cardScale)
  const totalW = cardWidth + padX * 2
  const totalH = cardHeight + padTop + padBottom

  return (
    <div
      className={className ? `id-surface ${className}` : 'id-surface'}
      style={{
        position: 'relative',
        width: totalW,
        height: totalH,
        padding: `${padTop}px ${padX}px ${padBottom}px`,
        borderRadius: sleeveRadius,
        border: SLEEVE_BORDER,
        boxShadow: `${SLEEVE_EDGE_BEVEL}, ${SLEEVE_OUTER_SHADOW}`,
        boxSizing: 'border-box',
        pointerEvents: 'none',
        ...style,
      }}
    >
      <NotchMaskDef maskId={maskId} totalWidth={totalW} totalHeight={totalH} />

      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: sleeveRadius,
          background: SLEEVE_SHEEN,
          mask: `url(#${maskId})`,
          WebkitMaskImage: `url(#${maskId})`,
        }}
      />

      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: NOTCH_TOP,
          left: '50%',
          transform: 'translateX(-50%)',
          width: NOTCH_W,
          height: NOTCH_H,
          borderRadius: NOTCH_RADIUS,
          border: SLEEVE_BORDER,
          boxShadow: SLEEVE_EDGE_BEVEL,
          boxSizing: 'border-box',
          zIndex: 5,
        }}
      />
      <div style={{ width: cardWidth, height: cardHeight }} aria-hidden />
    </div>
  )
}

interface PointerState {
  x: number
  y: number
  nx: number
  ny: number
}

const IDLE: PointerState = { x: 50, y: 22, nx: 0, ny: -0.35 }

export default function IdSleeve({
  children,
  cardWidth,
  cardHeight,
  cardScale,
}: IdSleeveProps) {
  const maskId = useId()
  const ref = useRef<HTMLDivElement>(null)
  const [pointer, setPointer] = useState<PointerState>(IDLE)
  const [hovered, setHovered] = useState(false)

  const { padX, padTop, padBottom, sleeveRadius } = getSleeveMetrics(cardWidth, cardScale)
  const totalW = cardWidth + padX * 2
  const totalH = cardHeight + padTop + padBottom

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 100
    const y = ((e.clientY - r.top) / r.height) * 100
    setPointer({
      x,
      y,
      nx: (e.clientX - (r.left + r.width / 2)) / (r.width / 2),
      ny: (e.clientY - (r.top + r.height / 2)) / (r.height / 2),
    })
  }, [])

  const tiltX = hovered ? -pointer.ny * 7 : 0
  const tiltY = hovered ? pointer.nx * 7 : 0

  const lightWash = `radial-gradient(ellipse 145% 110% at ${pointer.x}% ${pointer.y}%,
      rgba(255, 255, 255, 0.28) 0%,
      rgba(255, 252, 235, 0.14) 32%,
      rgba(255, 250, 220, 0.06) 55%,
      transparent 78%),
     radial-gradient(ellipse 200% 160% at ${pointer.x}% ${pointer.y}%,
      rgba(255, 255, 255, 0.1) 0%,
      transparent 65%)`

  return (
    <div className="id-surface" style={{ perspective: 1100, perspectiveOrigin: '50% 45%' }}>
      <NotchMaskDef maskId={maskId} totalWidth={totalW} totalHeight={totalH} />
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false)
          setPointer(IDLE)
        }}
        style={{
          position: 'relative',
          width: cardWidth + padX * 2,
          padding: `${padTop}px ${padX}px ${padBottom}px`,
          borderRadius: sleeveRadius,
          border: SLEEVE_BORDER,
          boxShadow: `${SLEEVE_EDGE_BEVEL}, ${SLEEVE_OUTER_SHADOW}`,
          overflow: 'visible',
          cursor: 'default',
          transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
          transformStyle: 'preserve-3d',
          transition: hovered ? 'none' : 'transform 0.45s ease',
          willChange: hovered ? 'transform' : 'auto',
        }}
      >
        {/* Card sits at the bottom of the stack. No Z-lift on hover — translateZ would
         * push it past the plastic overlay's z=0 plane inside this preserve-3d context
         * and pop it back in front, inconsistent with the resting state. */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            transform: hovered
              ? `translateX(${pointer.nx * -2}px) translateY(${pointer.ny * -2}px)`
              : 'translateZ(0)',
            transition: hovered ? 'none' : 'transform 0.45s ease',
          }}
        >
          {children}
        </div>

        {/* Translucent plastic sheet — rendered in front of the card, not behind it.
         * Masked so the notch cutout shows straight through to whatever is behind
         * the whole sleeve, instead of needing a hand-matched fill color. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: sleeveRadius,
            background: SLEEVE_SHEEN,
            pointerEvents: 'none',
            zIndex: 2,
            mask: `url(#${maskId})`,
            WebkitMaskImage: `url(#${maskId})`,
          }}
        />

        {hovered && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: sleeveRadius,
              background: lightWash,
              pointerEvents: 'none',
              zIndex: 3,
              mask: `url(#${maskId})`,
              WebkitMaskImage: `url(#${maskId})`,
            }}
          />
        )}

        {/* Notch cutout — border + bevel only, no fill of its own. The mask above
         * already punches the hole through the sheen/light-wash layers, so this
         * is a true see-through window rather than a color-matched patch. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: NOTCH_TOP,
            left: '50%',
            transform: 'translateX(-50%) translateZ(2px)',
            width: NOTCH_W,
            height: NOTCH_H,
            borderRadius: NOTCH_RADIUS,
            border: SLEEVE_BORDER,
            boxShadow: SLEEVE_EDGE_BEVEL,
            boxSizing: 'border-box',
            zIndex: 5,
          }}
        />
      </div>
    </div>
  )
}
