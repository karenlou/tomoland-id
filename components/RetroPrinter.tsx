'use client'

import { useEffect, useRef, useState } from 'react'
import CitizenCard from './CitizenCard'
import FlippableId from './FlippableId'
import { IdSleeveShell, getSleeveMetrics } from './IdSleeve'
import { CARD_H, CARD_W, cardRadiusAtScale, MOBILE_CREATE_SPOTLIGHT_W } from '@/lib/cardConstants'
import { captureCardPng, downloadCardImage } from '@/lib/captureCardPng'
import { playPrinterSound, stopPrinterSound } from '@/lib/clickSound'
import { useIsMobile } from '@/lib/useIsMobile'
import { xShareIntentUrl } from '@/lib/xShareTemplate'
import type { Citizen } from '@/types'

const DESKTOP_SPOTLIGHT_W = 400
/** The printer body is art-directed slightly narrower than the spotlight
 * card it prints — keep that same ratio rather than a fixed px width, so it
 * stays proportional at the smaller mobile spotlight width too. */
const PRINT_VISUAL_SCALE = 340 / DESKTOP_SPOTLIGHT_W
/** Keep in sync with .retro-print-emerge's animation-duration in globals.css */
const PRINT_DURATION_MS = 4800
const PRINT_HOLD_MS = 500
/** Bottom edge of printer body — card clip starts below this. Matches the
 * printer graphic's actual rendered height (body + gray base strip); any
 * larger value leaves a gap here that shows the page's yellow through. */
const PRINTER_BOTTOM = 52
const SLOT_Y = PRINTER_BOTTOM

const SCALE_MS = 1200
const SLEEVE_MS = 2800
const SETTLE_MS = SCALE_MS + SLEEVE_MS
const FLOURISH_MS = 800
const REST_MS = 400
const CROSSFADE_MS = 900

type Phase = 'printing' | 'hold' | 'settling' | 'revealed'
type SettlePhase = 'scale' | 'sleeve' | 'flourish' | 'rest'

interface RetroPrinterProps {
  citizen: Citizen
  onComplete: () => void
}

