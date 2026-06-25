'use client'

import { useEffect, useRef, useState } from 'react'
import CitizenCard, { CitizenCardThumbnail } from './CitizenCard'
import { CARD_BORDER_RADIUS, CARD_H, CARD_W } from '@/lib/cardConstants'
import { captureCardPng, downloadCardImage, toDataUrl } from '@/lib/captureCardPng'
import type { Citizen } from '@/types'

interface DownloadListProps {
  citizens: Citizen[]
}

/** Strips characters that don't belong in a filename and collapses
 * whitespace to hyphens, so "Jane Doe" + "TOMO-0123" → "Jane-Doe-TOMO-0123.png". */
function downloadFilename(citizen: Citizen): string {
  const safeName = citizen.name.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
  const id = citizen.tomoland_id || 'tomoland-id'
  return safeName ? `${safeName}-${id}.png` : `${id}.png`
}

/**
 * Admin-only bulk export — not linked from the main directory (see
 * app/download/layout.tsx). The main site only ever lets a device download
 * the citizen it owns; this lists everyone with a per-row Download button.
 *
 * Only one full-size, unscaled CitizenCard is ever mounted at a time (the
 * one currently being captured) rather than one per row — with 200+ rows
 * that's 200+ photo <img> elements and full layout trees sitting in the DOM
 * for no reason, when the visible rows only need the existing lightweight
 * CitizenCardThumbnail.
 */
export default function DownloadList({ citizens }: DownloadListProps) {
  const [query, setQuery] = useState('')
  const [downloadTarget, setDownloadTarget] = useState<Citizen | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const captureRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? citizens.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    : citizens

  useEffect(() => {
    if (!downloadTarget) return
    let cancelled = false

    async function run() {
      if (!captureRef.current) return
      try {
        const dataUrl = await captureCardPng(captureRef.current)
        if (cancelled) return
        await downloadCardImage(
          dataUrl,
          downloadTarget ? downloadFilename(downloadTarget) : 'tomoland-id.png',
        )
      } catch {
        // best-effort — the row's button just stops spinning, nothing else to fall back to
      } finally {
        if (!cancelled) {
          setDownloadingId(null)
          setDownloadTarget(null)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [downloadTarget])

  async function handleDownloadClick(citizen: Citizen) {
    if (downloadingId) return
    setDownloadingId(citizen.id)

    // Inline the photo as a data URI ourselves before mounting the capture
    // card. html-to-image does its own (separately CORS-gated) fetch of
    // remote images to embed them — a freshly-mounted, off-screen photo is
    // exactly the case most likely to still be loading when that runs,
    // especially over a mobile connection, and is what was producing IDs
    // with the photo missing. Having the bytes in hand first removes that
    // race; falling back to the original URL on failure just leaves it as
    // fragile as before rather than losing the capture entirely.
    let prepared = citizen
    if (citizen.photo_url) {
      const inlined = await toDataUrl(citizen.photo_url)
      if (inlined) {
        prepared = { ...citizen, photo_url: inlined }
      }
    }

    setDownloadTarget(prepared)
  }

  return (
    <div
      style={{
        height: '100dvh',
        overflowY: 'auto',
        boxSizing: 'border-box',
        padding: '28px 48px',
        background: 'var(--color-paper)',
      }}
    >
      <header style={{ marginBottom: 20 }}>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: 13,
            color: 'var(--color-ink)',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Tomoland ID — Bulk Export
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 28,
            color: 'var(--color-ink)',
            margin: '4px 0 16px',
          }}
        >
          Download IDs
        </h1>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-small)',
              color: 'var(--color-ink-muted)',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {filtered.length} of {citizens.length} citizens
          </p>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search citizens..."
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-body)',
              color: 'var(--color-ink)',
              background: 'transparent',
              border: '1.5px solid var(--color-border)',
              padding: '8px 12px',
              outline: 'none',
              width: 260,
              boxSizing: 'border-box',
            }}
          />
        </div>
      </header>

      <div style={{ border: '1.5px solid var(--color-border)' }}>
        {filtered.length === 0 ? (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-body)',
              color: 'var(--color-ink-muted)',
              padding: '40px 0',
              textAlign: 'center',
            }}
          >
            No citizens match your search.
          </p>
        ) : (
          filtered.map((c, i) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '10px 14px',
                borderTop: i > 0 ? '1px solid var(--color-border)' : undefined,
              }}
            >
              <div
                style={{
                  background: 'var(--color-tomo-yellow-dark)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  padding: 4,
                  flexShrink: 0,
                }}
              >
                <CitizenCardThumbnail citizen={c} width={56} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 'var(--weight-bold)',
                    fontSize: 16,
                    color: 'var(--color-ink)',
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {c.name}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: 'var(--color-ink-muted)',
                    margin: 0,
                  }}
                >
                  {'#' + c.tomoland_id.replace('TOMO-', '')} · {c.relation_to_tomo}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDownloadClick(c)}
                disabled={downloadingId !== null}
                style={{
                  flexShrink: 0,
                  background: downloadingId === c.id ? 'var(--color-ink-muted)' : 'var(--color-ink)',
                  color: 'var(--color-tomo-yellow)',
                  border: '1.5px solid var(--color-border)',
                  padding: '8px 16px',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: 'var(--weight-bold)',
                  cursor: downloadingId !== null ? 'not-allowed' : 'pointer',
                  opacity: downloadingId !== null && downloadingId !== c.id ? 0.5 : 1,
                }}
              >
                {downloadingId === c.id ? 'Saving…' : 'Download'}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Off-screen capture target for whichever citizen is currently being
       * downloaded — see the effect above. Unscaled (CARD_W x CARD_H) since
       * html-to-image captures at native size; the visible rows above use
       * the already-scaled CitizenCardThumbnail instead. */}
      {downloadTarget && (
        <div style={{ position: 'fixed', top: 0, left: -9999, pointerEvents: 'none' }} aria-hidden>
          <div
            ref={captureRef}
            style={{
              width: CARD_W,
              height: CARD_H,
              borderRadius: CARD_BORDER_RADIUS,
              overflow: 'hidden',
            }}
          >
            <CitizenCard citizen={downloadTarget} />
          </div>
        </div>
      )}
    </div>
  )
}
