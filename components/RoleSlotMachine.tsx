'use client'

import { useEffect, useRef, useState } from 'react'
import { randomRole, type Role } from '@/lib/roles'
import { playClickSound } from '@/lib/clickSound'
import RedShutterSphere from './RedShutterSphere'

const MARQUEE_BULBS = 5

const ITEM_H = 42
const WINDOW_ROWS = 3
const FILLER_COUNT = 27
const SPIN_MS = 2800

type Phase = 'idle' | 'reset' | 'spinning' | 'done'

interface RoleSlotMachineProps {
  onResolved: (role: Role) => void
  onSpinChange?: (spinning: boolean) => void
  /** Swap the small lever for a big, obvious tap target (e.g. for a touch kiosk) */
  bigButton?: boolean
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
}: RoleSlotMachineProps) {
  const [target, setTarget] = useState<Role>(() => randomRole())
  const [strip, setStrip] = useState<Role[]>(() => buildStrip(target))
  const [phase, setPhase] = useState<Phase>('idle')
  const [leverHover, setLeverHover] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const finalY = -(FILLER_COUNT - 1) * ITEM_H
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
          onSpinChange?.(false)
          onResolved(next)
          playClickSound()
        }, SPIN_MS)
      })
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
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
            alignItems: 'center',
            gap: bigButton ? 16 : 12,
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
              height: ITEM_H * WINDOW_ROWS,
              overflow: 'hidden',
              background: 'var(--color-tomo-yellow)',
              border: '2px solid var(--color-border)',
            }}
          >
            <div
              className={phase === 'spinning' ? 'slot-reel-blur' : undefined}
              style={{
                transform: `translateY(${atRest ? 0 : finalY}px)`,
                transition:
                  phase === 'spinning'
                    ? `transform ${SPIN_MS}ms cubic-bezier(0.1, 0.82, 0.14, 1)`
                    : 'none',
              }}
            >
              {strip.map((role, i) => {
                const isPeek = i === FILLER_COUNT - 1 || i === FILLER_COUNT + 1
                return (
                  <div
                    key={i}
                    className={isPeek ? 'slot-reel-peek' : undefined}
                    style={{
                      height: ITEM_H,
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
                      fontSize: 12,
                      letterSpacing: 0.4,
                      color: 'var(--color-ink)',
                      whiteSpace: 'nowrap',
                      padding: '0 8px',
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
                top: ITEM_H,
                height: ITEM_H,
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
              style={bigButtonStyle(phase === 'spinning')}
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
                onClick={pull}
                disabled={phase === 'spinning'}
                aria-label="Pull lever to choose your role"
                className={phase === 'spinning' ? 'slot-knob-pulled' : undefined}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 20,
                  height: 20,
                  border: 'none',
                  background: 'transparent',
                  cursor: phase === 'spinning' ? 'default' : 'pointer',
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
                  {phase === 'done' ? 'Reroll?' : 'Roll'}
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

function bigButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    boxSizing: 'border-box',
    background: disabled ? 'var(--color-ink-muted)' : 'var(--color-ink)',
    color: 'var(--color-tomo-yellow)',
    border: '1.5px solid var(--color-border)',
    padding: '10px 16px',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    fontWeight: 'var(--weight-bold)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
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