export default function RetroPrinter({ citizen, onComplete }: RetroPrinterProps) {
  const isMobile = useIsMobile()
  const SPOTLIGHT_W = isMobile ? MOBILE_CREATE_SPOTLIGHT_W : DESKTOP_SPOTLIGHT_W
  const SCALE = SPOTLIGHT_W / CARD_W
  const SPOTLIGHT_H = Math.round(CARD_H * SCALE)
  const PRINT_W = Math.round(SPOTLIGHT_W * PRINT_VISUAL_SCALE)

  const [phase, setPhase] = useState<Phase>('printing')
  const [settlePhase, setSettlePhase] = useState<SettlePhase | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const spotlightRadius = cardRadiusAtScale(SCALE)
  const { padX, padTop, padBottom } = getSleeveMetrics(SPOTLIGHT_W, SCALE)
  const sleeveW = SPOTLIGHT_W + padX * 2
  const sleeveH = SPOTLIGHT_H + padTop + padBottom
  const printVisualH = Math.round(SPOTLIGHT_H * PRINT_VISUAL_SCALE)
  const printStageH = SLOT_Y + printVisualH + 12

  const isSettling = phase === 'settling'
  const isHold = phase === 'hold'
  const isRevealed = phase === 'revealed'
  /** Sleeve is visible and the card sits at its settled position from here on */
  const isSettled = isSettling || isRevealed
  /** Pre-mount during hold so the shell is in the DOM before the reveal runs */
  const showSleeveShell = isHold || isSettling

  useEffect(() => {
    playPrinterSound()
    const t1 = setTimeout(() => {
      setPhase('hold')
      stopPrinterSound()
    }, PRINT_DURATION_MS)
    return () => {
      clearTimeout(t1)
      stopPrinterSound()
    }
  }, [])

  useEffect(() => {
    if (phase !== 'hold') return
    const t2 = setTimeout(() => {
      setPhase('settling')
      setSettlePhase('scale')
    }, PRINT_HOLD_MS)
    return () => clearTimeout(t2)
  }, [phase])

  useEffect(() => {
    if (phase !== 'settling') return

    const t1 = setTimeout(() => setSettlePhase('sleeve'), SCALE_MS)
    const t2 = setTimeout(() => setSettlePhase('flourish'), SCALE_MS + SLEEVE_MS)
    const t3 = setTimeout(() => setSettlePhase('rest'), SCALE_MS + SLEEVE_MS + FLOURISH_MS)
    const t4 = setTimeout(
      () => setPhase('revealed'),
      SCALE_MS + SLEEVE_MS + FLOURISH_MS + REST_MS + CROSSFADE_MS,
    )

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [phase])

  const cardTransformClass = [
    phase === 'printing' ? 'retro-print-emerge' : '',
    phase === 'hold' ? 'retro-print-emerged' : '',
    isSettling ? 'retro-print-settle-motion' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const presentationClass = [
    'retro-print-presentation-inner',
    isSettling ? 'retro-print-presentation-post-sleeve' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const showFlippable =
    settlePhase === 'flourish' || settlePhase === 'rest' || isRevealed
  const assemblyFading = settlePhase === 'rest'
  const assemblyDismissed = isRevealed

  /** Once the sleeve has slipped on, the sleeve carries the shadow — fade out the
   * card's own chrome so the rest frame matches IdSpotlight's sleeved card exactly. */
  const sleeved = isSettling && settlePhase !== 'scale'

  const cardUnit = (
    <div
      className="id-surface retro-print-unified-card"
      style={{
        width: SPOTLIGHT_W,
        height: SPOTLIGHT_H,
        overflow: 'hidden',
        borderRadius: spotlightRadius,
        border: sleeved ? '1px solid transparent' : '1px solid var(--color-border)',
        boxShadow: sleeved
          ? '0 4px 12px rgba(44, 37, 17, 0)'
          : '0 4px 12px rgba(44, 37, 17, 0.12)',
        transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          transform: `scale(${SCALE})`,
          transformOrigin: 'top left',
          width: CARD_W,
          height: CARD_H,
        }}
      >
        <CitizenCard citizen={citizen} />
      </div>
    </div>
  )

  const settleEase = 'cubic-bezier(0.22, 1, 0.36, 1)'

  async function handleDownload() {
    if (!cardRef.current || downloading) return
    setDownloading(true)
    try {
      const dataUrl = await captureCardPng(cardRef.current)
      await downloadCardImage(dataUrl, `${citizen.tomoland_id || 'tomoland-id'}.png`)
      setDownloaded(true)
    } catch {
      // best-effort — leave the card on screen so they can still screenshot it
    } finally {
      setDownloading(false)
    }
  }

  function handlePostToX() {
    if (!downloaded) return
    window.open(xShareIntentUrl(), '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className={isSettled ? 'retro-print-settling' : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <div
        className="retro-print-stage"
        style={{
          position: 'relative',
          width: sleeveW,
          height: isSettled || isHold ? sleeveH : printStageH,
          /** Brief breathing room while the printer fades away, then settle back to 0
           * so the rest frame lines up with IdSpotlight's card position exactly. */
          marginTop: phase === 'settling' && settlePhase === 'scale' ? 20 : 0,
          overflow: isSettled || isHold ? 'visible' : 'hidden',
          transition: `height 1.2s ${settleEase}, margin-top ${SCALE_MS}ms ${settleEase}`,
        }}
      >
        {(phase === 'printing' || phase === 'hold' || isSettling) && (
          <div
            className="retro-print-printer"
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              width: PRINT_W + 40,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                position: 'relative',
                background: '#d4d4d4',
                border: '2px solid var(--color-border)',
                padding: '10px 14px 8px',
                boxShadow: 'inset 0 2px 0 #f0f0f0, inset 0 -2px 0 #a8a8a8',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    background: '#51AAFE',
                    border: '1px solid var(--color-border)',
                  }}
                />
                <div
                  style={{
                    width: 8,
                    height: 8,
                    background: '#FF769B',
                    border: '1px solid var(--color-border)',
                  }}
                />
              </div>
              <div
                style={{
                  height: 8,
                  background: '#1a1a1a',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
                }}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                left: 20,
                right: 20,
                bottom: -6,
                height: 10,
                background: '#b0b0b0',
                border: '1px solid var(--color-border)',
                borderTop: 'none',
              }}
            />
          </div>
        )}

        <div
          className={presentationClass}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: sleeveW,
            height: isSettled || isHold ? sleeveH : printStageH,
            overflow: 'visible',
            zIndex: 2,
            transition: `height 1.2s ${settleEase}`,
            '--settle-duration': `${SETTLE_MS}ms`,
            '--flourish-duration': `${FLOURISH_MS}ms`,
            '--scale-ms': `${SCALE_MS}ms`,
            '--sleeve-ms': `${SLEEVE_MS}ms`,
          } as React.CSSProperties}
        >
          {showFlippable ? (
            <div
              className="retro-print-handoff-layer retro-print-handoff-layer--under"
              style={{
                width: sleeveW,
                height: sleeveH,
                pointerEvents: isRevealed ? 'auto' : 'none',
              }}
            >
              <FlippableId
                citizen={citizen}
                cardWidth={SPOTLIGHT_W}
                cardScale={SCALE}
                flipped={flipped}
                onToggleFlip={() => setFlipped((f) => !f)}
                frontCardRef={cardRef}
              />
            </div>
          ) : null}

          {!assemblyDismissed ? (
            <div
              className={`retro-print-handoff-layer retro-print-handoff-layer--over${assemblyFading ? ' retro-print-handoff-layer--out' : ''}`}
              style={{ width: sleeveW, height: sleeveH }}
            >
            <div
              className="retro-print-sleeve-assembly"
              style={{
                position: 'absolute',
                inset: 0,
                width: sleeveW,
                height: sleeveH,
              }}
            >
              <div
                className="retro-print-card-slot"
                style={{
                  position: 'absolute',
                  left: padX,
                  top: isSettling ? padTop : SLOT_Y,
                  width: SPOTLIGHT_W,
                  height: phase === 'printing' ? printVisualH + 8 : SPOTLIGHT_H,
                  zIndex: 1,
                  overflow: phase === 'printing' ? 'hidden' : 'visible',
                  transition: isSettling
                    ? `top ${SCALE_MS}ms ${settleEase} 0ms, height 1.2s ${settleEase}`
                    : `top 1.2s ${settleEase}, height 1.2s ${settleEase}`,
                }}
              >
                <div
                  className={cardTransformClass}
                  style={{
                    width: SPOTLIGHT_W,
                    height: SPOTLIGHT_H,
                    transformOrigin: 'top center',
                    '--print-distance': `${printVisualH + 20}px`,
                    '--print-visual-scale': PRINT_VISUAL_SCALE,
                    '--sleeve-room-scale': '0.94',
                    '--settle-duration': `${SETTLE_MS}ms`,
                    '--scale-ms': `${SCALE_MS}ms`,
                    '--sleeve-ms': `${SLEEVE_MS}ms`,
                  } as React.CSSProperties}
                >
                  {cardUnit}
                </div>
              </div>

              {showSleeveShell && (
                <IdSleeveShell
                  cardWidth={SPOTLIGHT_W}
                  cardHeight={SPOTLIGHT_H}
                  cardScale={SCALE}
                  className="retro-print-sleeve-shell"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 12,
                  }}
                />
              )}
            </div>
          </div>
          ) : null}

          {settlePhase === 'flourish' && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 22 }}>
              <div className="retro-print-flourish-glow" aria-hidden />
              <div className="retro-print-flourish-sweep" aria-hidden />
            </div>
          )}
        </div>
      </div>

      {isRevealed ? (
        <div
          className="retro-print-revealed-actions"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: sleeveW,
            marginTop: 24,
            minHeight: 52,
          }}
        >
          <div className="retro-print-action-row" style={{ width: '100%' }}>
            <div
              className={`retro-download-group${downloaded ? ' retro-download-group--split' : ''}`}
            >
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="retro-download-btn"
                style={revealDownloadBtn(downloading)}
              >
                Download
              </button>
              {downloaded && (
                <button
                  type="button"
                  onClick={handlePostToX}
                  className="retro-share-btn"
                  style={revealShareBtn}
                >
                  Share to X
                </button>
              )}
            </div>
            <button type="button" onClick={onComplete} style={revealPrimaryBtn}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <p
          className="retro-print-status"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--color-ink-muted)',
            marginTop: 24,
            minHeight: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textTransform: 'uppercase',
            letterSpacing: 0.4,
          }}
        >
          {isSettling
            ? settlePhase === 'flourish' || settlePhase === 'rest'
              ? '✦ Official Tomoland ID ✦'
              : 'Almost there…'
            : isHold
              ? 'Print complete!'
              : 'Printing your ID…'}
        </p>
      )}
    </div>
  )
}

const revealPrimaryBtn: React.CSSProperties = {
  flex: 1,
  background: 'var(--color-ink)',
  color: 'var(--color-tomo-yellow)',
  border: '1.5px solid var(--color-border)',
  padding: '10px 16px',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
  fontWeight: 'var(--weight-bold)',
  cursor: 'pointer',
}

const revealShareBtn: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  color: 'var(--color-ink)',
  border: '1.5px solid var(--color-border)',
  padding: '10px 14px',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
  fontWeight: 'var(--weight-bold)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

function revealDownloadBtn(disabled: boolean): React.CSSProperties {
  return {
    background: 'transparent',
    color: disabled ? 'var(--color-ink-muted)' : 'var(--color-ink)',
    border: `1.5px solid ${disabled ? 'var(--color-ink-muted)' : 'var(--color-border)'}`,
    padding: '10px 16px',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    fontWeight: 'var(--weight-bold)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
  }
}
