'use client'

import { useEffect, useState } from 'react'

export const MOBILE_BREAKPOINT = 640

/** Starts false (matching SSR, where there's no viewport to measure) and
 * corrects on mount — a one-frame desktop-layout flash on real phones is the
 * trade-off for not hydration-mismatching against the server-rendered markup. */
export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])

  return isMobile
}
