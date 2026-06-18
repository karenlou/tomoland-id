'use client'

import { useEffect, useRef, useState } from 'react'
import { randomRole, type Role } from '@/lib/roles'
import { playClickSound } from '@/lib/clickSound'

const ITEM_H = 42
const WINDOW_ROWS = 3
const FILLER_COUNT = 27
const SPIN_MS = 2800

type Phase = 'idle' | 'reset' | 'spinning' | 'done'

interface RoleSlotMachineProps {
  onResolved: (role: Role) => void
  onSpinChange?: (spinning: boolean) => void
}

function buildStrip(target: Role): Role[] {
  const leading = Array.from({ length: FILLER_COUNT }, () => randomRole())
  const trailing = randomRole()
  return [...leading, target, trailing]
}

export default function RoleSlotMachine({ onResolved, onSpinChange }: RoleSlotMachineProps) {
  const [target, setTarget] = useState<Role>(() => randomRole())
  const [strip, setStrip] = useState<Role[]>(() => buildStrip(target))
  const [phase, setPhase] = useState<Phase>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const finalY = -(FILLER_COUNT - 1) * ITEM_H
  const atRest = phase === 'idle' || phase === 'reset'

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
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <img
            src="/TomoTomoTomo.svg"
            alt=""
            aria-hidden
            width={22}
            height={22}
            style={{ display: 'block' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Reel window — a stack of role rectangles, 3 rows tall so neighbors peek */}
          <div
            style={{
              position: 'relative',
              flex: 1,
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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderBottom: '1px solid var(--color-border)',
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
                borderTop: '2px solid var(--color-border)',
                borderBottom: '2px solid var(--color-border)',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Lever — rail stays put, knob slides down it and springs back */}
          <div style={{ position: 'relative', width: 22, height: ITEM_H * WINDOW_ROWS, flexShrink: 0 }}>
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
              }}
            >
              <div style={knobStyle} />
            </button>
          </div>
        </div>

        <p
          style={{
            textAlign: 'center',
            margin: '10px 0 0',
            paddingTop: 8,
            borderTop: '1px solid var(--color-border)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: 0.4,
            color: 'var(--color-ink)',
            textTransform: 'uppercase',
            minHeight: 14,
          }}
        >
          {phase === 'spinning'
            ? ''
            : phase === 'done'
              ? 'Pull again to reroll'
              : 'Pull for your role'}
        </p>
      </div>
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

const knobStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  background: 'var(--color-ink)',
  border: '2px solid var(--color-border)',
}
