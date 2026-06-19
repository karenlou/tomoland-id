'use client'

import { useEffect, useRef, useState } from 'react'
import { randomRole, type Role } from '@/lib/roles'
import { playClickSound } from '@/lib/clickSound'
import RedShutterSphere from './RedShutterSphere'

const MARQUEE_BULBS = 5

const ITEM_H = 42
const KIOSK_ITEM_H = 70
const WINDOW_ROWS = 3
const FILLER_COUNT = 27
const SPIN_MS = 2800
const KIOSK_SPIN_MS = 1400

/** Lever travel — how far down the knob can be dragged, and how far counts as a full pull */
const MAX_PULL = 70
const PULL_THRESHOLD = 58
/** Release flourish — dips past MAX_PULL before springing back, like the lever's
 * own momentum carrying it slightly further than the user pulled */
const OVERSHOOT_PULL = MAX_PULL + 16
const DIP_MS = 110

type Phase = 'idle' | 'reset' | 'spinning' | 'done'

interface RoleSlotMachineProps {
  onResolved: (role: Role) => void
  onSpinChange?: (spinning: boolean) => void
  /** Swap the small lever for a big, obvious tap target (e.g. for a touch kiosk) */
  bigButton?: boolean
  /** Override reel spin duration (ms) */
  spinMs?: number
}

function buildStrip(target: Role): Role[] {
  const leading = Array.from({ length: FILLER_COUNT }, () => randomRole())
  const trailing = randomRole()
  return [...leading, target, trailing]
}

