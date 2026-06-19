import type { CSSProperties } from 'react'
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
  PARTY_CARD_NATIVE_H,
  PARTY_CARD_NATIVE_W,
  PHOTO_GAP,
  PHOTO_H,
  PHOTO_TOP,
  PHOTO_W,
  TITLE_SIZE,
  TITLE_TOP,
} from '@/lib/partyCardLayout'
import type { Citizen } from '@/types'

const W = PARTY_CARD_NATIVE_W
const H = PARTY_CARD_NATIVE_H

interface PartyCardProps {
  citizen: Partial<Citizen> & {
    name?: string
    relation_to_tomo?: string
    tomoland_id?: string
    photo_url?: string | null
  }
  /** Live kiosk preview — placeholder text for unfilled fields */
  preview?: boolean
}

const DOTS = PARTY_CARD_DOTS

const infoMono: CSSProperties = {
  fontFamily: "'GT Mechanik Mono Trial', 'Space Mono', 'Courier New', monospace",
  fontWeight: 700,
  color: '#2C2511',
}

const contactMono: CSSProperties = {
  fontFamily: "'GT Mechanik Mono Trial', 'Space Mono', 'Courier New', monospace",
  fontWeight: 900,
  color: '#2C2511',
}

const dividerStyle: CSSProperties = {
  margin: 0,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
}

const BLURB_TEXT = PARTY_CARD_BLURB

export default function PartyCard({ citizen, preview }: PartyCardProps) {
  const { name, relation_to_tomo, tomoland_id, photo_url, place_of_issue } = citizen

  return (
    <div
      style={{
        position: 'relative',
        width: W,
        height: H,
        background: '#FEFA7F',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <img
        src={FRONT_MTN_BG}
        alt=""
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: W,
          height: Math.round((644 / 1350) * W),
          objectFit: 'cover',
          objectPosition: 'center bottom',
          pointerEvents: 'none',
        }}
      />

      <p
        style={{
          position: 'absolute',
          left: CONTENT_LEFT,
          top: TITLE_TOP,
          fontFamily: "'Reform ST Trial', 'Arial Black', Impact, sans-serif",
          fontWeight: 700,
          fontSize: TITLE_SIZE,
          color: '#2C2511',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          margin: 0,
        }}
      >
        TOMOSAPIEN
      </p>

      <img
        src="/tomohearticon.svg"
        alt=""
        aria-hidden
        width={HEART_W}
        height={HEART_H}
        style={{
          position: 'absolute',
          right: CONTENT_RIGHT,
          top: HEART_TOP,
          width: HEART_W,
          height: HEART_H,
          objectFit: 'contain',
        }}
      />

      {/* Photo + info column */}
      <div
        style={{
          position: 'absolute',
          left: CONTENT_LEFT,
          top: PHOTO_TOP,
          width: CONTENT_W,
          height: PHOTO_H,
          display: 'flex',
          gap: PHOTO_GAP,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: PHOTO_W,
            height: PHOTO_H,
            flexShrink: 0,
            background: '#F3EFED',
            border: '3px solid #2C2511',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          {photo_url && (
            <img
              src={photo_url}
              alt={name ?? 'Guest photo'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          <img
            src="/party-mascot-badge.svg"
            alt=""
            aria-hidden
            width={MASCOT_W}
            height={MASCOT_H}
            style={{
              position: 'absolute',
              left: MASCOT_LEFT,
              top: MASCOT_TOP,
              width: MASCOT_W,
              height: MASCOT_H,
              objectFit: 'contain',
              transform: `rotate(${MASCOT_ROTATE}deg)`,
              transformOrigin: 'center center',
            }}
          />
        </div>

        {/* Info column — full photo height, evenly distributed */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            height: PHOTO_H,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden',
            ...infoMono,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              background: '#2C2511',
              padding: '4px 6px',
              alignSelf: 'start',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontWeight: 900,
                fontSize: INFO_LABEL_SIZE,
                lineHeight: INFO_LABEL_LINE,
                color: '#FEFA80',
                whiteSpace: 'nowrap',
                letterSpacing: 0.2,
              }}
            >
              PERMANENT RESIDENT OF TOMOLAND
            </span>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: NAME_SIZE,
              fontWeight: 700,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: INFO_NAME_LINE,
              flexShrink: 0,
            }}
          >
            {name ?? (preview ? 'YOUR NAME' : '—')}
          </p>

          <p style={{ ...dividerStyle, fontSize: INFO_LABEL_SIZE, lineHeight: INFO_LABEL_LINE }}>
            {DOTS}
          </p>

          <div
            style={{
              display: 'flex',
              fontSize: INFO_LABEL_SIZE,
              lineHeight: INFO_LABEL_LINE,
              flexShrink: 0,
            }}
          >
            <span style={{ whiteSpace: 'nowrap', textTransform: 'uppercase' }}>Relation:</span>
            <span style={{ flex: 1, textAlign: 'right', textTransform: 'uppercase' }}>
              {relation_to_tomo ?? (preview ? '???' : '—')}
            </span>
          </div>

          <p style={{ ...dividerStyle, fontSize: INFO_LABEL_SIZE, lineHeight: INFO_LABEL_LINE }}>
            {DOTS}
          </p>

          <div
            style={{
              display: 'flex',
              fontSize: INFO_LABEL_SIZE,
              lineHeight: INFO_LABEL_LINE,
              flexShrink: 0,
            }}
          >
            <span style={{ whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
              Tomoland ID:
            </span>
            <span style={{ flex: 1, textAlign: 'right' }}>
              {tomoland_id ?? (preview ? 'TOMO-????' : '—')}
            </span>
          </div>

          <p style={{ ...dividerStyle, fontSize: INFO_LABEL_SIZE, lineHeight: INFO_LABEL_LINE }}>
            {DOTS}
          </p>

          <div
            style={{
              display: 'flex',
              fontSize: INFO_LABEL_SIZE,
              lineHeight: INFO_LABEL_LINE,
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>Place of issue:</span>
            <span style={{ flex: 1, textAlign: 'right' }}>
              {place_of_issue ?? 'San Francisco, CA'}
            </span>
          </div>

          <p style={{ ...dividerStyle, fontSize: INFO_LABEL_SIZE, lineHeight: INFO_LABEL_LINE }}>
            {DOTS}
          </p>

          <p
            style={{
              margin: 0,
              fontSize: BLURB_SIZE,
              lineHeight: INFO_BLURB_LINE,
              textAlign: 'left',
              flexShrink: 0,
            }}
          >
            {BLURB_TEXT}
          </p>

          <p
            style={{
              margin: 0,
              alignSelf: 'flex-end',
              ...contactMono,
              fontSize: INFO_LABEL_SIZE,
              lineHeight: INFO_LABEL_LINE,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            TEXT +1 (415) 770 - 0048 IF FOUND
          </p>
        </div>
      </div>
    </div>
  )
}
