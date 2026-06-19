'use client'

import CitizenCard from './CitizenCard'
import IdSleeve from './IdSleeve'
import {
  CARD_DEPTH_SHADOW,
  CARD_H,
  CARD_W,
  cardRadiusAtScale,
  SPOTLIGHT_SLEEVE_W,
  SPOTLIGHT_W,
} from '@/lib/cardConstants'
import type { Citizen } from '@/types'

/** Slightly smaller than the standard spotlight width, so the card has more
 * breathing room inside its new bordered mount */
const DISPLAY_W = Math.round(SPOTLIGHT_W * 0.9)
const SCALE = DISPLAY_W / CARD_W

interface IdSpotlightProps {
  citizen: Citizen | null
  onGetId: () => void
  onViewMyId?: () => void
  onReissue?: () => void
  onDelete?: () => void
  myCitizenId?: string | null
  revealFooter?: boolean
}

const CERT_TEXT =
  'This card certifies that the holder is a TOMOSAPIEN, permitted to live, build, & do things purely for the love of the game. Authorized to pursue all main & side quests.'

export function WelcomeBar({
  hasOwnId,
  isOwnSelected,
  onGetId,
  onViewMyId,
  onReissue,
  onDelete,
}: {
  hasOwnId: boolean
  isOwnSelected?: boolean
  onGetId: () => void
  onViewMyId?: () => void
  onReissue?: () => void
  onDelete?: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        background: 'var(--color-tomo-yellow-dark)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 8px',
            borderRight: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <img
            src="/mascot.png"
            alt=""
            aria-hidden
            width={14}
            height={14}
            style={{ imageRendering: 'pixelated', display: 'block' }}
          />
        </div>
        <span
          style={{
            padding: '6px 10px',
            fontFamily: 'var(--font-body)',
            fontWeight: 'var(--weight-bold)',
            fontSize: 11,
            color: 'var(--color-ink)',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          Welcome to Tomoland
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          borderTop: '1px solid var(--color-border)',
          padding: '10px 14px',
        }}
      >
        <p
          style={{
            flex: 1,
            minWidth: 0,
            margin: 0,
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 'var(--weight-regular)',
            color: 'var(--color-ink)',
            lineHeight: 1.3,
          }}
        >
          {hasOwnId ? CERT_TEXT : 'Want to be a resident?'}
        </p>
        {!(hasOwnId && isOwnSelected) && (
          <button
            type="button"
            onClick={hasOwnId ? onViewMyId : onGetId}
            style={{
              background: 'var(--color-ink)',
              color: 'var(--color-tomo-yellow)',
              border: '1.5px solid var(--color-border)',
              padding: '11px 24px',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 'var(--weight-bold)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            {hasOwnId ? 'View my ID' : 'Get your ID!'}
          </button>
        )}
      </div>

      {hasOwnId && isOwnSelected && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            borderTop: '1px solid var(--color-border)',
            padding: '8px 14px',
          }}
        >
          <button type="button" onClick={onReissue} style={manageBtnStyle}>
            Re-issue ID
          </button>
          <button type="button" onClick={onDelete} style={deleteBtnStyle}>
            Delete ID
          </button>
        </div>
      )}
    </div>
  )
}

export default function IdSpotlight({
  citizen,
  onGetId,
  onViewMyId,
  onReissue,
  onDelete,
  myCitizenId,
  revealFooter,
}: IdSpotlightProps) {
  const hasOwnId = Boolean(myCitizenId)
  const isOwnSelected = Boolean(citizen && myCitizenId && citizen.id === myCitizenId)
  const cardH = Math.round(CARD_H * SCALE)
  const cardRadius = cardRadiusAtScale(SCALE)

  const cardBlock = (
    <div
      style={{
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'center',
        padding: '28px 20px',
        borderTop: '1.5px solid var(--color-border)',
        background: 'var(--color-tomo-yellow-light)',
        flexShrink: 0,
      }}
    >
      <IdSleeve cardWidth={DISPLAY_W} cardHeight={cardH} cardScale={SCALE}>
        {citizen ? (
          <div
            style={{
              width: DISPLAY_W,
              height: cardH,
              borderRadius: cardRadius,
              boxShadow: CARD_DEPTH_SHADOW,
            }}
          >
            <div
              style={{
                width: DISPLAY_W,
                height: cardH,
                overflow: 'hidden',
                borderRadius: cardRadius,
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
          </div>
        ) : (
          <div
            style={{
              width: DISPLAY_W,
              height: cardH,
              borderRadius: cardRadius,
              background: 'var(--color-tomo-yellow)',
              opacity: 0.5,
            }}
          />
        )}
      </IdSleeve>
    </div>
  )

  return (
    <div
      className={revealFooter ? 'id-spotlight-footer-in' : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: SPOTLIGHT_SLEEVE_W,
        boxSizing: 'border-box',
        border: '1.5px solid var(--color-border)',
        flexShrink: 0,
      }}
    >
      <WelcomeBar
        hasOwnId={hasOwnId}
        isOwnSelected={isOwnSelected}
        onGetId={onGetId}
        onViewMyId={onViewMyId}
        onReissue={onReissue}
        onDelete={onDelete}
      />
      {cardBlock}
    </div>
  )
}

const manageBtnStyle: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  color: 'var(--color-ink)',
  border: '1.5px solid var(--color-border)',
  padding: '8px 12px',
  fontFamily: 'var(--font-body)',
  fontSize: 12,
  fontWeight: 'var(--weight-bold)',
  cursor: 'pointer',
  textTransform: 'uppercase',
  letterSpacing: 0.3,
}

const deleteBtnStyle: React.CSSProperties = {
  ...manageBtnStyle,
  color: 'var(--color-error)',
  borderColor: 'var(--color-error)',
}
