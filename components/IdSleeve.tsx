'use client'

import { useCallback, useRef, useState } from 'react'
import { CARD_BORDER_RADIUS } from '@/lib/cardConstants'

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
  const { padX, padTop, padBottom, sleeveRadius } = getSleeveMetrics(cardWidth, cardScale)

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: cardWidth + padX * 2,
        height: cardHeight + padTop + padBottom,
        padding: `${padTop}px ${padX}px ${padBottom}px`,
        borderRadius: sleeveRadius,
        background:
          'linear-gradient(165deg, rgba(255,255,255,0.22) 0%, rgba(255,252,245,0.16) 45%, rgba(255,248,228,0.14) 100%)',
        border: '1.5px solid rgba(255, 255, 255, 0.55)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -1px 0 rgba(44,37,17,0.06), 0 4px 12px rgba(44, 37, 17, 0.12), 0 12px 28px rgba(44, 37, 17, 0.1)',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        ...style,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 60,
          height: 11,
          borderRadius: 999,
          background: 'var(--color-paper)',
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
  cardScale,
}: IdSleeveProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pointer, setPointer] = useState<PointerState>(IDLE)
  const [hovered, setHovered] = useState(false)

  const { padX, padTop, padBottom, cardRadius, sleeveRadius } = getSleeveMetrics(
    cardWidth,
    cardScale,
  )

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
    <div style={{ perspective: 1100, perspectiveOrigin: '50% 45%' }}>
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
          border: '1.5px solid rgba(255, 255, 255, 0.55)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -1px 0 rgba(44,37,17,0.06), 0 4px 12px rgba(44, 37, 17, 0.12), 0 12px 28px rgba(44, 37, 17, 0.1)',
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

        {/* Translucent plastic sheet — rendered in front of the card, not behind it */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: sleeveRadius,
            background:
              'linear-gradient(165deg, rgba(255,255,255,0.22) 0%, rgba(255,252,245,0.16) 45%, rgba(255,248,228,0.14) 100%)',
            pointerEvents: 'none',
            zIndex: 2,
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
            }}
          />
        )}

        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 60,
            height: 11,
            borderRadius: 999,
            background: 'var(--color-paper)',
            zIndex: 5,
          }}
        />
      </div>
    </div>
  )
}
