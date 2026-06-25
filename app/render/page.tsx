'use client'

/**
 * Headless render harness — NOT linked anywhere in the product.
 * The bulk-ID tooling drives this route with Playwright: it navigates to
 * /render?name=…&role=…&photo=…&id=…, waits for window.__cardReady, then
 * screenshots the .id-surface element to get a pixel-identical PNG of the
 * same CitizenCard the /download admin page produces.
 *
 * Faces are served same-origin from /faces/<slug>.png so the capture never
 * has to deal with a cross-origin <img>.
 */

import { useEffect, useRef, useState } from 'react'
import CitizenCard from '@/components/CitizenCard'
import { CARD_W, CARD_H, CARD_BORDER_RADIUS } from '@/lib/cardConstants'

declare global {
  interface Window {
    __cardReady?: boolean
  }
}

export default function RenderPage() {
  const captureRef = useRef<HTMLDivElement>(null)
  const [params, setParams] = useState<{
    name: string
    role: string
    photo: string | null
    id: string
  } | null>(null)

  useEffect(() => {
    // Neutralize the shared layout's background so the rounded corners
    // capture as transparent (Playwright omitBackground only clears unpainted px).
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
    const overlay = document.querySelector<HTMLElement>('.paper-texture-overlay')
    if (overlay) overlay.style.display = 'none'

    const q = new URLSearchParams(window.location.search)
    setParams({
      name: q.get('name') ?? '',
      role: q.get('role') ?? "Tomo's Friend",
      photo: q.get('photo'),
      id: q.get('id') ?? '',
    })
  }, [])

  useEffect(() => {
    if (!params) return
    let cancelled = false
    window.__cardReady = false

    async function arm() {
      if (document.fonts?.ready) await document.fonts.ready
      const node = captureRef.current
      if (node) {
        const imgs = Array.from(node.querySelectorAll('img'))
        await Promise.all(
          imgs.map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((res) => {
                  img.onload = () => res()
                  img.onerror = () => res()
                }),
          ),
        )
      }
      if (!cancelled) window.__cardReady = true
    }

    void arm()
    return () => {
      cancelled = true
    }
  }, [params])

  if (!params) return null

  return (
    <div style={{ background: 'transparent', padding: 0, margin: 0 }}>
      {/* Capture-only: drop the card's 2px edge border + depth shadow so the
          rounded crop reads as a clean borderless card. */}
      <style>{`.id-capture .id-surface { border: none !important; box-shadow: none !important; }`}</style>
      <div
        ref={captureRef}
        className="id-capture"
        style={{
          width: CARD_W,
          height: CARD_H,
          borderRadius: 28,
          overflow: 'hidden',
        }}
      >
        <CitizenCard
          citizen={{
            name: params.name,
            relation_to_tomo: params.role,
            tomoland_id: params.id,
            photo_url: params.photo,
            place_of_issue: 'San Francisco, CA',
          }}
        />
      </div>
    </div>
  )
}
