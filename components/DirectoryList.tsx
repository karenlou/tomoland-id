'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { clearMyCitizen } from '@/lib/deviceAuth'
import { isEphemeralMode } from '@/lib/ephemeralCitizen'
import {
  deleteOwnedCitizen,
  registerOwnership,
  resolveOwnership,
} from '@/lib/ownership'
import SearchBar from './SearchBar'
import RightPanel, { type RightPanelMode } from './RightPanel'
import RetroScrollArea from './RetroScrollArea'
import { SPOTLIGHT_SLEEVE_W } from '@/lib/cardConstants'
import { CitizenCardThumbnail } from './CitizenCard'
import { playClickSound } from '@/lib/clickSound'
import { useIsMobile } from '@/lib/useIsMobile'
import type { Citizen } from '@/types'

interface DirectoryListProps {
  initialCitizens: Citizen[]
}

const DOTS_FILL = '·'.repeat(60)
const META_INDENT = 20

/** `el`'s left/top relative to `root`, walking the offsetParent chain rather
 * than the DOM parent chain — layout-based (transform-independent) and
 * correct even when `root` itself is the positioning context (it has its own
 * transform applied, which makes it a valid offsetParent stop point). */
function cumulativeOffset(el: HTMLElement, root: HTMLElement) {
  let left = 0
  let top = 0
  let node: HTMLElement | null = el
  while (node && node !== root) {
    left += node.offsetLeft
    top += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return { left, top }
}

/** PrintAd's speech-bubble tail intentionally renders past its own box via
 * absolute positioning, so `root.offsetWidth/Height` alone under-reports the
 * rendered footprint. Check just that element rather than scanning every
 * descendant — IdSpotlight's card has its own nested "shrink to fit" scale
 * transform, which a generic deep scan would misread as a huge overflow
 * (it reports pre-shrink native layout size, not the visually-scaled size).
 *
 * `root`'s own scale transform is anchored `top center`, and `root` is itself
 * centered in its column — so horizontal growth is symmetric around root's
 * center, not anchored at its left edge. A right-side-only overflow (like the
 * tail) therefore needs *double* its distance reserved (the same slack must
 * exist on the untouched left side too), hence maxSideDist tracks the largest
 * single-side distance from center rather than a left-to-right span. Vertical
 * growth has no such issue (origin is `top`, anchored at the top edge), so
 * bottom is a plain max extent. */
function measureFullExtent(root: HTMLElement) {
  const centerX = root.offsetWidth / 2
  let maxSideDist = centerX
  let maxBottom = root.offsetHeight
  const tail = root.querySelector('img[src="/ad-phone-tag.svg"]')
  if (tail instanceof HTMLElement) {
    const { left, top } = cumulativeOffset(tail, root)
    const right = left + tail.offsetWidth
    maxSideDist = Math.max(maxSideDist, Math.abs(right - centerX), Math.abs(left - centerX))
    maxBottom = Math.max(maxBottom, top + tail.offsetHeight)
  }
  return { width: maxSideDist * 2, height: maxBottom }
}

function DirectoryRow({
  citizen,
  isHovered,
  isNew,
  collapsed,
  isMobile,
  onHover,
  onSelect,
}: {
  citizen: Citizen
  isHovered: boolean
  isNew: boolean
  collapsed: boolean
  isMobile: boolean
  onHover: () => void
  onSelect: () => void
}) {
  if (collapsed) {
    return (
      <div
        data-directory-row
        data-citizen-id={citizen.id}
        onMouseEnter={onHover}
        onClick={onSelect}
        className={isNew ? 'directory-row-grow-in' : undefined}
        style={{
          display: 'flex',
          justifyContent: 'center',
          borderTop: '1px solid var(--color-border)',
          padding: '10px 12px',
          cursor: 'pointer',
          background: isHovered ? 'var(--color-tomo-yellow-light)' : 'transparent',
          transition: 'background 0.12s ease',
        }}
      >
        <div
          style={{
            background: 'var(--color-tomo-yellow-dark)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            padding: 6,
          }}
        >
          <CitizenCardThumbnail citizen={citizen} width={88} />
        </div>
      </div>
    )
  }

  return (
    <div
      data-directory-row
      data-citizen-id={citizen.id}
      onMouseEnter={onHover}
      onClick={onSelect}
      className={isNew ? 'directory-row-grow-in' : undefined}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 16,
        borderTop: '1px solid var(--color-border)',
        padding: '12px 12px',
        cursor: 'pointer',
        background: isHovered ? 'var(--color-tomo-yellow-light)' : 'transparent',
        transition: 'background 0.12s ease',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            marginBottom: 4,
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 'var(--weight-bold)',
              fontSize: 18,
              color: 'var(--color-ink)',
              margin: 0,
              lineHeight: 1.2,
              flexShrink: 0,
            }}
          >
            {citizen.name}
          </p>
          <div
            aria-hidden
            style={{
              flex: 1,
              overflow: 'hidden',
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              color: 'var(--color-ink)',
              opacity: isHovered ? 0.45 : 0.3,
              whiteSpace: 'nowrap',
              transition: 'opacity 0.12s ease',
            }}
          >
            {DOTS_FILL}
          </div>
          <p
            style={{
              ...metaValueStyle,
              flexShrink: 0,
              fontSize: 14,
              lineHeight: 1.2,
              maxWidth: 140,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {citizen.place_of_issue}
          </p>
        </div>

        <div style={{ ...metaRowStyle, paddingLeft: META_INDENT }}>
          <span style={metaLabelStyle}>Relation</span>
          <span style={metaValueStyle}>{citizen.relation_to_tomo}</span>
        </div>

        <div style={{ ...metaRowStyle, paddingLeft: META_INDENT }}>
          <span style={metaLabelStyle}>Resident no.</span>
          <span style={metaValueStyle}>
            {'#' + citizen.tomoland_id.replace('TOMO-', '')}
          </span>
        </div>
      </div>

      <div
        style={{
          flex: '0 0 auto',
          alignSelf: 'center',
          background: 'var(--color-tomo-yellow-dark)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 8,
        }}
      >
        <CitizenCardThumbnail citizen={citizen} width={isMobile ? 64 : undefined} />
      </div>
    </div>
  )
}

const metaRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 12,
}

const metaLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontWeight: 'var(--weight-regular)',
  fontSize: 14,
  color: 'var(--color-ink)',
  lineHeight: 1.4,
}

const metaValueStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontWeight: 'var(--weight-regular)',
  fontSize: 14,
  color: 'var(--color-ink)',
  textAlign: 'right',
  lineHeight: 1.4,
}

export default function DirectoryList({ initialCitizens }: DirectoryListProps) {
  const [citizens, setCitizens] = useState<Citizen[]>(initialCitizens)
  const [query, setQuery] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(
    () =>
      initialCitizens.find((c) => c.name.trim().toUpperCase() === 'TOMO')?.id ??
      initialCitizens[0]?.id ??
      null,
  )
  const [panelMode, setPanelMode] = useState<RightPanelMode>('view')
  const [printingCitizen, setPrintingCitizen] = useState<Citizen | null>(null)
  const [myCitizenId, setMyCitizenId] = useState<string | null>(null)
  const [justGrew, setJustGrew] = useState(false)
  /** Sticky-spotlight (mobile only), driven entirely by the list's own
   * onScroll below — deliberately the *only* listener involved. An earlier
   * version also listened for touchmove/wheel on `window` so a swipe
   * anywhere (not just on the list) could trigger it, but touch/wheel
   * events bubble to window regardless of where they started — so that
   * listener ALSO fired for gestures that started on the list itself,
   * fighting the list's own directional onScroll handler for the same
   * gesture and producing exactly the random snapping this was supposed to
   * avoid. One source of truth, tied to the list's real scroll position:
   * - 'expanded': welcome bar + print ad both shown — at the top.
   * - 'collapsed': both hidden — scrolling down.
   * - 'partial': welcome bar shown, print ad still hidden — scrolling back
   *   up, but not yet all the way to the top.
   */
  const [spotlightStage, setSpotlightStage] = useState<'expanded' | 'partial' | 'collapsed'>(
    'expanded',
  )
  /** Set on the user's first deliberate interaction (selecting a citizen,
   * scrolling the list, or any gesture). Guards the device-ownership restore
   * below — that lookup is an async network request and can resolve well
   * after the user has already started browsing/scrolling, and forcing the
   * view back to "your own ID" at that point both yanks away whatever they
   * were looking at and (via isOwnSelected) snaps the collapsed spotlight
   * back open out of nowhere. Once the user has done anything, the
   * restoration is skipped — myCitizenId itself still gets set either way,
   * just not the forced hoveredId jump. */
  const userInteractedRef = useRef(false)
  const pointerRef = useRef({ x: 0, y: 0 })
  const suppressMouseSyncRef = useRef(false)
  const suppressMouseSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const myCitizenIdRef = useRef<string | null>(null)
  const hoveredIdRef = useRef<string | null>(null)
  const filteredRef = useRef<Citizen[]>(initialCitizens)
  const panelModeRef = useRef<RightPanelMode>('view')
  const rightColRef = useRef<HTMLDivElement>(null)
  const rightContentRef = useRef<HTMLDivElement>(null)
  const rowsScrollRef = useRef<HTMLDivElement>(null)
  /** Touch/wheel gestures starting anywhere in .directory-columns *except*
   * the list's own scroll element (which already handles itself natively)
   * — forwarded directly onto the list's real scrollTop. When everything's
   * expanded the spotlight fills most of the screen, leaving only a thin
   * list strip to actually grab; this makes the whole combined area act as
   * the scroll surface instead. Setting the list's *real* scrollTop fires
   * its own native scroll event — the onScroll handler below (the single
   * source of truth for the collapse stage) reacts to that exactly as it
   * would to a touch that landed on the list directly, so there's no
   * separate state to keep in sync and nothing to race against. */
  const touchForwardYRef = useRef(0)
  const touchForwardScrollTopRef = useRef(0)
  /** scrollTop at the point spotlightStage last changed — direction is
   * judged against this anchor rather than the immediately preceding
   * scroll event, so it takes a deliberate ~24px move to flip state. A
   * 1px-vs-previous comparison reacts to every bit of scroll jitter
   * (momentum deceleration, iOS rubber-band bounce at the end of a drag),
   * which was flipping the spotlight open mid-scroll and shrinking the list
   * out from under the user's thumb — "expanded" eats real vertical space
   * up here, it isn't free. */
  const scrollDirectionAnchorRef = useRef(0)
  const [rightScale, setRightScale] = useState(1)
  const isMobile = useIsMobile()

  useEffect(() => {
    myCitizenIdRef.current = myCitizenId
  }, [myCitizenId])

  useEffect(() => {
    hoveredIdRef.current = hoveredId
  }, [hoveredId])

  useEffect(() => {
    panelModeRef.current = panelMode
  }, [panelMode])

  // Scale the spotlight+ad block to fill the same height as the directory
  // list beside it, rather than leaving empty space below a small, top-aligned
  // block. Measured via offset geometry (layout size, ignoring the very
  // transform this effect applies) so it doesn't feed back into its own
  // measurement, and capped by width too — scale() grows both axes uniformly,
  // so a height-only ratio can blow the content wider than its column on a
  // tall/narrow viewport, clipping it at the page edge. Deliberately not
  // floored at 1 — on a narrow column the tail can poke past the column's
  // edge even at native size (it overflows its own box by design), so a
  // slight shrink-below-1 is sometimes required to keep it fully visible.
  useEffect(() => {
    if (panelMode !== 'view' || isMobile) return
    const col = rightColRef.current
    const content = rightContentRef.current
    if (!col || !content) return

    const recompute = () => {
      const containerH = col.clientHeight
      const containerW = col.clientWidth
      // The tail intentionally renders past its own box via absolute
      // positioning, so offsetWidth/Height on `content` alone would miss it.
      // Measure the true full extent including it instead.
      const { width: contentW, height: contentH } = measureFullExtent(content)
      if (containerH <= 0 || contentH <= 0 || containerW <= 0 || contentW <= 0) return
      const heightScale = containerH / contentH
      const widthScale = containerW / contentW
      setRightScale(Math.min(heightScale, widthScale))
    }

    recompute()
    const observer = new ResizeObserver(recompute)
    observer.observe(col)
    observer.observe(content)
    return () => observer.disconnect()
  }, [panelMode, isMobile])

  useEffect(() => {
    let cancelled = false

    async function restoreOwnership() {
      const owned = await resolveOwnership(initialCitizens)
      if (cancelled) return

      if (owned) {
        setMyCitizenId(owned.id)
        if (!userInteractedRef.current) {
          setHoveredId(owned.id)
        }
        setCitizens((prev) =>
          prev.some((c) => c.id === owned.id) ? prev : [...prev, owned],
        )
      } else {
        setMyCitizenId(null)
      }
    }

    void restoreOwnership()
    return () => {
      cancelled = true
    }
  }, [initialCitizens])

  const selectCitizen = useCallback((id: string, playSound = true) => {
    userInteractedRef.current = true
    setHoveredId((prev) => {
      if (prev !== id && playSound) playClickSound()
      return id
    })
  }, [])

  const syncSelectionToPointer = useCallback(() => {
    if (panelMode !== 'view' || suppressMouseSyncRef.current) return
    const { x, y } = pointerRef.current
    const el = document.elementFromPoint(x, y)
    const row = el?.closest('[data-directory-row]')
    if (!row) return
    const id = row.getAttribute('data-citizen-id')
    if (!id) return
    selectCitizen(id)
  }, [panelMode, selectCitizen])

  useEffect(() => {
    if (isEphemeralMode()) return

    const channel = supabase
      .channel('citizens-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'citizens' },
        (payload) => {
          const row = payload.new as Citizen
          setCitizens((prev) =>
            prev.some((c) => c.id === row.id) ? prev : [...prev, row],
          )
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'citizens' },
        (payload) => {
          const id = (payload.old as { id?: string }).id
          if (!id) return

          setCitizens((prev) => {
            const next = prev.filter((c) => c.id !== id)
            setHoveredId((hovered) =>
              hovered === id ? (next[0]?.id ?? null) : hovered,
            )
            return next
          })

          if (myCitizenIdRef.current === id) {
            setMyCitizenId(null)
            clearMyCitizen()
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filtered = query.trim()
    ? citizens.filter((c) =>
        c.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : citizens

  const hoveredCitizen =
    filtered.find((c) => c.id === hoveredId) ?? filtered[0] ?? null

  const isOwnSelected = Boolean(
    hoveredCitizen && myCitizenId && hoveredCitizen.id === myCitizenId,
  )
  /** Own ID always forces 'expanded' regardless of scroll — the manage
   * buttons live in the welcome bar and need to stay reachable. */
  const effectiveSpotlightStage = isOwnSelected ? 'expanded' : spotlightStage
  /** Print ad — hidden in both 'collapsed' and 'partial', only shown once
   * fully back at the top. */
  const collapsePrintAd = isMobile && effectiveSpotlightStage !== 'expanded'
  /** Welcome bar — hidden only while fully 'collapsed'; scrolling up softens
   * straight back to showing it ('partial'), even before reaching the top. */
  const collapseWelcomeBar = isMobile && effectiveSpotlightStage === 'collapsed'

  useEffect(() => {
    filteredRef.current = filtered
  }, [filtered])

  // Arrow keys move the highlight through the (possibly search-filtered) list
  // and scroll the newly highlighted row into view. The listener is attached
  // once and reads current state via refs rather than closing over filtered/
  // hoveredId — those change on every keypress, and re-subscribing the
  // listener each render is too slow to keep up with OS key-repeat, which
  // was letting several keydowns in a row land on the same stale closure and
  // recompute the same "next" row instead of advancing.
  //
  // The scrollIntoView call below fires a native `scroll` event, which feeds
  // syncSelectionToPointer (mouse-driven hover-follows-scroll). That must be
  // suppressed for a beat — but suppressing it only "until the next real
  // mousemove" doesn't work: a mouse resting on the list still emits tiny
  // jitter mousemove events with no deliberate movement, which immediately
  // un-suppress it and let it snap the highlight back to whatever row ends
  // up under the still-stationary cursor. Instead, suppress on a deliberate
  // timer that nothing but our own next keypress can extend.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      if (panelModeRef.current !== 'view') return
      const list = filteredRef.current
      if (list.length === 0) return
      e.preventDefault()

      const currentIndex = list.findIndex((c) => c.id === hoveredIdRef.current)
      const delta = e.key === 'ArrowDown' ? 1 : -1
      const nextIndex =
        currentIndex === -1
          ? 0
          : Math.min(Math.max(currentIndex + delta, 0), list.length - 1)
      const next = list[nextIndex]
      if (!next || next.id === hoveredIdRef.current) return

      hoveredIdRef.current = next.id
      selectCitizen(next.id)

      suppressMouseSyncRef.current = true
      if (suppressMouseSyncTimerRef.current !== null) {
        clearTimeout(suppressMouseSyncTimerRef.current)
      }
      suppressMouseSyncTimerRef.current = setTimeout(() => {
        suppressMouseSyncRef.current = false
        suppressMouseSyncTimerRef.current = null
      }, 200)

      document
        .querySelector(`[data-citizen-id="${CSS.escape(next.id)}"]`)
        ?.scrollIntoView({ block: 'nearest' })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (suppressMouseSyncTimerRef.current !== null) {
        clearTimeout(suppressMouseSyncTimerRef.current)
      }
    }
  }, [selectCitizen])

  const handleIssue = useCallback((citizen: Citizen) => {
    setPrintingCitizen(citizen)
    registerOwnership(citizen)
    setMyCitizenId(citizen.id)
    setPanelMode('print')
  }, [])

  const handlePrintComplete = useCallback(() => {
    if (printingCitizen) {
      const oldId = myCitizenId
      const newId = printingCitizen.id

      setCitizens((prev) => {
        let next =
          oldId && oldId !== newId ? prev.filter((c) => c.id !== oldId) : prev
        if (!next.some((c) => c.id === newId)) {
          next = [...next, printingCitizen]
        }
        return next
      })
      setHoveredId(newId)
      registerOwnership(printingCitizen)
      setMyCitizenId(newId)
      setJustGrew(true)
      setTimeout(() => setJustGrew(false), 900)
    }
    setPrintingCitizen(null)
    setPanelMode('view')
  }, [printingCitizen, myCitizenId])

  const handleViewMyId = useCallback(() => {
    if (myCitizenId) {
      setHoveredId(myCitizenId)
      setPanelMode('view')
    }
  }, [myCitizenId])

  const handleReissue = useCallback(() => {
    setPanelMode('create')
  }, [])

  const handleDelete = useCallback(async () => {
    if (!myCitizenId) return
    if (!confirm('Delete your Tomoland ID? This cannot be undone.')) return

    const idToRemove = myCitizenId
    const result = await deleteOwnedCitizen()
    if (!result.ok) {
      alert(result.error ?? 'Failed to delete your ID.')
      return
    }

    setCitizens((prev) => {
      const next = prev.filter((c) => c.id !== idToRemove)
      setHoveredId(next[0]?.id ?? null)
      return next
    })
    setMyCitizenId(null)
    setPanelMode('view')
  }, [myCitizenId])

  /** During the create/print flow, the directory yields room so the flow can center on screen */
  const isCreating = panelMode !== 'view'
  const flexEase = 'cubic-bezier(0.22, 1, 0.36, 1)'

  const rowsContent =
    filtered.length === 0 ? (
      isCreating ? null : (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-body)',
            color: 'var(--color-ink-muted)',
            padding: '40px 0',
            textAlign: 'center',
          }}
        >
          {query ? 'No citizens match your search.' : 'No citizens yet. Be the first!'}
        </p>
      )
    ) : (
      filtered.map((c) => (
        <DirectoryRow
          key={c.id}
          citizen={c}
          isHovered={hoveredId === c.id}
          isNew={c.id === myCitizenId}
          collapsed={isCreating}
          isMobile={isMobile}
          onHover={() => {
            if (suppressMouseSyncRef.current) return
            selectCitizen(c.id)
          }}
          onSelect={() => selectCitizen(c.id)}
        />
      ))
    )

  return (
    <div
      className="directory-columns"
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 32,
        minHeight: 0,
        minWidth: 0,
        width: '100%',
        overflow: 'hidden',
      }}
      onTouchStart={(e) => {
        if (!isMobile || isCreating) return
        if (rowsScrollRef.current?.contains(e.target as Node)) return
        userInteractedRef.current = true
        touchForwardYRef.current = e.touches[0].clientY
        touchForwardScrollTopRef.current = rowsScrollRef.current?.scrollTop ?? 0
      }}
      onTouchMove={(e) => {
        if (!isMobile || isCreating || !rowsScrollRef.current) return
        if (rowsScrollRef.current.contains(e.target as Node)) return
        const deltaY = touchForwardYRef.current - e.touches[0].clientY
        rowsScrollRef.current.scrollTop = touchForwardScrollTopRef.current + deltaY
      }}
      onWheel={(e) => {
        if (!isMobile || isCreating || !rowsScrollRef.current) return
        if (rowsScrollRef.current.contains(e.target as Node)) return
        userInteractedRef.current = true
        rowsScrollRef.current.scrollTop += e.deltaY
      }}
    >
      <div
        className={`directory-list-col${isCreating ? ' directory-list-col--creating' : ''}`}
        style={{
          /* 88px thumbnail + 12px padding + 2px border + RetroScrollArea's 24px
             scrollbar gutter (reserved whenever the list overflows) + a little air */
          flex: isCreating ? '0 0 140px' : '0 1 52%',
          minWidth: 0,
          width: 0,
          alignSelf: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
          opacity: isCreating ? 0.55 : 1,
          transition: `flex-basis 0.55s ${flexEase}, opacity 0.45s ease`,
        }}
      >
        {!isCreating && (
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                marginBottom: 8,
                flexShrink: 0,
                gap: isMobile ? 8 : 16,
              }}
            >
              <p
                className={justGrew ? 'counter-grow-pulse' : undefined}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-small)',
                  color: 'var(--color-ink-muted)',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                {filtered.length} TOMOSAPIENS AND COUNTING
              </p>
              <div style={{ flex: '1 1 auto', maxWidth: isMobile ? '100%' : 220, minWidth: 0 }}>
                <SearchBar value={query} onChange={setQuery} />
              </div>
            </div>

            <div style={{ borderTop: '1.5px solid var(--color-border)', flexShrink: 0 }} />
          </>
        )}

        <div
          ref={rowsScrollRef}
          className="directory-rows-scroll"
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          onMouseMove={(e) => {
            pointerRef.current = { x: e.clientX, y: e.clientY }
          }}
          onScroll={(e) => {
            if (!isMobile) return
            userInteractedRef.current = true
            const top = e.currentTarget.scrollTop

            if (top <= 4) {
              setSpotlightStage('expanded')
              scrollDirectionAnchorRef.current = top
              return
            }

            const delta = top - scrollDirectionAnchorRef.current
            if (delta > 24) {
              setSpotlightStage('collapsed')
              scrollDirectionAnchorRef.current = top
            } else if (delta < -24) {
              setSpotlightStage('partial')
              scrollDirectionAnchorRef.current = top
            }
          }}
        >
        {isMobile ? (
          /* RetroScrollArea is mouse-only (wheel + draggable thumb, no touch
           * handling) — on mobile this div is the scroll region instead
           * (native overflow, via .directory-rows-scroll), so the rows just
           * render inline into it. */
          <div style={{ display: 'flex', flexDirection: 'column' }}>{rowsContent}</div>
        ) : (
          <RetroScrollArea onScroll={syncSelectionToPointer}>{rowsContent}</RetroScrollArea>
        )}
        </div>

        {!isCreating && filtered.length > 0 && (
          <div style={{ borderTop: '1px solid var(--color-border)', flexShrink: 0 }} />
        )}
      </div>

      <div
        ref={rightColRef}
        className={`directory-detail-col${isCreating ? ' directory-detail-col--creating' : ''}`}
        style={{
          flex: 1,
          minWidth: 0,
          alignSelf: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: isCreating ? 'safe center' : 'flex-start',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'visible',
          transition: `flex-basis 0.55s ${flexEase}`,
        }}
      >
        <div
          ref={rightContentRef}
          style={{
            width: isMobile ? '100%' : SPOTLIGHT_SLEEVE_W,
            maxWidth: '100%',
            flexShrink: 0,
            transform: panelMode === 'view' && !isMobile ? `scale(${rightScale})` : undefined,
            transformOrigin: 'top center',
          }}
        >
        <RightPanel
          mode={panelMode}
          citizen={hoveredCitizen}
          printingCitizen={printingCitizen}
          myCitizenId={myCitizenId}
          collapsePanels={collapsePrintAd}
          collapseWelcomeBar={collapseWelcomeBar}
          onGetId={() => setPanelMode('create')}
          onViewMyId={handleViewMyId}
          onReissue={handleReissue}
          onDelete={handleDelete}
          onCancelCreate={() => setPanelMode('view')}
          onIssue={handleIssue}
          onPrintComplete={handlePrintComplete}
        />
        </div>
      </div>
    </div>
  )
}
