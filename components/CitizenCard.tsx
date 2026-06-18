import PixelHeart from './PixelHeart'
import { CARD_BORDER, CARD_BORDER_RADIUS, CARD_H, CARD_SHADOW, CARD_W } from '@/lib/cardConstants'
import type { Citizen } from '@/types'

// Natural card dimensions matching Figma (683 × 433 px)
const W = CARD_W
const H = CARD_H

interface CitizenCardProps {
  citizen: Partial<Citizen> & {
    name?: string
    relation_to_tomo?: string
    tomoland_id?: string
    photo_url?: string | null
    created_at?: string
  }
  preview?: boolean
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`
}

function formatResidentNo(tomolandId?: string): string {
  if (!tomolandId) return '????'
  return '#' + tomolandId.replace('TOMO-', '')
}

const DOTS = '........................................................'

export default function CitizenCard({ citizen, preview }: CitizenCardProps) {
  const {
    name,
    relation_to_tomo,
    tomoland_id,
    photo_url,
    created_at,
    place_of_issue,
  } = citizen

  return (
    <div
      style={{
        position: 'relative',
        width: W,
        height: H,
        background: '#FEFA7F',
        borderRadius: CARD_BORDER_RADIUS,
        overflow: 'hidden',
        border: CARD_BORDER,
        boxShadow: CARD_SHADOW,
        flexShrink: 0,
      }}
    >
      {/* Mountain background — blurred, bottom-anchored */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 700,
          height: 394,
          filter: 'blur(6px)',
          overflow: 'hidden',
        }}
      >
        <img
          src="/mountain-bg.png"
          alt=""
          aria-hidden
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.95,
          }}
        />
        {/* Gradient fade from yellow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(184.54deg, #FEFA7F 19.79%, rgba(254,250,127,0) 68.44%)',
          }}
        />
      </div>

      {/* TOMOSAPIEN heading */}
      <p
        style={{
          position: 'absolute',
          left: 36,
          top: 25,
          fontFamily: "'Reform ST Trial', 'Arial Black', Impact, sans-serif",
          fontWeight: 700,
          fontSize: 64,
          color: '#2C2511',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          margin: 0,
        }}
      >
        TOMOSAPIEN
      </p>

      {/* Pixel heart — top right */}
      <div style={{ position: 'absolute', right: 36, top: 40 }}>
        <PixelHeart />
      </div>

      {/* Photo slot */}
      <div
        style={{
          position: 'absolute',
          left: 36,
          top: 107,
          width: 240,
          height: 280,
          background: '#FFFFFF',
          border: '3px solid #2C2511',
          borderRadius: 0,
          overflow: 'hidden',
        }}
      >
        {photo_url ? (
          <img
            src={photo_url}
            alt={name ?? 'Citizen photo'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          /* Tomo character placeholder */
          <img
            src="/tomo-character.png"
            alt=""
            aria-hidden
            style={{
              position: 'absolute',
              bottom: -10,
              left: '50%',
              transform: 'translateX(-50%) rotate(-6.31deg)',
              width: 145,
              height: 'auto',
            }}
          />
        )}
      </div>

      {/* Info panel — fixed height so footer text never overlaps */}
      <div
        style={{
          position: 'absolute',
          left: 300,
          top: 107,
          width: 340,
          height: 168,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          fontFamily:
            "'GT Mechanik Mono Trial', 'Space Mono', 'Courier New', monospace",
          fontWeight: 700,
          fontSize: 10,
          color: '#2C2511',
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            background: '#2C2511',
            padding: '4px 6px',
            alignSelf: 'start',
            justifySelf: 'start',
          }}
        >
          <span
            style={{
              fontWeight: 900,
              fontSize: 10,
              color: '#FEFA80',
              whiteSpace: 'nowrap',
              letterSpacing: 0.2,
            }}
          >
            PERMANENT RESIDENT OF TOMOLAND
          </span>
        </div>

        {/* Name */}
        <p
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.25,
            minHeight: 30,
            flexShrink: 0,
          }}
        >
          {name ?? (preview ? 'YOUR NAME' : '—')}
        </p>

        {/* Dots */}
        <p style={{ margin: 0, overflow: 'hidden', whiteSpace: 'nowrap' }}>{DOTS}</p>

        {/* Relation */}
        <div style={{ display: 'flex' }}>
          <span style={{ whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
            Relation:
          </span>
          <span style={{ flex: 1, textAlign: 'right', textTransform: 'uppercase' }}>
            {relation_to_tomo ?? (preview ? '???' : '—')}
          </span>
        </div>

        {/* Dots */}
        <p style={{ margin: 0, overflow: 'hidden', whiteSpace: 'nowrap' }}>{DOTS}</p>

        {/* Resident number */}
        <div style={{ display: 'flex' }}>
          <span style={{ whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
            Tomoland Resident:
          </span>
          <span style={{ flex: 1, textAlign: 'right' }}>
            {formatResidentNo(tomoland_id ?? undefined)}
          </span>
        </div>

        {/* Dots */}
        <p style={{ margin: 0, overflow: 'hidden', whiteSpace: 'nowrap' }}>{DOTS}</p>

        {/* Date of issue */}
        <div style={{ display: 'flex', textTransform: 'uppercase' }}>
          <span style={{ whiteSpace: 'nowrap' }}>Date of issue:</span>
          <span style={{ flex: 1, textAlign: 'right' }}>
            {' '}{formatDate(created_at)}
          </span>
        </div>

        {/* Dots */}
        <p style={{ margin: 0, overflow: 'hidden', whiteSpace: 'nowrap' }}>{DOTS}</p>

        {/* Place of issue */}
        <div style={{ display: 'flex', textTransform: 'uppercase' }}>
          <span style={{ whiteSpace: 'nowrap' }}>Place of issue:</span>
          <span style={{ flex: 1, textAlign: 'right' }}>
            {place_of_issue ?? 'San Francisco, CA'}
          </span>
        </div>
      </div>

      {/* Card body text */}
      <p
        style={{
          position: 'absolute',
          left: 300,
          top: 272,
          width: 210,
          fontFamily:
            "'GT Mechanik Mono Trial', 'Space Mono', 'Courier New', monospace",
          fontWeight: 700,
          fontSize: 10,
          color: '#2C2511',
          margin: 0,
          lineHeight: 1.3,
        }}
      >
        This card certifies that the holder is a TOMOSAPIEN, permitted to live,
        build, & do things purely for the love of the game. Authorized to pursue
        all main & side quests.
      </p>

      {/* Found text */}
      <p
        style={{
          position: 'absolute',
          bottom: 16,
          right: 36,
          fontFamily:
            "'GT Mechanik Mono Trial', 'Space Mono', 'Courier New', monospace",
          fontWeight: 700,
          fontSize: 10,
          color: '#2C2511',
          margin: 0,
          whiteSpace: 'nowrap',
        }}
      >
        TEXT +1 (415) 770 - 0048 IF FOUND
      </p>
    </div>
  )
}

// Back of the card — per Figma node 33:6305
export function CitizenCardBack({
  citizen,
}: {
  citizen: Partial<Citizen> & { tomoland_id?: string }
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: W,
        height: H,
        background: '#FEFA7F',
        borderRadius: CARD_BORDER_RADIUS,
        overflow: 'hidden',
        border: CARD_BORDER,
        boxShadow: CARD_SHADOW,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img src="/TomoTomoTomo.svg" alt="" aria-hidden width={110} height={110} />
      <p
        style={{
          margin: '16px 0 0',
          fontFamily:
            "'GT Mechanik Mono Trial', 'Space Mono', 'Courier New', monospace",
          fontWeight: 700,
          fontSize: 10,
          color: '#2C2511',
        }}
      >
        {formatResidentNo(citizen.tomoland_id)}
      </p>

      <p
        style={{
          position: 'absolute',
          bottom: 16,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily:
            "'GT Mechanik Mono Trial', 'Space Mono', 'Courier New', monospace",
          fontWeight: 700,
          fontSize: 10,
          color: '#2C2511',
          margin: 0,
        }}
      >
        TEXT +1 (415) 770 - 0048 IF FOUND
      </p>
    </div>
  )
}

// Scaled-down thumbnail for use in directory rows
export function CitizenCardThumbnail({
  citizen,
  width = 138,
}: {
  citizen: Citizen
  width?: number
}) {
  const THUMB_H = Math.round(H * (width / W))
  const scale = width / W

  return (
    <div
      style={{
        width,
        height: THUMB_H,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: W,
          height: H,
          pointerEvents: 'none',
        }}
      >
        <CitizenCard citizen={citizen} />
      </div>
    </div>
  )
}