export default function RoleSlotMachine({
  onResolved,
  onSpinChange,
  bigButton = false,
  spinMs,
}: RoleSlotMachineProps) {
  const [target, setTarget] = useState<Role>(() => randomRole())
  const [strip, setStrip] = useState<Role[]>(() => buildStrip(target))
  const [phase, setPhase] = useState<Phase>('idle')
  const [hasRolled, setHasRolled] = useState(false)
  const [leverHover, setLeverHover] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [knobTransition, setKnobTransition] = useState<'none' | 'dip' | 'spring'>('spring')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragStartYRef = useRef(0)
  const isDraggingRef = useRef(false)
  const triggeredRef = useRef(false)

  const rowH = bigButton ? KIOSK_ITEM_H : ITEM_H
  const reelFontSize = bigButton ? 20 : 12
  const spinDuration = spinMs ?? (bigButton ? KIOSK_SPIN_MS : SPIN_MS)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (dipTimeoutRef.current) clearTimeout(dipTimeoutRef.current)
    }
  }, [])

  const finalY = -(FILLER_COUNT - 1) * rowH
  const atRest = phase === 'idle' || phase === 'reset'
  /** Strip index aligned with the payline center row for the current transform */
  const paylineCenterIdx = atRest ? 1 : FILLER_COUNT - 1

  function pull() {
    if (phase === 'spinning') return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    const next = randomRole()
    setTarget(next)
    setStrip(buildStrip(next))
    setPhase('reset')
    onSpinChange?.(true)

    // Double rAF: let the instant "reset to top" paint before re-enabling the
    // transition, otherwise React batches both updates and nothing animates.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPhase('spinning')
        timeoutRef.current = setTimeout(() => {
          setPhase('done')
          setHasRolled(true)
          onSpinChange?.(false)
          onResolved(next)
          playClickSound()
        }, spinDuration)
      })
    })
  }

  /** Release flourish — dip a bit lower than wherever the knob currently sits,
   * then spring back to rest. Plays whether the roll came from a drag or a click. */
  function flourishRelease() {
    if (dipTimeoutRef.current) clearTimeout(dipTimeoutRef.current)
    setKnobTransition('dip')
    setDragY(OVERSHOOT_PULL)
    dipTimeoutRef.current = setTimeout(() => {
      setKnobTransition('spring')
      setDragY(0)
    }, DIP_MS)
  }

  function handleKnobPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (phase === 'spinning') return
    if (dipTimeoutRef.current) clearTimeout(dipTimeoutRef.current)
    isDraggingRef.current = true
    dragStartYRef.current = e.clientY
    triggeredRef.current = false
    setKnobTransition('none')
    setDragY(0)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleKnobPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!isDraggingRef.current || triggeredRef.current) return
    const delta = Math.min(MAX_PULL, Math.max(0, e.clientY - dragStartYRef.current))
    setDragY(delta)
    if (delta >= PULL_THRESHOLD) {
      triggeredRef.current = true
      isDraggingRef.current = false
      pull()
      flourishRelease()
    }
  }

  function handleKnobPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    isDraggingRef.current = false
    // Already fired + animating from handleKnobPointerMove crossing the threshold.
    if (triggeredRef.current) return
    // A plain click (or a drag that didn't reach the threshold) still counts as a roll.
    triggeredRef.current = true
    pull()
    flourishRelease()
  }

  function handleKnobPointerCancel(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    isDraggingRef.current = false
    if (!triggeredRef.current) {
      setKnobTransition('spring')
      setDragY(0)
    }
  }

  function handleKnobKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if ((e.key === 'Enter' || e.key === ' ') && phase !== 'spinning') {
      e.preventDefault()
      triggeredRef.current = true
      pull()
      flourishRelease()
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: bigButton ? 'stretch' : 'center',
        width: '100%',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          background: 'var(--color-tomo-yellow)',
          border: '2px solid var(--color-border)',
          padding: '12px 14px',
          boxShadow: '3px 4px 0 rgba(44, 37, 17, 0.15)',
          boxSizing: 'border-box',
          overflow: 'visible',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <MarqueeBulbs active={phase === 'done'} burstKey={target} />
          <img
            src="/TomoTomoTomo.svg"
            alt=""
            aria-hidden
            width={22}
            height={22}
            style={{ display: 'block', flexShrink: 0 }}
          />
          <MarqueeBulbs active={phase === 'done'} burstKey={target} reverse />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: bigButton ? 'column' : 'row',
            alignItems: bigButton ? 'stretch' : 'center',
            gap: bigButton ? 28 : 12,
            overflow: 'visible',
            paddingRight: bigButton ? 0 : 6,
          }}
        >
          {/* Reel window — a stack of role rectangles, 3 rows tall so neighbors peek */}
          <div
            style={{
              position: 'relative',
              width: bigButton ? '100%' : undefined,
              flex: bigButton ? '0 0 auto' : 1,
              height: rowH * WINDOW_ROWS,
              overflow: 'hidden',
              background: 'var(--color-tomo-yellow)',
              border: '2px solid var(--color-border)',
            }}
          >
            <div
              className={
                phase === 'spinning'
                  ? bigButton
                    ? 'slot-reel-blur-kiosk'
                    : 'slot-reel-blur'
                  : undefined
              }
              style={{
                transform: `translateY(${atRest ? 0 : finalY}px)`,
                transition:
                  phase === 'spinning'
                    ? `transform ${spinDuration}ms ${bigButton ? 'cubic-bezier(0.18, 0.92, 0.38, 1)' : 'cubic-bezier(0.1, 0.82, 0.14, 1)'}`
                    : 'none',
                ...(phase === 'spinning' && bigButton
                  ? {
                      animationDuration: `${spinDuration}ms`,
                      animationTimingFunction: 'cubic-bezier(0.18, 0.92, 0.38, 1)',
                    }
                  : {}),
              }}
            >
              {strip.map((role, i) => {
                const isPeek = i === FILLER_COUNT - 1 || i === FILLER_COUNT + 1
                return (
                  <div
                    key={i}
                    className={isPeek ? 'slot-reel-peek' : undefined}
                    style={{
                      height: rowH,
                      boxSizing: 'border-box',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderTop:
                        i > 0 && i !== paylineCenterIdx && i !== paylineCenterIdx + 1
                          ? '1px solid var(--color-border)'
                          : 'none',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: reelFontSize,
                      letterSpacing: 0.4,
                      color: 'var(--color-ink)',
                      whiteSpace: 'nowrap',
                      padding: bigButton ? '0 16px' : '0 8px',
                    }}
                  >
                    {role.toUpperCase()}
                  </div>
                )
              })}
            </div>

            {/* Payline marking the centered, selected rectangle */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: rowH,
                height: rowH,
                boxSizing: 'border-box',
                boxShadow:
                  'inset 0 2px 0 0 var(--color-border), inset 0 -2px 0 0 var(--color-border)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
          </div>

          {bigButton ? (
            <button
              type="button"
              onClick={pull}
              disabled={phase === 'spinning'}
              aria-label="Randomize role"
              className={phase === 'spinning' ? 'slot-button-pressed' : undefined}
              style={bigButtonStyle(phase === 'spinning', hasRolled)}
            >
              {phase === 'spinning' ? 'Spinning…' : phase === 'done' ? 'Reroll' : 'Randomize'}
            </button>
          ) : (
            /* Lever — rail stays put, knob slides down it and springs back */
            <div
              className="slot-lever-column"
              onMouseEnter={() => setLeverHover(true)}
              onMouseLeave={() => setLeverHover(false)}
              style={{
                position: 'relative',
                width: 22,
                height: ITEM_H * WINDOW_ROWS,
                flexShrink: 0,
                overflow: 'visible',
              }}
            >
              <div aria-hidden style={leverRailStyle} />
              <button
                type="button"
                onPointerDown={handleKnobPointerDown}
                onPointerMove={handleKnobPointerMove}
                onPointerUp={handleKnobPointerUp}
                onPointerCancel={handleKnobPointerCancel}
                onKeyDown={handleKnobKeyDown}
                disabled={phase === 'spinning'}
                aria-label="Pull lever down to choose your role"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: `translate(-50%, ${dragY}px)`,
                  transition:
                    knobTransition === 'none'
                      ? 'none'
                      : knobTransition === 'dip'
                        ? `transform ${DIP_MS}ms ease-out`
                        : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  width: 20,
                  height: 20,
                  border: 'none',
                  background: 'transparent',
                  cursor: phase === 'spinning' ? 'default' : 'grab',
                  touchAction: 'none',
                  userSelect: 'none',
                  padding: 0,
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: KNOB_SIZE,
                    height: KNOB_SIZE,
                    zIndex: 1,
                  }}
                >
                  {phase === 'idle' && <LeverBurst />}
                  <RedShutterSphere size={KNOB_SIZE} />
                </div>
              </button>
              {leverHover && phase !== 'spinning' && (
                <span className="slot-lever-hint">
                  {phase === 'done' ? 'Reroll ↓' : 'Pull ↓'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const KNOB_SIZE = 20
const BURST_CANVAS = 48
const BURST_LINES = 12
/** Gap between knob corners and where burst lines begin */
const BURST_GAP = 5
const BURST_INNER = KNOB_SIZE / 2 + BURST_GAP
const BURST_LINE_LEN = 12

function LeverBurst() {
  const center = BURST_CANVAS / 2

  return (
    <div
      aria-hidden
      className="slot-lever-burst"
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: BURST_CANVAS,
        height: BURST_CANVAS,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {Array.from({ length: BURST_LINES }).map((_, i) => {
        const angle = (i * 360) / BURST_LINES
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: center,
              top: center,
              width: BURST_LINE_LEN,
              height: 2,
              background: 'var(--color-ink)',
              transformOrigin: '0 50%',
              transform: `rotate(${angle}deg) translate(${BURST_INNER}px, -50%)`,
              opacity: i % 2 === 0 ? 0.9 : 0.55,
            }}
          />
        )
      })}
    </div>
  )
}

const leverRailStyle: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: 0,
  bottom: 0,
  width: 4,
  transform: 'translateX(-50%)',
  background: 'var(--color-border)',
}

