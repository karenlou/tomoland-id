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
import type { Citizen } from '@/types'

interface DirectoryListProps {
  initialCitizens: Citizen[]
}

const DOTS_FILL = '·'.repeat(60)
const META_INDENT = 20

function DirectoryRow({
  citizen,
  isHovered,
  isNew,
  collapsed,
  onHover,
}: {
  citizen: Citizen
  isHovered: boolean
  isNew: boolean
  collapsed: boolean
  onHover: () => void
}) {
  if (collapsed) {
    return (
      <div
        data-directory-row
        data-citizen-id={citizen.id}
        onMouseEnter={onHover}
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
        <CitizenCardThumbnail citizen={citizen} />
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
  const pointerRef = useRef({ x: 0, y: 0 })
  const myCitizenIdRef = useRef<string | null>(null)
  const rightColRef = useRef<HTMLDivElement>(null)
  const rightContentRef = useRef<HTMLDivElement>(null)
  const [rightScale, setRightScale] = useState(1)

  useEffect(() => {
    myCitizenIdRef.current = myCitizenId
  }, [myCitizenId])

  // Scale the spotlight+ad block up to fill the same height as the directory
  // list beside it, rather than leaving empty space below a small, top-aligned
  // block. Measured via offsetHeight/Width (layout size, ignoring the very
  // transform this effect applies) so it doesn't feed back into its own
  // measurement. Capped by width too — scale() grows both axes uniformly, so
  // a height-only ratio can blow the content wider than its column on a tall
  // directory list, clipping it at the page edge.
  useEffect(() => {
    if (panelMode !== 'view') return
    const col = rightColRef.current
    const content = rightContentRef.current
    if (!col || !content) return

    const recompute = () => {
      const containerH = col.clientHeight
      const containerW = col.clientWidth
      const contentH = content.offsetHeight
      const contentW = content.offsetWidth
      if (containerH <= 0 || contentH <= 0 || containerW <= 0 || contentW <= 0) return
      const heightScale = containerH / contentH
      const widthScale = containerW / contentW
      setRightScale(Math.max(Math.min(heightScale, widthScale), 1))
    }

    recompute()
    const observer = new ResizeObserver(recompute)
    observer.observe(col)
    observer.observe(content)
    return () => observer.disconnect()
  }, [panelMode])

  useEffect(() => {
    let cancelled = false

    async function restoreOwnership() {
      const owned = await resolveOwnership(initialCitizens)
      if (cancelled) return

      if (owned) {
        setMyCitizenId(owned.id)
        setHoveredId(owned.id)
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
    setHoveredId((prev) => {
      if (prev !== id && playSound) playClickSound()
      return id
    })
  }, [])

  const syncSelectionToPointer = useCallback(() => {
    if (panelMode !== 'view') return
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

  return (
    <div
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
    >
      <div
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
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
                flexShrink: 0,
                gap: 16,
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
                {filtered.length} citizen{filtered.length !== 1 ? 's' : ''}
              </p>
              <div style={{ flex: '1 1 auto', maxWidth: 220, minWidth: 0 }}>
                <SearchBar value={query} onChange={setQuery} />
              </div>
            </div>

            <div style={{ borderTop: '1.5px solid var(--color-border)', flexShrink: 0 }} />
          </>
        )}

        <div
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          onMouseMove={(e) => {
            pointerRef.current = { x: e.clientX, y: e.clientY }
          }}
        >
        <RetroScrollArea onScroll={syncSelectionToPointer}>
          {filtered.length === 0 ? (
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
                onHover={() => selectCitizen(c.id)}
              />
            ))
          )}
        </RetroScrollArea>
        </div>

        {!isCreating && filtered.length > 0 && (
          <div style={{ borderTop: '1px solid var(--color-border)', flexShrink: 0 }} />
        )}
      </div>

      <div
        ref={rightColRef}
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
            width: SPOTLIGHT_SLEEVE_W,
            maxWidth: '100%',
            flexShrink: 0,
            transform: panelMode === 'view' ? `scale(${rightScale})` : undefined,
            transformOrigin: 'top center',
          }}
        >
        <RightPanel
          mode={panelMode}
          citizen={hoveredCitizen}
          printingCitizen={printingCitizen}
          myCitizenId={myCitizenId}
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
