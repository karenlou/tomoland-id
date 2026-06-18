'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface RetroScrollAreaProps {
  children: React.ReactNode
  style?: React.CSSProperties
  onScroll?: () => void
}

const SCROLLBAR_W = 24
const ARROW_H = 24
const MIN_THUMB = 24

export default function RetroScrollArea({ children, style, onScroll }: RetroScrollAreaProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startY: number; startScroll: number } | null>(null)
  const [thumbTop, setThumbTop] = useState(0)
  const [thumbHeight, setThumbHeight] = useState(MIN_THUMB)
  const [needsScrollbar, setNeedsScrollbar] = useState(false)

  const syncThumb = useCallback(() => {
    const el = contentRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const scrollable = scrollHeight > clientHeight + 1
    setNeedsScrollbar(scrollable)
    if (!scrollable) return

    const trackH = clientHeight - ARROW_H * 2
    const ratio = clientHeight / scrollHeight
    const h = Math.max(MIN_THUMB, Math.floor(trackH * ratio))
    const maxTop = trackH - h
    const top =
      scrollHeight - clientHeight > 0
        ? (scrollTop / (scrollHeight - clientHeight)) * maxTop
        : 0
    setThumbHeight(h)
    setThumbTop(top)
  }, [])

  const handleScroll = useCallback(() => {
    syncThumb()
    onScroll?.()
  }, [syncThumb, onScroll])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    syncThumb()
    const ro = new ResizeObserver(syncThumb)
    ro.observe(el)
    return () => ro.disconnect()
  }, [syncThumb, children])

  const scrollBy = (delta: number) => {
    contentRef.current?.scrollBy({ top: delta, behavior: 'smooth' })
  }

  const onThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = {
      startY: e.clientY,
      startScroll: contentRef.current?.scrollTop ?? 0,
    }

    const onMove = (ev: MouseEvent) => {
      const el = contentRef.current
      const drag = dragRef.current
      if (!el || !drag) return
      const trackH = el.clientHeight - ARROW_H * 2 - thumbHeight
      const scrollRange = el.scrollHeight - el.clientHeight
      if (trackH <= 0 || scrollRange <= 0) return
      const dy = ev.clientY - drag.startY
      el.scrollTop = drag.startScroll + (dy / trackH) * scrollRange
    }

    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const el = contentRef.current
    if (!el) return
    el.scrollTop += e.deltaY
  }, [])

  return (
    <div
      onWheel={needsScrollbar ? onWheel : undefined}
      style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        ref={contentRef}
        className="retro-scroll-content"
        onScroll={handleScroll}
        onWheel={needsScrollbar ? onWheel : undefined}
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>

      {needsScrollbar && (
        <div
          style={{
            width: SCROLLBAR_W,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <button
            type="button"
            aria-label="Scroll up"
            onClick={() => scrollBy(-80)}
            style={arrowBtnStyle}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ScrollUp.png"
              alt=""
              width={29}
              height={29}
              style={{
                display: 'block',
                width: SCROLLBAR_W,
                height: ARROW_H,
                objectFit: 'contain',
                imageRendering: 'pixelated',
              }}
              draggable={false}
            />
          </button>

          <div className="retro-scroll-track" style={{ flex: 1, position: 'relative' }}>
            <div
              role="scrollbar"
              aria-orientation="vertical"
              onMouseDown={onThumbMouseDown}
              style={{
                position: 'absolute',
                left: 0,
                width: SCROLLBAR_W,
                top: thumbTop,
                height: thumbHeight,
                backgroundImage: 'url(/Scroll.png)',
                backgroundSize: `${SCROLLBAR_W}px 100%`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'top center',
                cursor: 'default',
              }}
            />
          </div>

          <button
            type="button"
            aria-label="Scroll down"
            onClick={() => scrollBy(80)}
            style={arrowBtnStyle}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ScrollDown.png"
              alt=""
              width={29}
              height={29}
              style={{
                display: 'block',
                width: SCROLLBAR_W,
                height: ARROW_H,
                objectFit: 'contain',
                imageRendering: 'pixelated',
              }}
              draggable={false}
            />
          </button>
        </div>
      )}
    </div>
  )
}

const arrowBtnStyle: React.CSSProperties = {
  width: SCROLLBAR_W,
  height: ARROW_H,
  padding: 0,
  margin: 0,
  border: 'none',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'default',
  flexShrink: 0,
}