function bigButtonStyle(disabled: boolean, outline: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    boxSizing: 'border-box',
    border: '2px solid var(--color-border)',
    padding: '14px 24px',
    fontFamily: 'var(--font-body)',
    fontSize: 20,
    fontWeight: 'var(--weight-bold)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
  }

  if (outline) {
    return {
      ...base,
      background: 'transparent',
      color: disabled ? 'var(--color-ink-muted)' : 'var(--color-ink)',
    }
  }

  return {
    ...base,
    background: disabled ? 'var(--color-ink-muted)' : 'var(--color-ink)',
    color: 'var(--color-tomo-yellow)',
  }
}

function MarqueeBulbs({
  active,
  burstKey,
  reverse = false,
}: {
  active: boolean
  burstKey: string
  reverse?: boolean
}) {
  const bulbs = Array.from({ length: MARQUEE_BULBS }, (_, i) => i)

  return (
    <div
      key={active ? burstKey : 'idle'}
      className="slot-marquee-bulbs"
      aria-hidden
      style={{ flexDirection: reverse ? 'row-reverse' : 'row' }}
    >
      {bulbs.map((i) => (
        <div
          key={i}
          className={active ? 'slot-marquee-bulb slot-marquee-bulb-flash' : 'slot-marquee-bulb'}
          style={active ? { animationDelay: `${i * 0.1}s` } : undefined}
        />
      ))}
    </div>
  )
}
