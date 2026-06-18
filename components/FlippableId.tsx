'use client'

import { useCallback, useRef, useState } from 'react'
import CitizenCard, { CitizenCardBack } from './CitizenCard'
import { getSleeveMetrics } from './IdSleeve'
import { CARD_H, CARD_W } from '@/lib/cardConstants'
import type { Citizen } from '@/types'

interface PointerState {
  x: number
  y: number
  nx: number
  ny: number
}

const IDLE: PointerState = { x: 50, y: 22, nx: 0, ny: -0.35 }

interface FlippableIdProps {
  citizen: Citizen
  cardWidth: number
  cardScale: number
  flipped: boolean
  onToggleFlip: () => void
  frontCardRef?: React.Ref<HTMLDivElement>
}

/**
 * The settled, post-print ID: keeps the sleeve's hover tilt/light-wash, and clicking
 * flips the WHOLE sleeve+card object (not just the bare card) to show the back.
 */
export default function FlippableId({
  citizen,
  cardWidth,
  cardScale,
  flipped,
  onToggleFlip,
  frontCardRef,
}: FlippableIdProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pointer, setPointer] = useState<PointerState>(IDLE)
  const [hovered, setHovered] = useState(false)

  const cardHeight = Math.round(CARD_H * cardScale)
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

  const faceWrapStyle = (isBack: boolean): React.CSSProperties => ({
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
    transform: isBack ? 'rotateY(180deg)' : undefined,
  })

  const sleeveChromeStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: sleeveRadius,
    border: '1.5px solid rgba(255, 255, 255, 0.55)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -1px 0 rgba(44,37,17,0.06), 0 4px 12px rgba(44, 37, 17, 0.12), 0 12px 28px rgba(44, 37, 17, 0.1)',
  }

  const plasticOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: sleeveRadius,
    background:
      'linear-gradient(165deg, rgba(255,255,255,0.22) 0%, rgba(255,252,245,0.16) 45%, rgba(255,248,228,0.14) 100%)',
    pointerEvents: 'none',
  }

  const lipStyle: React.CSSProperties = {
    position: 'absolute',
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 60,
    height: 11,
    borderRadius: 999,
    background: 'var(--color-paper)',
    zIndex: 5,
  }

  const cardWindowStyle: React.CSSProperties = {
    position: 'absolute',
    left: padX,
    top: padTop,
    width: cardWidth,
    height: cardHeight,
    overflow: 'hidden',
    borderRadius: cardRadius,
  }

  const scaledCardStyle: React.CSSProperties = {
    transform: `scale(${cardScale})`,
    transformOrigin: 'top left',
    width: CARD_W,
    height: CARD_H,
  }

  return (
    <div className="id-surface" style={{ perspective: 1100, perspectiveOrigin: '50% 45%' }}>
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false)
          setPointer(IDLE)
        }}
        onClick={onToggleFlip}
        role="button"
        aria-label="Flip ID card"
        style={{
          position: 'relative',
          width: cardWidth + padX * 2,
          height: cardHeight + padTop + padBottom,
          cursor: 'pointer',
          transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
          transformStyle: 'preserve-3d',
          transition: hovered ? 'none' : 'transform 0.45s ease',
          willChange: hovered ? 'transform' : 'auto',
        }}
      >
        {/* Flip wrapper — the whole sleeve+card object rotates together */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front face */}
          <div style={faceWrapStyle(false)}>
            <div style={sleeveChromeStyle} />
            <div style={cardWindowStyle}>
              <div ref={frontCardRef} style={scaledCardStyle}>
                <CitizenCard citizen={citizen} />
              </div>
            </div>
            <div style={plasticOverlayStyle} />
            {hovered && (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: sleeveRadius,
                  background: lightWash,
                  pointerEvents: 'none',
                }}
              />
            )}
            <div style={lipStyle} />
          </div>

          {/* Back face */}
          <div style={faceWrapStyle(true)}>
            <div style={sleeveChromeStyle} />
            <div style={cardWindowStyle}>
              <div style={scaledCardStyle}>
                <CitizenCardBack citizen={citizen} />
              </div>
            </div>
            <div style={plasticOverlayStyle} />
            {hovered && (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: sleeveRadius,
                  background: lightWash,
                  pointerEvents: 'none',
                }}
              />
            )}
            <div style={lipStyle} />
          </div>
        </div>
      </div>
    </div>
  )
}
